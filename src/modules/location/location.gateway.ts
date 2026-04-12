import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io';                    // ← Added this
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { LocationService } from './location.service';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import { UpdateLocationDto, TrackingSessionDto } from './dto/location.dto';

export interface AuthSocket extends Socket {
  user: { id: string; email: string; role: string };
}

@WebSocketGateway({
  namespace: 'tracking',
  cors: { origin: '*', credentials: true },
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LocationGateway.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly roomAccessGuard: RoomAccessGuard,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Auth Middleware (Fixed) ─────────────────────────────────────────────
  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthSocket;   // Safe cast

      // Async logic inside IIFE
      (async () => {
        try {
          const token =
            authSocket.handshake.auth?.token ||
            (authSocket.handshake.headers?.authorization as string)?.replace('Bearer ', '');

          if (!token) {
            return next(new WsException('No token provided'));
          }

          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get('env')?.JWT_SECRET,
          });

          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true, status: true },
          });

          if (!user || user.status !== 'ACTIVE') {
            return next(new WsException('User inactive or not found'));
          }

          authSocket.user = { id: user.id, email: user.email, role: user.role };
          next();
        } catch (err: any) {
          next(new WsException(`Invalid token: ${err.message || err}`));
        }
      })();
    });
  }

  // ─── Connection Handlers ─────────────────────────────────────────────────
  handleConnection(client: AuthSocket) {
    if (!client.user?.id) {
      client.disconnect();
      return;
    }

    client.join(`user:${client.user.id}`);
    client.emit('connected', { userId: client.user.id, socketId: client.id });
    this.logger.log(`[Tracking] Connected: ${client.id} (user: ${client.user.id})`);
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`[Tracking] Disconnected: ${client.id}`);
  }

  // ─── Tracking Events ─────────────────────────────────────────────────────
  @SubscribeMessage('tracking:join')
  async joinTracking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(data.bookingId, client.user.id);

      client.join(`tracking:${data.bookingId}`);

      const state = await this.locationService.getCurrentLocations(
        data.bookingId,
        client.user.id,
      );

      client.emit('tracking:joined', { bookingId: data.bookingId });
      client.emit('tracking:state', state);
    } catch (err: any) {
      client.emit('error', { event: 'tracking:join', message: err.message || err });
    }
  }

  @SubscribeMessage('tracking:leave')
  leaveTracking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.leave(`tracking:${data.bookingId}`);
    client.emit('tracking:left', { bookingId: data.bookingId });
  }

  @SubscribeMessage('location:update')
  async updateLocation(
    @MessageBody() dto: UpdateLocationDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(dto.bookingId, client.user.id);

      const point = await this.locationService.updateLocation(client.user.id, dto);
      const state = await this.locationService.getCurrentLocations(
        dto.bookingId,
        client.user.id,
      );

      this.server.to(`tracking:${dto.bookingId}`).emit('location:broadcast', {
        bookingId: dto.bookingId,
        updatedBy: client.user.id,
        point,
        state,
      });

      client.emit('location:updated', { timestamp: point.timestamp });
    } catch (err: any) {
      client.emit('error', { event: 'location:update', message: err.message || err });
    }
  }

  @SubscribeMessage('location:current')
  async getCurrentLocation(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const state = await this.locationService.getCurrentLocations(
        data.bookingId,
        client.user.id,
      );
      client.emit('tracking:state', state);
    } catch (err: any) {
      client.emit('error', { event: 'location:current', message: err.message || err });
    }
  }
}