import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { ICallProvider, ICreateRoomParams, ICallRoomResult } from '../interface/call-provider.interface';

/**
 * Agora.io provider implementation.
 * To fully activate: npm install agora-token
 * Then uncomment and use the real token generation logic.
 */
@Injectable()
export class AgoraCallProvider implements ICallProvider {
  private readonly logger = new Logger(AgoraCallProvider.name);

  readonly name = 'AGORA';

  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(private readonly config: ConfigService) {
    this.appId = config.get('env')?.AGORA_APP_ID ?? '';
    this.appCertificate = config.get('env')?.AGORA_APP_CERTIFICATE ?? '';
  }

  async createRoom(params: ICreateRoomParams): Promise<ICallRoomResult> {
    const channelName = `booking_${params.bookingId}_${uuid().slice(0, 8)}`;

    // Generate token for caller
    const callerToken = await this.generateToken(channelName, params.callerId);

    this.logger.log(`Agora room created: ${channelName} for booking ${params.bookingId}`);

    return {
      roomId: channelName,
      callerToken,
      metadata: { 
        appId: this.appId,
        provider: 'AGORA'
      },
    };
  }

  async generateToken(roomId: string, userId: string): Promise<string> {
    if (!this.appId || !this.appCertificate) {
      this.logger.warn('Agora credentials not configured. Using placeholder token.');
      return `agora_placeholder_${roomId}_${userId}`;
    }

    /**
     * TODO: Replace with real Agora token generation when you install agora-token
     * 
     * import { RtcTokenBuilder, RtcRole } from 'agora-token';
     * 
     * const expireTime = 3600; // 1 hour
     * const currentTime = Math.floor(Date.now() / 1000);
     * const privilegeExpireTime = currentTime + expireTime;
     * 
     * return RtcTokenBuilder.buildTokenWithUid(
     *   this.appId,
     *   this.appCertificate,
     *   roomId,
     *   parseInt(userId) || 0,        // Agora expects numeric UID
     *   RtcRole.PUBLISHER,
     *   privilegeExpireTime,
     * );
     */

    // Placeholder for now
    return `agora_token_${roomId}_${userId}_${Date.now()}`;
  }

  async endRoom(roomId: string): Promise<void> {
    // Agora channels are automatically cleaned up when all users leave
    // You can add cloud recording stop logic here in the future
    this.logger.log(`Agora room ended: ${roomId}`);
  }
}