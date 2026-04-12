import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingRole } from '@prisma/client';
import { GetLocationHistoryDto, UpdateLocationDto } from './dto/location.dto';

export interface LocationPoint {
  id: string;
  userId: string;
  role: TrackingRole;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp: Date;
}

export interface TrackingState {
  bookingId: string;
  client?: LocationPoint;
  provider?: LocationPoint;
  distanceMeters?: number;
  etaMinutes?: number;
  calculatedAt?: string;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  // In-memory cache: key = "bookingId:userId"
  private readonly latestLocations = new Map<string, LocationPoint>();

  constructor(private readonly prisma: PrismaService) {}

  // ─── Update Location ──────────────────────────────────────────────────────
  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<LocationPoint> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { clientId: true, providerId: true, status: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const isClient = booking.clientId === userId;
    const isProvider = booking.providerId === userId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new BadRequestException('Location tracking only available for active bookings');
    }

    const role: TrackingRole = isProvider ? TrackingRole.PROVIDER : TrackingRole.CLIENT;

    // Save to database
    const update = await this.prisma.locationUpdate.create({
      data: {
        bookingId: dto.bookingId,
        userId,
        role,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
        altitude: dto.altitude,
      },
    });

    const point: LocationPoint = {
      id: update.id,
      userId,
      role,
      latitude: Number(update.latitude),
      longitude: Number(update.longitude),
      accuracy: update.accuracy ?? undefined,
      heading: update.heading ?? undefined,
      speed: update.speed ?? undefined,
      altitude: update.altitude ?? undefined,
      timestamp: update.timestamp,
    };

    // Update cache
    this.latestLocations.set(`${dto.bookingId}:${userId}`, point);

    this.logger.log(`Location updated for ${role} in booking ${dto.bookingId}`);
    return point;
  }

  // ─── Get Current Locations (Fixed & Improved) ─────────────────────────────
  async getCurrentLocations(bookingId: string, userId: string): Promise<TrackingState> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, providerId: true, status: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const clientKey = `${bookingId}:${booking.clientId}`;
    const providerKey = `${bookingId}:${booking.providerId}`;

    let clientLocation = this.latestLocations.get(clientKey);
    let providerLocation = this.latestLocations.get(providerKey);

    // Fallback to database if not in cache
    if (!clientLocation) {
      clientLocation = await this.getLatestFromDB(bookingId, booking.clientId);
      if (clientLocation) this.latestLocations.set(clientKey, clientLocation);
    }

    if (!providerLocation) {
      providerLocation = await this.getLatestFromDB(bookingId, booking.providerId);
      if (providerLocation) this.latestLocations.set(providerKey, providerLocation);
    }

    const state: TrackingState = {
      bookingId,
      client: clientLocation || undefined,
      provider: providerLocation || undefined,
      calculatedAt: new Date().toISOString(),
    };

    // Calculate distance and ETA only if both locations exist
    if (clientLocation && providerLocation) {
      state.distanceMeters = this.haversineDistance(
        clientLocation.latitude,
        clientLocation.longitude,
        providerLocation.latitude,
        providerLocation.longitude,
      );

      // ETA calculation (assuming average speed in m/s)
      const speedMs = providerLocation.speed ?? 8.33; // ~30 km/h default
      if (speedMs > 0) {
        state.etaMinutes = Math.ceil(state.distanceMeters / (speedMs * 60));
      }
    }

    return state;
  }

  // ─── Location History ─────────────────────────────────────────────────────
  async getLocationHistory(userId: string, dto: GetLocationHistoryDto): Promise<LocationPoint[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { clientId: true, providerId: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updates = await this.prisma.locationUpdate.findMany({
      where: {
        bookingId: dto.bookingId,
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.from || dto.to
          ? {
              timestamp: {
                ...(dto.from ? { gte: new Date(dto.from) } : {}),
                ...(dto.to ? { lte: new Date(dto.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'asc' },
      take: dto.limit ?? 200,
    });

    return updates.map((u) => ({
      id: u.id,
      userId: u.userId,
      role: u.role,
      latitude: Number(u.latitude),
      longitude: Number(u.longitude),
      accuracy: u.accuracy ?? undefined,
      heading: u.heading ?? undefined,
      speed: u.speed ?? undefined,
      altitude: u.altitude ?? undefined,
      timestamp: u.timestamp,
    }));
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────
  private async getLatestFromDB(
    bookingId: string,
    userId: string,
  ): Promise<LocationPoint | undefined> {
    const update = await this.prisma.locationUpdate.findFirst({
      where: { bookingId, userId },
      orderBy: { timestamp: 'desc' },
    });

    if (!update) return undefined;

    return {
      id: update.id,
      userId: update.userId,
      role: update.role,
      latitude: Number(update.latitude),
      longitude: Number(update.longitude),
      accuracy: update.accuracy ?? undefined,
      heading: update.heading ?? undefined,
      speed: update.speed ?? undefined,
      altitude: update.altitude ?? undefined,
      timestamp: update.timestamp,
    };
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6_371_000; // Earth radius in meters
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}