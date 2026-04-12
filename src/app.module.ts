import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoryModule } from './modules/category/category.module';
import { SubCategoryModule } from './modules/sub-category/sub-category.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { JobModule } from './modules/job/job.module';
import { BookingModule } from './modules/booking/booking.module';
import { WithdrawModule } from './modules/withdraw/withdraw.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { PaymentModule } from './modules/payment/payment.module';

import envConfig, { IEnv } from './config/env.config';
import { EmailModule } from './common/email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { LocationModule } from './modules/location/location.module';
import { MessageModule } from './modules/message/message.module';
import { CallModule } from './modules/call/call.module';
import { ReviewModule } from './modules/review/review.module';
import { ExpartRecommendationModule } from './modules/expart-recommendation/expart-recommendation.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: ['.env', '.env.development', '.env.production'],
      cache: true,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<IEnv, true>) => {
        const env = configService.get<IEnv>('env', { infer: true });

        return {
          secret: env?.JWT_SECRET,
          signOptions: {
            expiresIn: env?.JWT_EXPIRES_IN as any,
          },
        };
      },
      inject: [ConfigService],
      global: true,
    }),
    AuthModule,
    UserModule,
    PrismaModule,
    CategoryModule,
    SubCategoryModule,
    CloudinaryModule,
    JobModule,
    BookingModule,
    WithdrawModule,
    EmailModule,
    MarketingModule,
    PaymentModule,
    LocationModule,
    MessageModule,
    CallModule,
    ReviewModule,
    AnalyticsModule,
    ExpartRecommendationModule
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
