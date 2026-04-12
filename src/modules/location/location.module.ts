import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationService } from './location.service';
import { LocationGateway } from './location.gateway';
import { LocationController } from './location.controller';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import { JwtWsGuard } from 'src/common/guards/jwt-ws.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

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
  controllers: [LocationController],
  providers: [LocationService, LocationGateway, RoomAccessGuard, JwtWsGuard],
  exports: [LocationService],
})
export class LocationModule {}