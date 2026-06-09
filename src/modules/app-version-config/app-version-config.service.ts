import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAppVersionConfigDto } from './dto/update-app-version-config.dto';

@Injectable()
export class AppVersionConfigService implements OnModuleInit {
  private readonly DEFAULT_CONFIG_KEY = 'default';

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    console.log('Checking AppVersionConfig on module init...');
    await this.getAppVersionConfig(this.DEFAULT_CONFIG_KEY);
  }

  async getAppVersionConfig(appConfigKey: string) {
    const config = await this.prisma.appVersionConfig.findUnique({
      where: { appConfigKey },
    });

    if (config) {
      return config;
    }

    // Create a new document if it doesn't exist
    return this.prisma.appVersionConfig.create({
      data: {
        appConfigKey,
        androidLatestVersion: '1.1.0',
        androidMinRequiredVersion: '1.1.0',
        androidForceUpdate: false,
        iosLatestVersion: '1.1.0',
        iosMinRequiredVersion: '1.1.0',
        iosForceUpdate: false,
        androidStoreUrl: '',
        iosStoreUrl: '',
      },
    });
  }

  async updateAppVersionConfig(
    appConfigKey: string,
    updateDto: UpdateAppVersionConfigDto,
  ) {
    // Ensure the config exists, or create default
    await this.getAppVersionConfig(appConfigKey);

    return this.prisma.appVersionConfig.update({
      where: { appConfigKey },
      data: updateDto,
    });
  }
}
