import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppVersionConfigService } from './app-version-config.service';
import { UpdateAppVersionConfigDto } from './dto/update-app-version-config.dto';

@ApiTags('App Version Config')
@Controller('app-version-config')
export class AppVersionConfigController {
  constructor(private readonly appVersionConfigService: AppVersionConfigService) {}

  @Get('/find')
  @ApiOperation({ summary: 'Get or create App Version Config by unique key' })
  async getAppVersionConfig() {
    const data = await this.appVersionConfigService.getAppVersionConfig("default");
    return {
      success: true,
      data,
    };
  }

  @Patch('/update')
  @Put('/update')
  @ApiOperation({ summary: 'Update App Version Config (creates if not exists)' })
  async updateAppVersionConfig(
    @Body() updateDto: UpdateAppVersionConfigDto,
  ) {
    const data = await this.appVersionConfigService.updateAppVersionConfig(
      "default",
      updateDto,
    );
    return {
      success: true,
      data,
    };
  }
}
