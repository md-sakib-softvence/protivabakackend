import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ICallProvider, ICreateRoomParams, ICallRoomResult } from '../interface/call-provider.interface';

@Injectable()
export class WebRtcCallProvider implements ICallProvider {
  readonly name = 'WEBRTC';

  async createRoom(params: ICreateRoomParams): Promise<ICallRoomResult> {
    // For pure WebRTC, we just create a unique signaling room ID
    const roomId = `webrtc_${params.bookingId}_${uuid()}`;

    return {
      roomId,
      // callerToken is optional for WebRTC (we rely on JWT)
      callerToken: null,
    };
  }

  async generateToken(roomId: string, userId: string): Promise<string> {
    // Simple base64 token (clients can decode if needed)
    const payload = { roomId, userId, ts: Date.now() };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async endRoom(roomId: string): Promise<void> {
    // No server-side cleanup needed for pure WebRTC
    // Clients will close RTCPeerConnection themselves
  }
}