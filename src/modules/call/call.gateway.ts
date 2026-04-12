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
import { ExtendedError } from 'socket.io';                    // ← Required
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CallService } from './call.service';
import { InitiateCallDto, AcceptCallDto, RejectCallDto, EndCallDto, CallSignalDto } from './dto/call.dto';

export interface AuthSocket extends Socket {
  user: { id: string; email: string; role: string };
}

@WebSocketGateway({
  namespace: 'calls',
  cors: { origin: '*', credentials: true },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;                                      // ← Fixed: removed | undefined

  private readonly logger = new Logger(CallGateway.name);
  private readonly socketRooms = new Map<string, string>();

  constructor(
    private readonly callService: CallService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Auth Middleware (Fixed) ─────────────────────────────────────────────
  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthSocket;

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
            return next(new WsException('User inactive'));
          }

          authSocket.user = { id: user.id, email: user.email, role: user.role };
          next();
        } catch (err: any) {
          next(new WsException('Invalid token'));
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
    this.logger.log(`[Calls] Connected: ${client.id} (user: ${client.user.id})`);
  }

  async handleDisconnect(client: AuthSocket) {
    const roomId = this.socketRooms.get(client.id);
    if (roomId && client.user?.id) {
      // Notify others in the call room
      client.to(`call:${roomId}`).emit('call:participant_left', {
        userId: client.user.id,
        roomId,
        reason: 'disconnected',
      });

      this.socketRooms.delete(client.id);
    }
    this.logger.log(`[Calls] Disconnected: ${client.id}`);
  }

  // ─── Call Events ─────────────────────────────────────────────────────────
  @SubscribeMessage('call:initiate')
  async initiateCall(
    @MessageBody() dto: InitiateCallDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const result = await this.callService.initiateCall(client.user.id, dto);

      client.join(`call:${result.roomId}`);
      this.socketRooms.set(client.id, result.roomId);

      client.emit('call:initiated', {
        sessionId: result.sessionId,
        roomId: result.roomId,
        provider: result.provider,
        type: result.type,
        callerToken: result.callerToken ?? null,
      });

      // Get caller info for callee
      const caller = await this.prisma.user.findUnique({
        where: { id: client.user.id },
        select: { firstName: true, lastName: true, avatar: true },
      });

      this.server.to(`user:${dto.calleeId}`).emit('call:incoming', {
        sessionId: result.sessionId,
        roomId: result.roomId,
        bookingId: dto.bookingId,
        callerId: client.user.id,
        callerName: `${caller?.firstName || ''} ${caller?.lastName || ''}`.trim(),
        callerAvatar: caller?.avatar ?? null,
        type: result.type,
        provider: result.provider,
        token: result.calleeToken ?? null,
      });
    } catch (err: any) {
      client.emit('error', { event: 'call:initiate', message: err.message || err });
    }
  }

  @SubscribeMessage('call:accept')
  async acceptCall(
    @MessageBody() dto: AcceptCallDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const result = await this.callService.acceptCall(client.user.id, dto.roomId);

      client.join(`call:${dto.roomId}`);
      this.socketRooms.set(client.id, dto.roomId);

      const callee = await this.prisma.user.findUnique({
        where: { id: client.user.id },
        select: { firstName: true, lastName: true },
      });

      this.server.to(`call:${dto.roomId}`).emit('call:accepted', {
        calleeId: client.user.id,
        calleeName: `${callee?.firstName || ''} ${callee?.lastName || ''}`.trim(),
        roomId: dto.roomId,
      });

      client.emit('call:joined', { sessionId: result.sessionId, roomId: dto.roomId });
    } catch (err: any) {
      client.emit('error', { event: 'call:accept', message: err.message || err });
    }
  }

  @SubscribeMessage('call:reject')
  async rejectCall(
    @MessageBody() dto: RejectCallDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.callService.rejectCall(client.user.id, dto.roomId);

      this.server.to(`call:${dto.roomId}`).emit('call:rejected', {
        calleeId: client.user.id,
      });

      client.emit('call:reject_ack', { roomId: dto.roomId });
    } catch (err: any) {
      client.emit('error', { event: 'call:reject', message: err.message || err });
    }
  }

  @SubscribeMessage('call:end')
  async endCall(
    @MessageBody() dto: EndCallDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const result = await this.callService.endCall(client.user.id, dto.roomId);

      this.server.to(`call:${dto.roomId}`).emit('call:ended', {
        endedBy: client.user.id,
        duration: result.duration,
        roomId: dto.roomId,
      });

      // Clean up all sockets in the room
      const sockets = await this.server.in(`call:${dto.roomId}`).fetchSockets();
      sockets.forEach((s) => {
        s.leave(`call:${dto.roomId}`);
        this.socketRooms.delete(s.id);
      });
    } catch (err: any) {
      client.emit('error', { event: 'call:end', message: err.message || err });
    }
  }

  // ─── WebRTC Signaling Relay ──────────────────────────────────────────────
  @SubscribeMessage('signal:offer')
  relayOffer(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:offer', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
  }

  @SubscribeMessage('signal:answer')
  relayAnswer(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:answer', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
  }

  @SubscribeMessage('signal:ice')
  relayIce(
    @MessageBody() dto: CallSignalDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.server.to(`user:${dto.targetUserId}`).emit('signal:ice', {
      from: client.user.id,
      roomId: dto.roomId,
      signal: dto.signal,
    });
  }
}