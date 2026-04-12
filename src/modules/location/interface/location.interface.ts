import { TrackingRole } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// CORE DOMAIN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ILocationPoint {
  id: string;
  bookingId: string;
  userId: string;
  role: TrackingRole;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  altitude?: number | null;
  timestamp: Date;
  createdAt: Date;
}

export interface ITrackingState {
  bookingId: string;
  client?: ILocationPoint | null;
  provider?: ILocationPoint | null;
  /** Straight-line Haversine distance in metres. Null if either position unknown. */
  distanceMeters?: number | null;
  /** ETA in minutes. Null if speed unavailable or positions unknown. */
  etaMinutes?: number | null;
  calculatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE METHOD INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface IUpdateLocationParams {
  userId: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
}

export interface IGetLocationHistoryParams {
  userId: string;
  bookingId: string;
  role?: TrackingRole;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ILocationHistoryResult {
  bookingId: string;
  role?: TrackingRole;
  points: ILocationPoint[];
  totalPoints: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY CACHE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/** Key format: `{bookingId}:{userId}` */
export type LocationCacheKey = string;

export interface ILocationCache {
  get(key: LocationCacheKey): ILocationPoint | undefined;
  set(key: LocationCacheKey, point: ILocationPoint): void;
  delete(key: LocationCacheKey): void;
  clear(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Server → Client: full state after tracking:join or location:current */
export interface IWsTrackingStateEvent {
  bookingId: string;
  client?: ILocationPoint | null;
  provider?: ILocationPoint | null;
  distanceMeters?: number | null;
  etaMinutes?: number | null;
  calculatedAt: Date;
}

/** Server → Client: broadcast after each location:update */
export interface IWsLocationBroadcastEvent {
  bookingId: string;
  updatedBy: string;
  point: ILocationPoint;
  state: IWsTrackingStateEvent;
}

/** Server → Client: tracking session joined */
export interface IWsTrackingJoinedEvent {
  bookingId: string;
  state: IWsTrackingStateEvent;
}

/** Server → Client: tracking session left */
export interface IWsTrackingLeftEvent {
  bookingId: string;
}