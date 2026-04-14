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
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io';           // ← Added
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from './message.service';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import { DeleteMessageDto, MarkReadDto, SendMessageDto, TypingDto } from './dto/sent.message.dto';

export interface AuthSocket extends Socket {
  user: { id: string; email: string; role: string };
}

@WebSocketGateway({
  namespace: 'messaging',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessageGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly messageService: MessageService,
    private readonly roomAccessGuard: RoomAccessGuard,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Auth Middleware ─────────────────────────────────────────────────────
  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthSocket;

      // Run async logic inside middleware
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
  async handleConnection(client: AuthSocket) {
    const userId = client.user?.id;
    if (!userId) {
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    client.join(`user:${userId}`);

    client.emit('connected', { userId, socketId: client.id });
    this.logger.log(`[Messaging] Connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: AuthSocket) {
    const userId = client.user?.id;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`[Messaging] Disconnected: ${client.id}`);
  }

  // ─── Room Events ─────────────────────────────────────────────────────────
  @SubscribeMessage('join:room')
  async joinRoom(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(data.bookingId, client.user.id);

      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);

      client.join(`room:${roomId}`);
      client.join(`booking:${data.bookingId}`);

      const messages = await this.messageService.getMessages(client.user.id, {
        bookingId: data.bookingId,
        limit: 30,
      });

      const unreadCount = await this.prisma.message.count({
        where: {
          receiverId: client.user.id,
          isRead: false,
          isDeleted: false,
          metadata: { path: ['bookingId'], equals: data.bookingId },
        },
      });

      client.emit('room:joined', {
        roomId,
        bookingId: data.bookingId,
        messages,
        unreadCount,
      });
    } catch (err: any) {
      client.emit('error', { event: 'join:room', message: err.message || err });
    }
  }

  @SubscribeMessage('leave:room')
  async leaveRoom(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);
      client.leave(`room:${roomId}`);
      client.leave(`booking:${data.bookingId}`);
      client.emit('room:left', { bookingId: data.bookingId });
    } catch (err: any) {
      client.emit('error', { event: 'leave:room', message: err.message || err });
    }
  }

  // ─── Message Events ──────────────────────────────────────────────────────
  @SubscribeMessage('message:send')
  async sendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(dto.bookingId, client.user.id);
      console.log("Hit save message service-1");
      const message = await this.messageService.saveMessage(client.user.id, dto);
      console.log("Done save message");
      const roomId = message.roomId!;

      // Broadcast to room
      this.server.to(`room:${roomId}`).emit('message:new', message);

      // Notification to receiver
      this.server.to(`user:${dto.receiverId}`).emit('message:notification', {
        bookingId: dto.bookingId,
        roomId,
        senderId: client.user.id,
        preview: this.getPreview(dto),
      });

      client.emit('message:sent', { messageId: message.id });
    } catch (err: any) {
      client.emit('error', { event: 'message:send', message: err.message || err });
    }
  }

  @SubscribeMessage('message:read')
  async markRead(
    @MessageBody() dto: MarkReadDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const result = await this.messageService.markMessagesAsRead(
        client.user.id,
        dto.bookingId,
        dto.messageIds,
      );

      const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);

      this.server.to(`room:${roomId}`).emit('message:read_receipt', {
        bookingId: dto.bookingId,
        readerId: client.user.id,
        messageIds: result.messageIds,
        readAt: new Date(),
      });

      client.emit('message:read_ack', result);
    } catch (err: any) {
      client.emit('error', { event: 'message:read', message: err.message || err });
    }
  }

  @SubscribeMessage('message:delete')
  async deleteMessage(
    @MessageBody() dto: DeleteMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.messageService.deleteMessage(client.user.id, dto.messageId);

      const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);

      this.server.to(`room:${roomId}`).emit('message:deleted', {
        messageId: dto.messageId,
        bookingId: dto.bookingId,
        deletedAt: new Date(),
      });
    } catch (err: any) {
      client.emit('error', { event: 'message:delete', message: err.message || err });
    }
  }

  // ─── Typing Events ───────────────────────────────────────────────────────
  @SubscribeMessage('typing:start')
  async typingStart(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
    this.server.to(`room:${roomId}`).emit('typing:update', {
      userId: client.user.id,
      bookingId: dto.bookingId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  async typingStop(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
    this.server.to(`room:${roomId}`).emit('typing:update', {
      userId: client.user.id,
      bookingId: dto.bookingId,
      isTyping: false,
    });
  }

  // ─── Helper ──────────────────────────────────────────────────────────────
  private getPreview(dto: SendMessageDto): string {
    if (dto.messageType === 'AUDIO') return 'Voice message';
    if (dto.messageType === 'IMAGE') return 'Image';
    if (dto.messageType === 'FILE') return dto.fileName ?? 'File';
    return dto.content?.slice(0, 80) ?? '';
  }

  broadcastToBooking(bookingId: string, event: string, data: any) {
    this.server.to(`booking:${bookingId}`).emit(event, data);
  }
}