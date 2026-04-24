import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.auth.guard';
import { GetUser } from '../../common/decorators';

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

}
