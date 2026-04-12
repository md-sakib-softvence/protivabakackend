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
import { CallService } from './call.service';
import { InitiateCallDto, CallSignalDto, JoinCallDto, CallActionDto } from './dto/call.dto';

@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(CallGateway.name);

  // Track which room each socket is in for cleanup on disconnect
  private readonly socketRooms = new Map<string, string>(); // socketId → roomId

  constructor(private readonly callService: CallService) {}

  handleConnection(client: jwtWsGuard.AuthenticatedSocket) {
    if (!client.user?.id) {
      client.disconnect();
      return;
    }
    client.join(`user:${client.user.id}`);
    this.logger.log(`Call socket connected: ${client.id} (user: ${client.user.id})`);
  }

  async handleDisconnect(client: jwtWsGuard.AuthenticatedSocket) {
    const roomId = this.socketRooms.get(client.id);
    if (roomId && client.user?.id) {
      client.to(`call:${roomId}`).emit('call:participant_left', {
        userId: client.user.id,
        reason: 'disconnected',
      });
      this.socketRooms.delete(client.id);
    }
    this.logger.log(`Call socket disconnected: ${client.id}`);
  }

  // ─── Initiate Call ────────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @SubscribeMessage('call:initiate')
  async initiateCall(
    @MessageBody() dto: InitiateCallDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const result = await this.callService.initiateCall(client.user.id, dto);

      client.join(`call:${result.roomId}`);
      this.socketRooms.set(client.id, result.roomId);

      // Notify callee
      this.server.to(`user:${dto.calleeId}`).emit('call:incoming', {
        sessionId: result.sessionId,
        roomId: result.roomId,
        callerId: client.user.id,
        type: result.type,
        provider: result.provider,
        token: result.calleeToken,
      });

      return {
        event: 'call:initiated',
        data: {
          sessionId: result.sessionId,
          roomId: result.roomId,
          provider: result.provider,
          token: result.callerToken,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error in call:initiate`, error);
      client.emit('error', {
        event: 'call:initiate',
        message: error.message || 'Failed to initiate call',
      });
    }
  }

  // ─── Accept Call ──────────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('call:accept')
  async acceptCall(
    @MessageBody() data: JoinCallDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const result = await this.callService.acceptCall(client.user.id, data.roomId);

      client.join(`call:${data.roomId}`);
      this.socketRooms.set(client.id, data.roomId);

      client.to(`call:${data.roomId}`).emit('call:accepted', {
        calleeId: client.user.id,
        roomId: data.roomId,
      });

      return { event: 'call:joined', data: { ...result } };
    } catch (error: any) {
      this.logger.error(`Error in call:accept`, error);
      client.emit('error', {
        event: 'call:accept',
        message: error.message || 'Failed to accept call',
      });
    }
  }

  // ─── Reject Call ──────────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('call:reject')
  async rejectCall(
    @MessageBody() data: CallActionDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.callService.rejectCall(client.user.id, data.roomId);

      client.to(`call:${data.roomId}`).emit('call:rejected', {
        calleeId: client.user.id,
      });

      return { event: 'call:rejected' };
    } catch (error: any) {
      this.logger.error(`Error in call:reject`, error);
      client.emit('error', {
        event: 'call:reject',
        message: error.message || 'Failed to reject call',
      });
    }
  }

  // ─── End Call ─────────────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('call:end')
  async endCall(
    @MessageBody() data: CallActionDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const result = await this.callService.endCall(client.user.id, data.roomId);

      this.server.to(`call:${data.roomId}`).emit('call:ended', {
        endedBy: client.user.id,
        duration: result.duration,
      });

      // Clean up room
      const sockets = await this.server.in(`call:${data.roomId}`).fetchSockets();
      sockets.forEach((s) => {
        s.leave(`call:${data.roomId}`);
        this.socketRooms.delete(s.id);
      });

      return { event: 'call:ended', data: result };
    } catch (error: any) {
      this.logger.error(`Error in call:end`, error);
      client.emit('error', {
        event: 'call:end',
        message: error.message || 'Failed to end call',
      });
    }
  }

  // ─── Signaling Relay (no try/catch needed as they are fire-and-forget) ─────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('signal:offer')
  async relayOffer(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:offer', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('signal:answer')
  async relayAnswer(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:answer', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('signal:ice')
  async relayIceCandidate(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:ice', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
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
// import { CallService } from './call.service';
// import { InitiateCallDto, CallSignalDto, JoinCallDto, CallActionDto } from './dto/call.dto';

// @WebSocketGateway({
//   namespace: '/calls',
//   cors: {
//     origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
//     credentials: true,
//   },
//   transports: ['websocket', 'polling'],
// })
// export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   private readonly server!: Server;

//   private readonly logger = new Logger(CallGateway.name);

//   // Track which room each socket is in for cleanup on disconnect
//   private readonly socketRooms = new Map<string, string>(); // socketId → roomId

//   constructor(private readonly callService: CallService) {}

//   handleConnection(client: jwtWsGuard.AuthenticatedSocket) {
//     if (!client.user?.id) { client.disconnect(); return; }
//     client.join(`user:${client.user.id}`);
//     this.logger.log(`Call socket connected: ${client.id} (user: ${client.user.id})`);
//   }

//   async handleDisconnect(client: jwtWsGuard.AuthenticatedSocket) {
//     const roomId = this.socketRooms.get(client.id);
//     if (roomId && client.user?.id) {
//       // Notify other participant call dropped
//       client.to(`call:${roomId}`).emit('call:participant_left', {
//         userId: client.user.id,
//         reason: 'disconnected',
//       });
//       this.socketRooms.delete(client.id);
//     }
//     this.logger.log(`Call socket disconnected: ${client.id}`);
//   }

//   // ─── Initiate Call ────────────────────────────────────────────────────────

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @Throttle({ default: { limit: 5, ttl: 60000 } }) // max 5 calls/min
//   @SubscribeMessage('call:initiate')
//   async initiateCall(
//     @MessageBody() dto: InitiateCallDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       const result = await this.callService.initiateCall(client.user.id, dto);

//       // Join signaling room
//       client.join(`call:${result.roomId}`);
//       this.socketRooms.set(client.id, result.roomId);

//       // Notify callee
//       this.server.to(`user:${dto.calleeId}`).emit('call:incoming', {
//         sessionId: result.sessionId,
//         roomId: result.roomId,
//         callerId: client.user.id,
//         type: result.type,
//         provider: result.provider,
//         token: result.calleeToken,
//       });

//       return {
//         event: 'call:initiated',
//         data: {
//           sessionId: result.sessionId,
//           roomId: result.roomId,
//           provider: result.provider,
//           token: result.callerToken,
//         },
//       };
//     } catch (err) {
//       client.emit('error', { event: 'call:initiate', message: err.message });
//     }
//   }

//   // ─── Accept / Reject ──────────────────────────────────────────────────────

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('call:accept')
//   async acceptCall(
//     @MessageBody() data: JoinCallDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       const result = await this.callService.acceptCall(client.user.id, data.roomId);

//       client.join(`call:${data.roomId}`);
//       this.socketRooms.set(client.id, data.roomId);

//       // Tell caller
//       client.to(`call:${data.roomId}`).emit('call:accepted', {
//         calleeId: client.user.id,
//         roomId: data.roomId,
//       });

//       return { event: 'call:joined', data: { ...result } };
//     } catch (err) {
//       client.emit('error', { event: 'call:accept', message: err.message });
//     }
//   }

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('call:reject')
//   async rejectCall(
//     @MessageBody() data: CallActionDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       await this.callService.rejectCall(client.user.id, data.roomId);

//       client.to(`call:${data.roomId}`).emit('call:rejected', {
//         calleeId: client.user.id,
//       });

//       return { event: 'call:rejected' };
//     } catch (err) {
//       client.emit('error', { event: 'call:reject', message: err.message });
//     }
//   }

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('call:end')
//   async endCall(
//     @MessageBody() data: CallActionDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     try {
//       const result = await this.callService.endCall(client.user.id, data.roomId);

//       this.server.to(`call:${data.roomId}`).emit('call:ended', {
//         endedBy: client.user.id,
//         duration: result.duration,
//       });

//       // Clean up room
//       const sockets = await this.server.in(`call:${data.roomId}`).fetchSockets();
//       sockets.forEach((s) => {
//         s.leave(`call:${data.roomId}`);
//         this.socketRooms.delete(s.id);
//       });

//       return { event: 'call:ended', data: result };
//     } catch (err) {
//       client.emit('error', { event: 'call:end', message: err.message });
//     }
//   }

//   // ─── WebRTC Signaling Relay ───────────────────────────────────────────────
//   // These events relay SDP offer/answer and ICE candidates between peers.
//   // The server never inspects the signal payload — pure relay.

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('signal:offer')
//   async relayOffer(
//     @MessageBody() dto: CallSignalDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     this.server.to(`user:${dto.targetUserId}`).emit('signal:offer', {
//       from: client.user.id,
//       roomId: dto.roomId,
//       signal: dto.signal,
//     });
//   }

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('signal:answer')
//   async relayAnswer(
//     @MessageBody() dto: CallSignalDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     this.server.to(`user:${dto.targetUserId}`).emit('signal:answer', {
//       from: client.user.id,
//       roomId: dto.roomId,
//       signal: dto.signal,
//     });
//   }

//   @UseGuards(jwtWsGuard.JwtWsGuard)
//   @SubscribeMessage('signal:ice')
//   async relayIceCandidate(
//     @MessageBody() dto: CallSignalDto,
//     @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
//   ) {
//     this.server.to(`user:${dto.targetUserId}`).emit('signal:ice', {
//       from: client.user.id,
//       roomId: dto.roomId,
//       signal: dto.signal,
//     });
//   }
// }