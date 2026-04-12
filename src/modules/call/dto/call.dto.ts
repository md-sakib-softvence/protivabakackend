import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { CallType, CallStatus, CallProvider } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WebSocket: call:initiate
 * Caller sends this to start a call.
 */
export class InitiateCallDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsNotEmpty()
  calleeId!: string;

  @IsEnum(CallType)
  @IsOptional()
  type?: CallType = CallType.VOICE;
}

/**
 * WebSocket: call:accept
 * Callee sends this to accept an incoming call.
 */
export class AcceptCallDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * WebSocket: call:reject
 */
export class RejectCallDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * WebSocket: call:end
 * Either participant can end the call.
 */
export class EndCallDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * WebSocket: signal:offer / signal:answer / signal:ice
 * Pure relay — server never inspects `signal` payload.
 */
export class CallSignalDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  /**
   * For signal:offer / signal:answer → { type: 'offer'|'answer', sdp: string }
   * For signal:ice → { candidate: string, sdpMid: string, sdpMLineIndex: number }
   */
  @IsObject()
  signal!: Record<string, any>;
}

export class JoinCallDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

/**
 * Used in call:reject and call:end
 */
export class CallActionDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class CallSessionDto {
  id!: string;
  bookingId!: string;
  callerId!: string;
  calleeId!: string;
  roomId!: string;
  provider!: CallProvider;
  type!: CallType;
  status!: CallStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
  /** Duration in seconds (set when call ends) */
  duration?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class InitiateCallResponseDto {
  sessionId!: string;
  roomId!: string;
  provider!: CallProvider;
  type!: CallType;
  /** Token for caller (null for WebRTC — auth handled by JWT) */
  callerToken?: string | null;
}

export class AcceptCallResponseDto {
  sessionId!: string;
  roomId!: string;
  /** Token for callee (null for WebRTC) */
  token?: string | null;
}

export class EndCallResponseDto {
  roomId!: string;
  duration!: number;
  endedAt!: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENT PAYLOADS (server → client)
// ─────────────────────────────────────────────────────────────────────────────

export class WsCallInitiatedPayload {
  sessionId!: string;
  roomId!: string;
  provider!: CallProvider;
  type!: CallType;
  callerToken?: string | null;
}

/**
 * Sent to the callee when they receive an incoming call.
 */
export class WsCallIncomingPayload {
  sessionId!: string;
  roomId!: string;
  bookingId!: string;
  callerId!: string;
  callerName!: string;
  callerAvatar?: string | null;
  type!: CallType;
  provider!: CallProvider;
  /** Callee's token (for Agora). Null for WebRTC. */
  token?: string | null;
}

export class WsCallAcceptedPayload {
  calleeId!: string;
  calleeName!: string;
  roomId!: string;
}

export class WsCallRejectedPayload {
  calleeId!: string;
  roomId!: string;
}

export class WsCallEndedPayload {
  endedBy!: string;
  duration!: number;
  roomId!: string;
}

export class WsCallParticipantLeftPayload {
  userId!: string;
  roomId!: string;
  reason!: 'disconnected' | 'network_error';
}

/**
 * Relayed WebRTC SDP offer (caller → server → callee)
 */
export class WsSignalOfferPayload {
  from!: string;
  roomId!: string;
  signal!: { type: 'offer'; sdp: string };
}

/**
 * Relayed WebRTC SDP answer (callee → server → caller)
 */
export class WsSignalAnswerPayload {
  from!: string;
  roomId!: string;
  signal!: { type: 'answer'; sdp: string };
}

/**
 * Relayed ICE candidate (either direction)
 */
export class WsSignalIcePayload {
  from!: string;
  roomId!: string;
  signal!: { candidate: string; sdpMid: string; sdpMLineIndex: number };
}