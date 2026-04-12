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
import { MessageService } from './message.service';
import { DeleteMessageDto, MarkReadDto, SendMessageDto, TypingDto } from './dto/sent.message.dto';

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(MessageGateway.name);

  // userId → Set of socket ids (multi-device support)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly messageService: MessageService,
    private readonly roomAccessGuard: RoomAccessGuard,
  ) {}

  // ─── Connection Lifecycle ─────────────────────────────────────────────────
  async handleConnection(client: jwtWsGuard.AuthenticatedSocket) {
    try {
      const userId = client.user?.id;
      if (!userId) {
        client.disconnect();
        return;
      }

      // Track socket for multi-device support
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Auto-join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
      client.emit('connected', { userId, socketId: client.id });
    } catch (error) {
      this.logger.error('Error during connection handling', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: jwtWsGuard.AuthenticatedSocket) {
    const userId = client.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets && sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Room Join/Leave ──────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('join:room')
  async joinRoom(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(data.bookingId, client.user.id);

      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);

      client.join(`room:${roomId}`);
      client.join(`booking:${data.bookingId}`);

      // Load recent message history
      const messages = await this.messageService.getMessages(client.user.id, {
        bookingId: data.bookingId,
        limit: 30,
      });

      client.emit('room:joined', { 
        roomId, 
        bookingId: data.bookingId, 
        messages 
      });
    } catch (error: any) {
      this.logger.error(`Error in join:room for booking ${data.bookingId}`, error);
      client.emit('error', { 
        event: 'join:room',
        message: error.message || 'Failed to join room' 
      });
    }
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('leave:room')
  async leaveRoom(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);

      client.leave(`room:${roomId}`);
      client.leave(`booking:${data.bookingId}`);

      client.emit('room:left', { bookingId: data.bookingId });
    } catch (error: any) {
      this.logger.error(`Error in leave:room`, error);
      client.emit('error', { 
        event: 'leave:room',
        message: error.message || 'Failed to leave room' 
      });
    }
  }

  // ─── Messaging ────────────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @SubscribeMessage('message:send')
  async sendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(dto.bookingId, client.user.id);

      const message = await this.messageService.saveMessage(client.user.id, dto);
      const roomId = message.roomId!;

      // Broadcast new message to everyone in the room
      this.server.to(`room:${roomId}`).emit('message:new', message);

      // Send notification to receiver (if they are connected)
      this.server.to(`user:${dto.receiverId}`).emit('message:notification', {
        bookingId: dto.bookingId,
        senderId: client.user.id,
        preview: this.getMessagePreview(dto),
      });

      return { 
        event: 'message:sent', 
        data: { messageId: message.id } 
      };
    } catch (error: any) {
      this.logger.error(`Error in message:send`, error);
      client.emit('error', { 
        event: 'message:send',
        message: error.message || 'Failed to send message' 
      });
    }
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('message:read')
  async markRead(
    @MessageBody() dto: MarkReadDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      const result = await this.messageService.markMessagesAsRead(
        client.user.id,
        dto.bookingId,
        dto.messageIds,
      );

      const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);

      // Notify other participants about read receipts
      this.server.to(`room:${roomId}`).emit('message:read_receipt', {
        bookingId: dto.bookingId,
        readerId: client.user.id,
        messageIds: result.messageIds,
        readAt: new Date(),
      });

      return { event: 'message:read', data: result };
    } catch (error: any) {
      this.logger.error(`Error in message:read`, error);
      client.emit('error', { 
        event: 'message:read',
        message: error.message || 'Failed to mark messages as read' 
      });
    }
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('message:delete')
  async deleteMessage(
    @MessageBody() dto: DeleteMessageDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    try {
      await this.messageService.deleteMessage(client.user.id, dto.messageId);

      // Notify room that message was deleted
      client.to(`room:${dto.bookingId}`).emit('message:deleted', { 
        messageId: dto.messageId 
      });

      client.emit('message:deleted', { messageId: dto.messageId });
    } catch (error: any) {
      this.logger.error(`Error in message:delete`, error);
      client.emit('error', { 
        event: 'message:delete',
        message: error.message || 'Failed to delete message' 
      });
    }
  }

  // ─── Typing Indicator ─────────────────────────────────────────────────────
  @UseGuards(jwtWsGuard.JwtWsGuard)
  @Throttle({ default: { limit: 10, ttl: 5000 } })
  @SubscribeMessage('typing:start')
  async typingStart(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
    this.server.to(`room:${roomId}`).emit('typing:update', {
      userId: client.user.id,
      bookingId: dto.bookingId,
      isTyping: true,
    });
  }

  @UseGuards(jwtWsGuard.JwtWsGuard)
  @SubscribeMessage('typing:stop')
  async typingStop(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: jwtWsGuard.AuthenticatedSocket,
  ) {
    const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
    this.server.to(`room:${roomId}`).emit('typing:update', {
      userId: client.user.id,
      bookingId: dto.bookingId,
      isTyping: false,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private getMessagePreview(dto: SendMessageDto): string {
    if (dto.messageType === 'AUDIO') return '🎤 Voice message';
    if (dto.messageType === 'IMAGE') return '📷 Image';
    if (dto.messageType === 'FILE') return `📎 ${dto.fileName ?? 'File'}`;
    return dto.content?.slice(0, 80) ?? '';
  }

  /**
   * Public method to broadcast system messages from other services
   */
  broadcastToRoom(bookingId: string, event: string, data: any) {
    this.server.to(`booking:${bookingId}`).emit(event, data);
  }
}