import { Module } from '@nestjs/common';
import { AppVersionConfigService } from './app-version-config.service';
import { AppVersionConfigController } from './app-version-config.controller';

@Module({
  controllers: [AppVersionConfigController],
  providers: [AppVersionConfigService],
})
export class AppVersionConfigModule {}
