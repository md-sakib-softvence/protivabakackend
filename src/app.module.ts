import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from './modules/category/category.module';
import { SubCategoryModule } from './modules/sub-category/sub-category.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { JobModule } from './modules/job/job.module';
import { BookingModule } from './modules/booking/booking.module';
import { WithdrawModule } from './modules/withdraw/withdraw.module';
import { MessageModule } from './modules/message/message.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import envConfig from './config/env.config';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [envConfig],
    cache: true
  }), AuthModule, UserModule, PrismaModule, CategoryModule, SubCategoryModule, CloudinaryModule, JobModule, BookingModule, WithdrawModule, MessageModule, MarketingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
