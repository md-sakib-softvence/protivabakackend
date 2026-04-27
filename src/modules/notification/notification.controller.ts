import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.auth.guard';
import { GetUser } from '../../common/decorators';
import { ToggleNotificationDto } from './dto/toggle.notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get('get-my-ntg')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "My notification" })
  async myAllNotification(@GetUser('id') userId: string) {
    const result = await this.notificationService.getMyNotification(userId);
    return result
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') notificationId: string) {
    return await this.notificationService.isReadUpdate(notificationId);
  }

  @Patch('notification-on-off')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async toggleNotification(@GetUser() user: any, @Body() dto: ToggleNotificationDto) {
    return await this.notificationService.toggleNotification(user.id, dto);
  }

}
