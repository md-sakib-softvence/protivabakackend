import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { SettingService } from './setting.service';
import { GetUser } from 'src/common/decorators';
import { UpdateUserSettingDto } from './dto/update.setting.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update-user-settings')
  async updateUserSettings(@GetUser() user: any, @Body() settingsData: UpdateUserSettingDto) {
    const userId = user.id;
    const result = await this.settingService.updateUserSettings(userId, settingsData);
    return {
      message: 'User settings updated successfully',
      data: result
    };
  }

}
