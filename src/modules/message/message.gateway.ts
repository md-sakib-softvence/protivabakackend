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
import { ExtendedError, Server, Socket } from 'socket.io';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageService } from './message.service';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import {
  DeleteMessageDto,
  MarkReadDto,
  SendMessageDto,
  TypingDto,
} from './dto/sent.message.dto';

export interface AuthSocket extends Socket {
  user: { id: string; email: string; role: string };
}

@WebSocketGateway({
  namespace: 'messaging',
  cors: { origin: '*', credentials: true },
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
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

  // ─── Auth Middleware ──────────────────────────────────────────────────────
  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthSocket;
      (async () => {
        try {
          const token =
            authSocket.handshake.auth?.token ||
            (authSocket.handshake.headers?.authorization as string)?.replace(
              'Bearer ',
              '',
            );

          if (!token) return next(new Error('No token provided'));

          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get('env')?.JWT_SECRET,
          });

          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true, status: true },
          });

          if (!user || user.status !== 'ACTIVE') {
            return next(new Error('User inactive or not found'));
          }

          authSocket.user = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
          next();
        } catch (err: any) {
          next(new Error(`Auth failed: ${err.message}`));
        }
      })();
    });
  }

  // ─── Connection ───────────────────────────────────────────────────────────
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

    // Join personal room so we can push notifications to this user
    client.join(`user:${userId}`);

    // ── FIX: emit connected so client can confirm auth worked ──────────────
    client.emit('connected', {
      userId,
      socketId: client.id,
      message: 'Connected to messaging namespace',
    });

    this.logger.log(
      `[Messaging] Connected: ${client.id} | user: ${userId} | role: ${client.user.role}`,
    );
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

  // ─── join:room ────────────────────────────────────────────────────────────
  @SubscribeMessage('join:room')
  async joinRoom(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      await this.roomAccessGuard.verifyBookingAccess(
        data.bookingId,
        client.user.id,
      );

      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);

      client.join(`room:${roomId}`);
      client.join(`booking:${data.bookingId}`);

      this.logger.log(`[Messaging] ${client.user.id} joined room:${roomId}`);

      // Fetch last 30 messages for history
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

      // ── FIX: emit room:joined back to THIS client ─────────────────────────
      client.emit('room:joined', {
        roomId,
        bookingId: data.bookingId,
        messages,
        unreadCount,
      });

      // Tell everyone else in the room that someone joined
      client.to(`room:${roomId}`).emit('user:joined', {
        userId: client.user.id,
        bookingId: data.bookingId,
      });
    } catch (err: any) {
      this.logger.error(`join:room error: ${err.message}`);
      client.emit('error', {
        event: 'join:room',
        message: err.message || String(err),
      });
    }
  }

  // ─── leave:room ───────────────────────────────────────────────────────────
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
      client.emit('error', { event: 'leave:room', message: err.message });
    }
  }

  // ─── message:send ─────────────────────────────────────────────────────────
  // @SubscribeMessage('message:send')
  // async sendMessage(
  //   @MessageBody() dto: SendMessageDto,
  //   @ConnectedSocket() client: AuthSocket,
  // ) {
  //   try {
  //     await this.roomAccessGuard.verifyBookingAccess(
  //       dto.bookingId,
  //       client.user.id,
  //     );

  //     const message = await this.messageService.saveMessage(
  //       client.user.id,
  //       dto,
  //     );
  //     const roomId = message.roomId!;

  //     this.logger.log(
  //       `[Messaging] message:send → room:${roomId} | from:${client.user.id} → to:${dto.receiverId}`,
  //     );
  //     console.log("something about roomid:", roomId);

  //     // ── FIX 1: Broadcast message:new to ALL sockets in the room ──────────
  //     // This delivers to BOTH sender and receiver if they've joined the room
  //     this.server.to(`room:${roomId}`).emit('message:new', message);

  //     console.log("print the revceiverId:", dto.receiverId)

  //     // ── FIX 2: Also push directly to receiver's personal room ─────────────
  //     // This fires even if receiver hasn't called join:room yet
  //     this.server
  //       .to(`user:${dto.receiverId}`)
  //       .emit('message:notification', {
  //         bookingId: dto.bookingId,
  //         roomId,
  //         senderId: client.user.id,
  //         senderName: `${message.sender.firstName} ${message.sender.lastName}`,
  //         preview: this.getPreview(dto),
  //         message,
  //       });

  //     // ── FIX 3: Confirm to sender that message was saved ───────────────────
  //     client.emit('message:sent', {
  //       messageId: message.id,
  //       roomId,
  //       createdAt: message.createdAt,
  //     });
  //   } catch (err: any) {
  //     this.logger.error(`message:send error: ${err.message}`);
  //     client.emit('error', {
  //       event: 'message:send',
  //       message: err.message || String(err),
  //     });
  //   }
  // }
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

      this.logger.log(
        `[Messaging] message:send → room:${roomId} | from:${client.user.id} → to:${dto.receiverId}`,
      );

      // 1. Broadcast to everyone in the room (both sender + receiver if they joined)
      this.server.to(`room:${roomId}`).emit('message:new', message);

      // 2. IMPROVED: Send notification to ALL sockets of the receiver using the Map
      // 2. Send notification to receiver using userSockets map
      const receiverSockets = this.userSockets.get(dto.receiverId);

      if (receiverSockets && receiverSockets.size > 0) {
        receiverSockets.forEach((socketId) => {
          this.server.to(socketId).emit('message:notification', {
            bookingId: dto.bookingId,
            roomId,
            senderId: client.user.id,
            senderName:
              `${message.sender.firstName} ${message.sender.lastName || ''}`.trim(),
            preview: this.getPreview(dto),
            message,
          });
        });

        this.logger.log(
          `[Messaging] Notification sent to ${receiverSockets.size} socket(s) of user ${dto.receiverId}`,
        );
      } else {
        this.logger.warn(
          `[Messaging] Receiver ${dto.receiverId} has NO active sockets - message saved but no real-time notification`,
        );
      }
      // const receiverSockets = this.userSockets.get(dto.receiverId);

      // if (receiverSockets && receiverSockets.size > 0) {
      //   // Emit to each of receiver's sockets individually (more reliable)
      //   receiverSockets.forEach((socketId) => {
      //     this.server.to(socketId).emit('message:notification', {
      //       bookingId: dto.bookingId,
      //       roomId,
      //       senderId: client.user.id,
      //       senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      //       preview: this.getPreview(dto),
      //       message,
      //     });
      //   });

      //   this.logger.log(
      //     `[Messaging] Notification sent to ${receiverSockets.size} socket(s) of user ${dto.receiverId}`,
      //   );
      // } else {
      //   this.logger.log(
      //     `[Messaging] Receiver ${dto.receiverId} is offline - no notification sent`,
      //   );
      //   // Optionally save to DB for push notification later (Firebase, etc.)
      // }

      // 3. Confirm to sender
      client.emit('message:sent', {
        messageId: message.id,
        roomId,
        createdAt: message.createdAt,
      });
    } catch (err: any) {
      this.logger.error(`message:send error: ${err.message}`);
      client.emit('error', {
        event: 'message:send',
        message: err.message || String(err),
      });
    }
  }

  // ─── message:read ─────────────────────────────────────────────────────────
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

      // Notify everyone in room about read receipts
      this.server.to(`room:${roomId}`).emit('message:read_receipt', {
        bookingId: dto.bookingId,
        readerId: client.user.id,
        messageIds: result.messageIds,
        readAt: new Date(),
      });

      // Confirm to the reader
      client.emit('message:read_ack', result);
    } catch (err: any) {
      client.emit('error', { event: 'message:read', message: err.message });
    }
  }

  // ─── message:delete ───────────────────────────────────────────────────────
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
      client.emit('error', { event: 'message:delete', message: err.message });
    }
  }

  // ─── typing events ────────────────────────────────────────────────────────
  @SubscribeMessage('typing:start')
  async typingStart(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
      // client.to = everyone in room EXCEPT the sender
      client.to(`room:${roomId}`).emit('typing:update', {
        userId: client.user.id,
        bookingId: dto.bookingId,
        isTyping: true,
      });
    } catch (_) {}
  }

  @SubscribeMessage('typing:stop')
  async typingStop(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const roomId = await this.messageService.getOrCreateRoom(dto.bookingId);
      client.to(`room:${roomId}`).emit('typing:update', {
        userId: client.user.id,
        bookingId: dto.bookingId,
        isTyping: false,
      });
    } catch (_) {}
  }

  // ─── Debug helper: check who is in a room ─────────────────────────────────
  @SubscribeMessage('debug:room_members')
  async debugRoomMembers(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const roomId = await this.messageService.getOrCreateRoom(data.bookingId);
      const sockets = await this.server.in(`room:${roomId}`).fetchSockets();

      client.emit('debug:room_members_result', {
        roomId,
        bookingId: data.bookingId,
        memberCount: sockets.length,
        memberSocketIds: sockets.map((s) => s.id),
        note:
          sockets.length < 2
            ? 'ONLY 1 member in room — provider has NOT joined yet. Provider must also call join:room'
            : 'Both participants in room — broadcasts will work',
      });
    } catch (err: any) {
      client.emit('error', {
        event: 'debug:room_members',
        message: err.message,
      });
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
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
