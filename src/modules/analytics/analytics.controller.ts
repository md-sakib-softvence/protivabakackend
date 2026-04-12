import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';
import { GetUser } from 'src/common/decorators';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiOperation({summary : "Sub Admin Analytics"})
  @Get("sub-admin-dashboard")
  async subAdminDashboard(@GetUser("id") userId: string) {
    const result = await this.analyticsService.subAdminDashboardAnalytics(userId);

    return result;
  }

}
