import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { MessageController } from './message.controller';
import { RoomAccessGuard } from 'src/common/guards/room-access.guard';
import { JwtWsGuard } from 'src/common/guards/jwt-ws.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('env')?.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway, RoomAccessGuard, JwtWsGuard],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}