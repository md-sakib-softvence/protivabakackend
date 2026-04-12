import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { Throttle } from '@nestjs/throttler';
import * as jwtWsGuard from 'src/common/guards/jwt-ws.guard';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import { LocationService } from './location.service';
import { GetCurrentLocationDto, UpdateLocationDto } from './dto/location.dto';

@WebSocketGateway({
  namespace: '/tracking',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LocationGateway.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly roomAccessGuard: RoomAccessGuard,
  ) {}

  handleConnection(client: jwtWsGuard.AuthenticatedSocket) {
    if (!client.user?.id) {
      client.disconnect();
      return;
    }
    client.join(`user:${client.user.id}`);
    this.logger.log(`Tracking connected: ${client.id} (user: ${client.user.id})`);
  }

  handleDisconnect(client: jwtWsGuard.AuthenticatedSocket) {
    this.logger.log(`Tracking disconnected: ${client.id}`);
  }

  // ─── Join Tracking Session ────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('tracking:join')
  async joinTracking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(data.bookingId, client.user.id);

      client.join(`tracking:${data.bookingId}`);

      // Send current positions immediately
      const state = await this.locationService.getCurrentLocations(
        data.bookingId,
        client.user.id,
      );

      client.emit('tracking:state', state);
    } catch (error: any) {
      this.logger.error(`Error in tracking:join for booking ${data.bookingId}`, error);
      client.emit('error', { 
        event: 'tracking:join',
        message: error.message || 'Failed to join tracking session' 
      });
    }
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('tracking:leave')
  leaveTracking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    client.leave(`tracking:${data.bookingId}`);
    client.emit('tracking:left', { bookingId: data.bookingId });
  }

  // ─── Location Update ─────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @SubscribeMessage('location:update')
  async updateLocation(
    @MessageBody() dto: UpdateLocationDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(dto.bookingId, client.user.id);

      const point = await this.locationService.updateLocation(client.user.id, dto);

      // Get latest tracking state
      const state = await this.locationService.getCurrentLocations(
        dto.bookingId,
        client.user.id,
      );

      // Broadcast to both participants
      this.server.to(`tracking:${dto.bookingId}`).emit('location:broadcast', {
        bookingId: dto.bookingId,
        updatedBy: client.user.id,
        point,
        state,
      });

      return { 
        event: 'location:updated', 
        data: { timestamp: point.timestamp } 
      };
    } catch (error: any) {
      this.logger.error(`Error in location:update for booking ${dto.bookingId}`, error);
      client.emit('error', { 
        event: 'location:update',
        message: error.message || 'Failed to update location' 
      });
    }
  }

  // ─── Get Current State ────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('location:current')
  async getCurrentLocation(
    @MessageBody() dto: GetCurrentLocationDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const state = await this.locationService.getCurrentLocations(
        dto.bookingId,
        client.user.id,
      );
      client.emit('tracking:state', state);
    } catch (error: any) {
      this.logger.error(`Error in location:current for booking ${dto.bookingId}`, error);
      client.emit('error', { 
        event: 'location:current',
        message: error.message || 'Failed to get current location' 
      });
    }
  }
}


// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   MessageBody,
//   ConnectedSocket,
// } from '@nestjs/websockets';
// import { UseGuards, Logger } from '@nestjs/common';
// import { Server } from 'socket.io';
// import { Throttle } from '@nestjs/throttler';
// import * as jwtWsGuard from 'src/common/guards/jwt-ws.guard';
// import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
// import { LocationService } from './location.service';
// import { GetCurrentLocationDto, UpdateLocationDto } from './dto/location.dto';


// @WebSocketGateway({
//   namespace: '/tracking',
//   cors: {
//     origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
//     credentials: true,
//   },
//   transports: ['websocket', 'polling'],
// })
// export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   private readonly server!: Server;

//   private readonly logger = new Logger(LocationGateway.name);

//   constructor(
//     private readonly locationService: LocationService,
//     private readonly roomAccessGuard: RoomAccessGuard,
//   ) {}

//   handleConnection(client: jwtWsGuard.AuthenticatedSocket) {
//     if (!client.user?.id) {
//       client.disconnect();
//       return;
//     }
//     client.join(`user:${client.user.id}`);
//     this.logger.log(`Tracking connected: ${client.id} (user: ${client.user.id})`);
//   }

//   handleDisconnect(client: jwtWsGuard.AuthenticatedSocket) {
//     this.logger.log(`Tracking disconnected: ${client.id}`);
//   }

//   // ─── Join Tracking Session ────────────────────────────────────────────────

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('tracking:join')
//   async joinTracking(
//     @MessageBody() data: { bookingId: string },
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       await this.roomAccessGuard.verifyBookingAccess(data.bookingId, client.user.id);

//       client.join(`tracking:${data.bookingId}`);

//       // Send current positions immediately
//       const state = await this.locationService.getCurrentLocations(
//         data.bookingId,
//         client.user.id,
//       );

//       client.emit('tracking:state', state);
//     } catch (err) {
//       client.emit('error', { message: err.message });
//     }
//   }

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('tracking:leave')
//   leaveTracking(
//     @MessageBody() data: { bookingId: string },
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     client.leave(`tracking:${data.bookingId}`);
//     client.emit('tracking:left', { bookingId: data.bookingId });
//   }

//   // ─── Location Update ─────────────────────────────────────────────────────

//   /**
//    * Client/Provider sends location update every ~2-5 seconds.
//    * Throttled to 60 updates/minute (1/second max).
//    */
//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @Throttle({ default: { limit: 60, ttl: 60000 } })
//   @SubscribeMessage('location:update')
//   async updateLocation(
//     @MessageBody() dto: UpdateLocationDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       await this.roomAccessGuard.verifyBookingAccess(dto.bookingId, client.user.id);

//       const point = await this.locationService.updateLocation(client.user.id, dto);

//       // Calculate tracking state and broadcast to the other participant
//       const state = await this.locationService.getCurrentLocations(
//         dto.bookingId,
//         client.user.id,
//       );

//       // Broadcast to all participants in the tracking room
//       this.server.to(`tracking:${dto.bookingId}`).emit('location:broadcast', {
//         bookingId: dto.bookingId,
//         updatedBy: client.user.id,
//         point,
//         state,
//       });

//       return { event: 'location:updated', data: { timestamp: point.timestamp } };
//     } catch (err) {
//       client.emit('error', { event: 'location:update', message: err.message });
//     }
//   }

//   // ─── Get Current State ────────────────────────────────────────────────────

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('location:current')
//   async getCurrentLocation(
//     @MessageBody() dto: GetCurrentLocationDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       const state = await this.locationService.getCurrentLocations(
//         dto.bookingId,
//         client.user.id,
//       );
//       client.emit('tracking:state', state);
//     } catch (err) {
//       client.emit('error', { message: err.message });
//     }
//   }
// }