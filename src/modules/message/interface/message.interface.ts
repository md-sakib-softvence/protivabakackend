import { MessageType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// CORE DOMAIN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface IMessageSender {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: string;
}

export interface IMessageMetadata {
  bookingId: string;
  roomId: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  /** Audio/video duration in seconds */
  duration?: number;
  /** ID of the message this is a reply to */
  replyToId?: string;
}

export interface IMessage {
  id: string;
  bookingId: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  replyToId?: string | null;
  replyTo?: IReplyPreview | null;
  isRead: boolean;
  readAt?: Date | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender: IMessageSender;
}

export interface IReplyPreview {
  id: string;
  content?: string;
  messageType: MessageType;
  senderName: string;
}

export interface IConversationRoom {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  isActive: boolean;
  expiresAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationSummary {
  roomId: string;
  bookingId: string;
  serviceName: string;
  participant: IMessageSender;
  lastMessage?: Partial<IMessage> | null;
  unreadCount: number;
  isActive: boolean;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE METHOD INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ISaveMessageParams {
  senderId: string;
  receiverId: string;
  bookingId: string;
  content?: string;
  messageType: MessageType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  replyToId?: string;
}

export interface IGetMessagesParams {
  bookingId: string;
  userId: string;
  limit?: number;
  cursor?: string; // ISO date string of oldest message client has
  type?: MessageType;
}

export interface IMarkReadResult {
  readCount: number;
  messageIds: string[];
}

export interface IMediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Server → Client: new message broadcast to room */
export interface IWsNewMessageEvent {
  message: IMessage;
}

/** Server → Client: push notification to offline/background user */
export interface IWsMessageNotificationEvent {
  bookingId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  preview: string;
}

/** Server → Client: typing indicator */
export interface IWsTypingEvent {
  bookingId: string;
  userId: string;
  firstName: string;
  isTyping: boolean;
}

/** Server → Client: read receipt */
export interface IWsReadReceiptEvent {
  bookingId: string;
  readerId: string;
  messageIds: string[];
  readAt: Date;
}

/** Server → Client: message soft-deleted */
export interface IWsMessageDeletedEvent {
  messageId: string;
  bookingId: string;
  deletedAt: Date;
}

/** Server → Client: room joined confirmation with history */
export interface IWsRoomJoinedEvent {
  roomId: string;
  bookingId: string;
  messages: IMessage[];
  unreadCount: number;
}

/** Server → Client: error response */
export interface IWsError {
  event: string;
  message: string;
  statusCode?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface IPaginatedMessages {
  messages: IMessage[];
  hasMore: boolean;
  nextCursor?: string; // ISO date string to pass as cursor for next page
  total?: number;
}


// Add this before the last closing brace or at the very bottom

export interface MessagePayload {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId: string;
  roomId: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  replyToId?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  sender: IMessageSender;
}

export interface IConversationSummary {
  roomId: string;
  bookingId: string;
  serviceName: string;
  participant: IMessageSender;
  lastMessage?: Partial<IMessage> | null;   // or MessagePayload
  unreadCount: number;
  isActive: boolean;
  updatedAt: Date;
}

export interface ConversationSummary {
  roomId: string;
  bookingId: string;
  serviceName: string;
  participant: IMessageSender;
  lastMessage?: MessagePayload | null;     // Use MessagePayload here
  unreadCount: number;
  isActive: boolean;
  updatedAt: Date;
}