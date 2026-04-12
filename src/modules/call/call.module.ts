import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';
import { WebRtcCallProvider } from './providers/webrtc.provider';
import { AgoraCallProvider } from './providers/agora.provider';

import { JwtWsGuard } from 'src/common/guards/jwt-ws.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CALL_PROVIDER } from './interface/call-provider.interface';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('env')?.JWT_SECRET,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    CallService,
    CallGateway,
    JwtWsGuard,
    WebRtcCallProvider,
    AgoraCallProvider,
    // ── Pluggable provider factory ──────────────────────────────────────────
    // Set CALL_PROVIDER_TYPE=AGORA in .env to switch to Agora.
    // Add more providers here without touching CallService or CallGateway.
    {
      provide: CALL_PROVIDER,
      useFactory: (
        config: ConfigService,
        webrtc: WebRtcCallProvider,
        agora: AgoraCallProvider,
      ) => {
        const type = config.get('env')?.CALL_PROVIDER_TYPE ?? 'WEBRTC';
        const map: Record<string, any> = { WEBRTC: webrtc, AGORA: agora };
        return map[type] ?? webrtc;
      },
      inject: [ConfigService, WebRtcCallProvider, AgoraCallProvider],
    },
  ],
  exports: [CallService],
})
export class CallModule {}