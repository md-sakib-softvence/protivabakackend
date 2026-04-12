import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrackingRole } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WebSocket: location:update
 * Sent every 2–5 seconds by the moving participant.
 */
export class UpdateLocationDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  /** Decimal degrees. Range: -90 to 90 */
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  /** Decimal degrees. Range: -180 to 180 */
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  /** GPS accuracy radius in metres (optional, from device API) */
  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number;

  /** Compass heading in degrees 0–360. 0 = North. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  /** Speed in metres per second */
  @IsNumber()
  @IsOptional()
  @Min(0)
  speed?: number;

  /** Altitude in metres above sea level */
  @IsNumber()
  @IsOptional()
  altitude?: number;
}

/**
 * WebSocket: tracking:join / tracking:leave
 * HTTP:      GET /location/current?bookingId=xxx
 */
export class TrackingSessionDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * HTTP: GET /location/history
 */
export class GetLocationHistoryDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  /** Filter by which participant's track you want */
  @IsEnum(TrackingRole)
  @IsOptional()
  role?: TrackingRole;

  /** ISO date string — start of time range */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** ISO date string — end of time range */
  @IsDateString()
  @IsOptional()
  to?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  limit?: number = 200;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class LocationPointDto {
  id!: string;
  userId!: string;
  role!: TrackingRole;
  latitude!: number;
  longitude!: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  altitude?: number | null;
  timestamp!: Date;
}

export class TrackingStateDto {
  bookingId!: string;
  /** Latest known position of the client */
  client?: LocationPointDto | null;
  /** Latest known position of the provider */
  provider?: LocationPointDto | null;
  /** Straight-line distance between them in metres (Haversine) */
  distanceMeters?: number | null;
  /** Estimated minutes until provider reaches client (based on current speed) */
  etaMinutes?: number | null;
  calculatedAt!: Date;
}

/**
 * Broadcast payload after a location:update event.
 * Both participants receive this.
 */
export class LocationBroadcastDto {
  bookingId!: string;
  /** userId of who just updated */
  updatedBy!: string;
  /** The single new point that was just submitted */
  point!: LocationPointDto;
  /** Full tracking state with both positions + distance + ETA */
  state!: TrackingStateDto;
}

export class LocationHistoryDto {
  bookingId!: string;
  role?: TrackingRole;
  points!: LocationPointDto[];
  totalPoints!: number;
}

export class GetCurrentLocationDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}