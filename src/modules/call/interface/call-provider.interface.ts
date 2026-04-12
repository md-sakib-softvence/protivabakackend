import { CallProvider, CallType, CallStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// PLUGGABLE PROVIDER CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every call provider (WebRTC, Agora, Twilio, etc.) must implement this interface.
 * The CallGateway and CallService depend only on this — never on a concrete provider.
 * Swap providers by changing CALL_PROVIDER_TYPE in .env.
 */
export interface ICallProvider {
  /** Human-readable name, matches the CallProvider enum value */
  readonly name: string;

  /**
   * Create a call room/channel.
   * For WebRTC: allocates a unique signaling channel name.
   * For Agora: creates an Agora channel and returns the caller's RTC token.
   * For Twilio: creates a Twilio Room and returns a caller access token.
   */
  createRoom(params: ICreateRoomParams): Promise<ICallRoomResult>;

  /**
   * Generate an access token for a user to join an existing room.
   * For WebRTC: returns a simple base64 session marker (auth already done via JWT).
   * For Agora: returns a signed RTC token valid for 1 hour.
   * For Twilio: returns a Twilio AccessToken with VideoGrant.
   */
  generateToken(roomId: string, userId: string): Promise<string>;

  /**
   * Destroy / end a room.
   * For WebRTC: no-op (peers tear down RTCPeerConnection themselves).
   * For Agora: optionally stop cloud recording if enabled.
   * For Twilio: calls the REST API to complete the room.
   */
  endRoom(roomId: string): Promise<void>;
}

export interface ICreateRoomParams {
  bookingId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
}

export interface ICallRoomResult {
  /** Unique room/channel identifier */
  roomId: string;
  /** Token for the caller (null for WebRTC) */
  callerToken?: string | null;
  /** Provider-specific extra data (e.g. Agora appId) */
  metadata?: Record<string, any>;
}

/** DI injection token — import this to inject the active provider */
export const CALL_PROVIDER = 'CALL_PROVIDER';

// ─────────────────────────────────────────────────────────────────────────────
// CORE DOMAIN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ICallSession {
  id: string;
  bookingId: string;
  callerId: string;
  calleeId: string;
  roomId: string;
  provider: CallProvider;
  type: CallType;
  status: CallStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
  duration?: number | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE METHOD INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface IInitiateCallParams {
  callerId: string;
  bookingId: string;
  calleeId: string;
  type: CallType;
}

export interface IInitiateCallResult {
  sessionId: string;
  roomId: string;
  provider: string;
  type: CallType;
  callerToken?: string | null;
  calleeToken?: string | null;
}

export interface IAcceptCallResult {
  sessionId: string;
  roomId: string;
  token?: string | null;
}

export interface IEndCallResult {
  roomId: string;
  duration: number;
  endedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Emitted to caller after call:initiate succeeds */
export interface IWsCallInitiatedEvent {
  sessionId: string;
  roomId: string;
  provider: string;
  type: CallType;
  callerToken?: string | null;
}

/** Emitted to callee when they receive an incoming call */
export interface IWsCallIncomingEvent {
  sessionId: string;
  roomId: string;
  bookingId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  type: CallType;
  provider: string;
  token?: string | null;
}

/** Emitted to caller after callee accepts */
export interface IWsCallAcceptedEvent {
  calleeId: string;
  calleeName: string;
  roomId: string;
}

/** Emitted to caller after callee rejects */
export interface IWsCallRejectedEvent {
  calleeId: string;
  roomId: string;
}

/** Emitted to both parties when call ends */
export interface IWsCallEndedEvent {
  endedBy: string;
  duration: number;
  roomId: string;
}

/** Emitted when a participant disconnects unexpectedly */
export interface IWsParticipantLeftEvent {
  userId: string;
  roomId: string;
  reason: 'disconnected' | 'network_error';
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBRTC SIGNALING EVENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface IWsSdpOffer {
  from: string;
  roomId: string;
  signal: { type: 'offer'; sdp: string };
}

export interface IWsSdpAnswer {
  from: string;
  roomId: string;
  signal: { type: 'answer'; sdp: string };
}

export interface IWsIceCandidate {
  from: string;
  roomId: string;
  signal: {
    candidate: string;
    sdpMid: string;
    sdpMLineIndex: number;
  };
}