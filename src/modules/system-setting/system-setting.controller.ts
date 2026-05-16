import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SystemSettingService } from './system-setting.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SuperAdminGuard } from 'src/common/guards/admin.guard';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

@ApiTags('System Setting')
@Controller('system-setting')
export class SystemSettingController {
  constructor(private readonly systemSettingService: SystemSettingService) { }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Find Platform fee setting (Only Super Admin)' })
  async getAllSettings() {
    const data = await this.systemSettingService.getAllSettings();
    return {
      success: true,
      message: 'System settings retrieved successfully',
      data
    };
  }

  @Patch('update')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Update a system setting (Only Super Admin)' })
  async updateSetting(
    @Body() updateDto: UpdateSystemSettingDto
  ) {
    const data = await this.systemSettingService.updateSetting("platform_fee", updateDto.value);
    return {
      success: true,
      message: 'System setting updated successfully',
      data
    };
  }
}
