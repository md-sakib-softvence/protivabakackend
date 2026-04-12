import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emitted via WebSocket: message:send
 * Also used internally when saving a message.
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  /** URL returned from POST /messages/upload/* before sending */
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  /** Image thumbnail preview URL (for images/videos) */
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  /** Original filename for FILE type messages */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fileName?: string;

  /** File size in bytes */
  @IsNumber()
  @IsOptional()
  @Min(1)
  fileSize?: number;

  /** Duration in seconds for AUDIO/VIDEO messages */
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3600)
  duration?: number;

  /** ID of message being replied to */
  @IsString()
  @IsOptional()
  replyToId?: string;
}

/**
 * Query params for GET /messages/history
 */
export class GetMessagesDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  /**
   * Cursor-based pagination.
   * Pass the createdAt timestamp (ISO string) of the oldest message you have.
   * Server returns messages older than this cursor.
   */
  @IsDateString()
  @IsOptional()
  cursor?: string;

  /**
   * Filter by message type
   */
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;
}

/**
 * Body for POST /messages/read
 */
export class MarkReadDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  /**
   * Specific message IDs to mark as read.
   * If omitted → all unread messages in the booking are marked read.
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  messageIds?: string[];
}

/**
 * WebSocket: typing:start / typing:stop
 */
export class TypingDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsNotEmpty()
  receiverId!: string;
}

/**
 * WebSocket: message:delete
 */
export class DeleteMessageDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  /** Pass bookingId so gateway can broadcast deletion to the correct room */
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * WebSocket: join:room / leave:room
 */
export class RoomDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class SenderDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  avatar?: string | null;
  role!: string;
}

export class ReplyPreviewDto {
  id!: string;
  content?: string;
  messageType!: MessageType;
  senderName!: string;
}

export class MessageResponseDto {
  id!: string;
  bookingId!: string;
  roomId!: string;
  senderId!: string;
  receiverId!: string;
  content!: string;
  messageType!: MessageType;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  replyToId?: string | null;
  replyTo?: ReplyPreviewDto | null;
  isRead!: boolean;
  readAt?: Date | null;
  isDeleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  sender!: SenderDto;
}

export class ConversationSummaryDto {
  roomId!: string;
  bookingId!: string;
  serviceName!: string;
  participant!: SenderDto;
  lastMessage?: Partial<MessageResponseDto> | null;
  unreadCount!: number;
  isActive!: boolean;
  updatedAt!: Date;
}

export class RoomInfoDto {
  id!: string;
  bookingId!: string;
  clientId!: string;
  providerId!: string;
  isActive!: boolean;
  expiresAt?: Date | null;
  createdAt!: Date;
  booking!: {
    status: string;
    serviceName: string;
    client: SenderDto;
    provider: SenderDto;
  };
}

export class MarkReadResponseDto {
  readCount!: number;
  messageIds!: string[];
}

export class MediaUploadResponseDto {
  url!: string;
  thumbnailUrl?: string;
  fileName!: string;
  fileSize!: number;
  mimeType!: string;
  /** For audio: duration in seconds (estimated server-side if possible) */
  duration?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENT PAYLOADS (emitted from server → client)
// ─────────────────────────────────────────────────────────────────────────────

export class WsRoomJoinedPayload {
  roomId!: string;
  bookingId!: string;
  /** Last 30 messages (newest first) */
  messages!: MessageResponseDto[];
  /** Total unread count */
  unreadCount!: number;
}

export class WsTypingPayload {
  bookingId!: string;
  userId!: string;
  firstName!: string;
  isTyping!: boolean;
}

export class WsReadReceiptPayload {
  bookingId!: string;
  readerId!: string;
  messageIds!: string[];
  readAt!: Date;
}

export class WsMessageDeletedPayload {
  messageId!: string;
  bookingId!: string;
  deletedAt!: Date;
}

export class WsMessageNotificationPayload {
  bookingId!: string;
  roomId!: string;
  senderId!: string;
  senderName!: string;
  preview!: string; // truncated content or "🎤 Voice message"
}

export class WsErrorPayload {
  event!: string;
  message!: string;
  statusCode?: number;
}