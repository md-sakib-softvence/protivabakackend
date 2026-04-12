import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageType } from '@prisma/client';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { GetMessagesDto, SendMessageDto } from './dto/sent.message.dto';
import {
  ConversationSummary,
  MessagePayload,
} from './interface/message.interface';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryUploadService,
  ) {}

  // ─── Room Management ────────────────────────────────────────────────────────
  async getOrCreateRoom(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, providerId: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const allowed = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
    if (!allowed.includes(booking.status)) {
      throw new BadRequestException('Messaging is only available for accepted or active bookings');
    }

    let room = await this.prisma.conversationRoom.findUnique({
      where: { bookingId },
    });

    if (!room) {
      room = await this.prisma.conversationRoom.create({
        data: {
          bookingId,
          clientId: booking.clientId,
          providerId: booking.providerId,
        },
      });
    }
    return room.id;
  }

  /** 
   * NEW: Added back - Used by Gateway for join:room 
   */
  async getRoomByBooking(bookingId: string, userId: string) {
    const room = await this.prisma.conversationRoom.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            status: true,
            serviceName: true,
            client: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
            provider: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
        },
      },
    });

    if (!room) throw new NotFoundException('Conversation room not found');

    if (room.clientId !== userId && room.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return room;
  }

  // ─── Sending Messages ────────────────────────────────────────────────────────
  async saveMessage(senderId: string, dto: SendMessageDto): Promise<MessagePayload> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { clientId: true, providerId: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.clientId !== senderId && booking.providerId !== senderId) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    const expectedReceiver = booking.clientId === senderId ? booking.providerId : booking.clientId;
    if (dto.receiverId !== expectedReceiver) {
      throw new BadRequestException('Invalid receiver for this booking');
    }

    if (!dto.content && !dto.mediaUrl) {
      throw new BadRequestException('Message must have content or media');
    }
    if (dto.messageType === MessageType.AUDIO && !dto.mediaUrl) {
      throw new BadRequestException('Audio message requires a mediaUrl');
    }

    const roomId = await this.getOrCreateRoom(dto.bookingId);

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        content: dto.content ?? '',
        messageType: dto.messageType ?? MessageType.TEXT,
        mediaUrl: dto.mediaUrl,
        metadata: {
          bookingId: dto.bookingId,
          roomId,
          thumbnailUrl: dto.thumbnailUrl,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
          duration: dto.duration,
          replyToId: dto.replyToId,
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: senderId },
      data: { lastActive: new Date() },
    });

    return this.formatMessage(message, dto.bookingId, roomId);
  }

  // ─── Media Upload ─────────────────────────────────────────────────────────
  async uploadMessageMedia(
    file: Express.Multer.File,
    type: 'image' | 'audio' | 'file',
  ): Promise<{ url: string; thumbnailUrl?: string; fileName?: string; fileSize?: number }> {
    const folder = `messages/${type}`;

    const result: any = await this.cloudinary.uploadImageFromBuffer(
      file.buffer,
      folder,
      file.originalname.replace(/\.[^/.]+$/, "")
    );

    return {
      url: result.secure_url,
      thumbnailUrl: type === 'image' ? result.secure_url : undefined,
      fileName: file.originalname,
      fileSize: file.size,
    };
  }

  // ─── Fetching Messages ───────────────────────────────────────────────────────
  async getMessages(userId: string, dto: GetMessagesDto): Promise<MessagePayload[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { clientId: true, providerId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const roomId = await this.getOrCreateRoom(dto.bookingId);

    const messages = await this.prisma.message.findMany({
      where: {
        isDeleted: false,
        metadata: {
          path: ['bookingId'],
          equals: dto.bookingId,
        },
        ...(dto.cursor ? { createdAt: { lt: new Date(dto.cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 50,
    });

    return messages.map((m) => this.formatMessage(m, dto.bookingId, roomId));
  }

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const rooms = await this.prisma.conversationRoom.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
        deletedAt: null,
      },
      include: {
        booking: {
          select: {
            id: true,
            serviceName: true,
            client: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
            provider: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const summaries: ConversationSummary[] = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await this.prisma.message.findFirst({
          where: {
            isDeleted: false,
            metadata: { path: ['bookingId'], equals: room.bookingId },
          },
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        });

        const unreadCount = await this.prisma.message.count({
          where: {
            receiverId: userId,
            isRead: false,
            isDeleted: false,
            metadata: { path: ['bookingId'], equals: room.bookingId },
          },
        });

        const participant = room.clientId === userId ? room.booking.provider : room.booking.client;

        return {
          roomId: room.id,
          bookingId: room.bookingId,
          serviceName: room.booking.serviceName,
          participant,
          lastMessage: lastMessage ? this.formatMessage(lastMessage, room.bookingId, room.id) : undefined,
          unreadCount,
          isActive: room.isActive,
          updatedAt: room.updatedAt,
        };
      }),
    );

    return summaries;
  }

  // ─── Read Receipts ───────────────────────────────────────────────────────────
  async markMessagesAsRead(
    userId: string,
    bookingId: string,
    messageIds?: string[],
  ): Promise<{ readCount: number; messageIds: string[] }> {
    const whereClause: any = {
      receiverId: userId,
      isRead: false,
      isDeleted: false,
      metadata: { path: ['bookingId'], equals: bookingId },
    };
    if (messageIds?.length) {
      whereClause.id = { in: messageIds };
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      select: { id: true },
    });

    const ids = messages.map((m) => m.id);

    await this.prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true, readAt: new Date() },
    });

    return { readCount: ids.length, messageIds: ids };
  }

  // ─── Soft Delete ─────────────────────────────────────────────────────────────
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, isDeleted: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.isDeleted) throw new BadRequestException('Message already deleted');
    if (message.senderId !== userId) throw new ForbiddenException("Cannot delete others' messages");

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── Auto Soft-Delete Scheduler ─────────────────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async autoSoftDeleteExpiredMessages(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
        updatedAt: { lte: cutoff },
      },
      select: { id: true },
    });

    if (!expiredBookings.length) return;

    const bookingIds = expiredBookings.map((b) => b.id);
    const batchSize = 200;
    let deletedTotal = 0;

    for (let i = 0; i < bookingIds.length; i += batchSize) {
      const batch = bookingIds.slice(i, i + batchSize);
      const result = await this.prisma.$executeRaw`
        UPDATE messages
        SET "isDeleted" = true, "deletedAt" = NOW()
        WHERE "isDeleted" = false
          AND metadata->>'bookingId' = ANY(${batch}::text[])
      `;
      deletedTotal += Number(result);
    }

    await this.prisma.conversationRoom.updateMany({
      where: {
        bookingId: { in: bookingIds },
        isActive: true,
      },
      data: { isActive: false, deletedAt: new Date() },
    });

    if (deletedTotal > 0) {
      this.logger.log(`Auto soft-deleted ${deletedTotal} messages from ${bookingIds.length} expired bookings`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private formatMessage(message: any, bookingId: string, roomId: string): MessagePayload {
    const meta = (message.metadata as any) ?? {};
    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      bookingId,
      roomId,
      content: message.content,
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      thumbnailUrl: meta.thumbnailUrl,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      duration: meta.duration,
      replyToId: meta.replyToId,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }
}

// import {
//   Injectable,
//   Logger,
//   NotFoundException,
//   ForbiddenException,
//   BadRequestException,
// } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { PrismaService } from 'src/prisma/prisma.service';

// import { MessageType } from '@prisma/client';
// import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
// import { GetMessagesDto, SendMessageDto } from './dto/sent.message.dto';

// @Injectable()
// export class MessageService {
//   private readonly logger = new Logger(MessageService.name);

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly cloudinary: CloudinaryUploadService,
//   ) {}

//   // ─── Room Management ────────────────────────────────────────────────────────

//   async getOrCreateRoom(bookingId: string): Promise<string> {
//     const booking = await this.prisma.booking.findUnique({
//       where: { id: bookingId },
//       select: { clientId: true, providerId: true, status: true },
//     });

//     if (!booking) throw new NotFoundException('Booking not found');

//     const allowed = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
//     if (!allowed.includes(booking.status)) {
//       throw new BadRequestException('Messaging is only available for accepted bookings');
//     }

//     let room = await this.prisma.conversationRoom.findUnique({
//       where: { bookingId },
//     });

//     if (!room) {
//       room = await this.prisma.conversationRoom.create({
//         data: {
//           bookingId,
//           clientId: booking.clientId,
//           providerId: booking.providerId,
//         },
//       });
//     }

//     return room.id;
//   }

//   async getRoomByBooking(bookingId: string, userId: string) {
//     const room = await this.prisma.conversationRoom.findUnique({
//       where: { bookingId },
//       include: {
//         booking: {
//           select: {
//             status: true,
//             serviceName: true,
//             client: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
//             provider: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
//           },
//         },
//       },
//     });

//     if (!room) throw new NotFoundException('Conversation room not found');
//     if (room.clientId !== userId && room.providerId !== userId) {
//       throw new ForbiddenException('Access denied');
//     }

//     return room;
//   }

//   // ─── Sending Messages ────────────────────────────────────────────────────────

//   async saveMessage(senderId: string, dto: SendMessageDto): Promise<MessagePayload> {
//     // Validate booking access
//     const booking = await this.prisma.booking.findUnique({
//       where: { id: dto.bookingId },
//       select: { clientId: true, providerId: true, status: true },
//     });

//     if (!booking) throw new NotFoundException('Booking not found');
//     if (booking.clientId !== senderId && booking.providerId !== senderId) {
//       throw new ForbiddenException('You are not a participant of this booking');
//     }

//     // Validate receiver is the other participant
//     const expectedReceiver =
//       booking.clientId === senderId ? booking.providerId : booking.clientId;
//     if (dto.receiverId !== expectedReceiver) {
//       throw new BadRequestException('Invalid receiver for this booking');
//     }

//     // Validate content or media
//     if (!dto.content && !dto.mediaUrl) {
//       throw new BadRequestException('Message must have content or media');
//     }

//     // Validate message type has appropriate fields
//     if (dto.messageType === MessageType.AUDIO && !dto.mediaUrl) {
//       throw new BadRequestException('Audio message requires a mediaUrl');
//     }

//     const roomId = await this.getOrCreateRoom(dto.bookingId);

//     const message = await this.prisma.message.create({
//       data: {
//         senderId,
//         receiverId: dto.receiverId,
//         content: dto.content ?? '',
//         messageType: dto.messageType ?? MessageType.TEXT,
//         mediaUrl: dto.mediaUrl,
//         metadata: {
//           bookingId: dto.bookingId,
//           roomId,
//           thumbnailUrl: dto.thumbnailUrl,
//           fileName: dto.fileName,
//           fileSize: dto.fileSize,
//           duration: dto.duration,
//           replyToId: dto.replyToId,
//         } as any,
//       },
//       include: {
//         sender: {
//           select: { id: true, firstName: true, lastName: true, avatar: true },
//         },
//       },
//     });

//     // Update user lastActive
//     await this.prisma.user.update({
//       where: { id: senderId },
//       data: { lastActive: new Date() },
//     });

//     return this.formatMessage(message, dto.bookingId, roomId);
//   }

//   // ─── Media Upload ─────────────────────────────────────────────────────────

//   async uploadMessageMedia(
//     file: Express.Multer.File,
//     type: 'image' | 'audio' | 'file',
//   ): Promise<{ url: string; thumbnailUrl?: string; fileName?: string; fileSize?: number }> {
//     const folder = `messages/${type}`;
//     const result = await this.cloudinary.uploadFile(file, folder);

//     return {
//       url: result.secure_url,
//       thumbnailUrl: type === 'image' ? result.secure_url : undefined,
//       fileName: file.originalname,
//       fileSize: file.size,
//     };
//   }

//   // ─── Fetching Messages ───────────────────────────────────────────────────────

//   async getMessages(userId: string, dto: GetMessagesDto): Promise<MessagePayload[]> {
//     const booking = await this.prisma.booking.findUnique({
//       where: { id: dto.bookingId },
//       select: { clientId: true, providerId: true },
//     });

//     if (!booking) throw new NotFoundException('Booking not found');
//     if (booking.clientId !== userId && booking.providerId !== userId) {
//       throw new ForbiddenException('Access denied');
//     }

//     const roomId = await this.getOrCreateRoom(dto.bookingId);

//     const messages = await this.prisma.message.findMany({
//       where: {
//         isDeleted: false,
//         metadata: {
//           path: ['bookingId'],
//           equals: dto.bookingId,
//         },
//         ...(dto.cursor ? { createdAt: { lt: new Date(dto.cursor) } } : {}),
//         ...(dto.before ? { createdAt: { lt: new Date(dto.before) } } : {}),
//       },
//       include: {
//         sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
//       },
//       orderBy: { createdAt: 'desc' },
//       take: dto.limit ?? 50,
//     });

//     return messages.map((m) => this.formatMessage(m, dto.bookingId, roomId));
//   }

//   async getConversations(userId: string): Promise<ConversationSummary[]> {
//     const rooms = await this.prisma.conversationRoom.findMany({
//       where: {
//         OR: [{ clientId: userId }, { providerId: userId }],
//         deletedAt: null,
//       },
//       include: {
//         booking: {
//           select: {
//             id: true,
//             serviceName: true,
//             client: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
//             provider: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
//           },
//         },
//       },
//       orderBy: { updatedAt: 'desc' },
//     });

//     const summaries: ConversationSummary[] = await Promise.all(
//       rooms.map(async (room) => {
//         const lastMessage = await this.prisma.message.findFirst({
//           where: {
//             isDeleted: false,
//             metadata: { path: ['bookingId'], equals: room.bookingId },
//           },
//           orderBy: { createdAt: 'desc' },
//           include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//         });

//         const unreadCount = await this.prisma.message.count({
//           where: {
//             receiverId: userId,
//             isRead: false,
//             isDeleted: false,
//             metadata: { path: ['bookingId'], equals: room.bookingId },
//           },
//         });

//         const participant =
//           room.clientId === userId ? room.booking.provider : room.booking.client;

//         return {
//           roomId: room.id,
//           bookingId: room.bookingId,
//           participant,
//           lastMessage: lastMessage ? this.formatMessage(lastMessage, room.bookingId, room.id) : undefined,
//           unreadCount,
//           isActive: room.isActive,
//         };
//       }),
//     );

//     return summaries;
//   }

//   // ─── Read Receipts ───────────────────────────────────────────────────────────

//   async markMessagesAsRead(
//     userId: string,
//     bookingId: string,
//     messageIds?: string[],
//   ): Promise<{ readCount: number; messageIds: string[] }> {
//     const whereClause: any = {
//       receiverId: userId,
//       isRead: false,
//       isDeleted: false,
//       metadata: { path: ['bookingId'], equals: bookingId },
//     };

//     if (messageIds?.length) {
//       whereClause.id = { in: messageIds };
//     }

//     const messages = await this.prisma.message.findMany({
//       where: whereClause,
//       select: { id: true },
//     });

//     const ids = messages.map((m) => m.id);

//     await this.prisma.message.updateMany({
//       where: { id: { in: ids } },
//       data: { isRead: true, readAt: new Date() },
//     });

//     return { readCount: ids.length, messageIds: ids };
//   }

//   // ─── Soft Delete ─────────────────────────────────────────────────────────────

//   async deleteMessage(userId: string, messageId: string): Promise<void> {
//     const message = await this.prisma.message.findUnique({
//       where: { id: messageId },
//       select: { senderId: true, isDeleted: true },
//     });

//     if (!message) throw new NotFoundException('Message not found');
//     if (message.isDeleted) throw new BadRequestException('Message already deleted');
//     if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others\' messages');

//     await this.prisma.message.update({
//       where: { id: messageId },
//       data: { isDeleted: true, deletedAt: new Date() },
//     });
//   }

//   // ─── Auto Soft-Delete Scheduler ─────────────────────────────────────────────

//   /**
//    * Runs every hour. Soft-deletes all messages in rooms whose booking
//    * has ended (COMPLETED, CANCELLED, REFUNDED) more than 24h ago.
//    */
//   @Cron(CronExpression.EVERY_HOUR)
//   async autoSoftDeleteExpiredMessages(): Promise<void> {
//     const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

//     const expiredBookings = await this.prisma.booking.findMany({
//       where: {
//         status: { in: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
//         updatedAt: { lte: cutoff },
//       },
//       select: { id: true },
//     });

//     if (!expiredBookings.length) return;

//     const bookingIds = expiredBookings.map((b) => b.id);

//     // Soft-delete messages via metadata JSON filter
//     // NOTE: For large datasets, process in batches
//     const batchSize = 200;
//     let deletedTotal = 0;

//     for (let i = 0; i < bookingIds.length; i += batchSize) {
//       const batch = bookingIds.slice(i, i + batchSize);

//       // We use raw query for JSON field filtering for performance
//       const result = await this.prisma.$executeRaw`
//         UPDATE messages
//         SET "isDeleted" = true, "deletedAt" = NOW()
//         WHERE "isDeleted" = false
//           AND metadata->>'bookingId' = ANY(${batch}::text[])
//       `;
//       deletedTotal += result;
//     }

//     // Deactivate rooms
//     await this.prisma.conversationRoom.updateMany({
//       where: {
//         bookingId: { in: bookingIds },
//         isActive: true,
//       },
//       data: { isActive: false, deletedAt: new Date() },
//     });

//     if (deletedTotal > 0) {
//       this.logger.log(`Auto soft-deleted ${deletedTotal} messages from ${bookingIds.length} expired bookings`);
//     }
//   }

//   // ─── Helpers ─────────────────────────────────────────────────────────────────

//   private formatMessage(message: any, bookingId: string, roomId: string): MessagePayload {
//     const meta = (message.metadata as any) ?? {};
//     return {
//       id: message.id,
//       senderId: message.senderId,
//       receiverId: message.receiverId,
//       bookingId,
//       roomId,
//       content: message.content,
//       messageType: message.messageType,
//       mediaUrl: message.mediaUrl,
//       thumbnailUrl: meta.thumbnailUrl,
//       fileName: meta.fileName,
//       fileSize: meta.fileSize,
//       duration: meta.duration,
//       replyToId: meta.replyToId,
//       isRead: message.isRead,
//       readAt: message.readAt,
//       createdAt: message.createdAt,
//       sender: message.sender,
//     };
//   }
// }