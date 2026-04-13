import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';
import { GetUser } from 'src/common/decorators';
import { SuperAdminGuard } from '../../common/guards/admin.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiOperation({ summary: "Sub Admin Analytics" })
  @Get("sub-admin-dashboard")
  async subAdminDashboard(@GetUser("id") userId: string) {
    const result = await this.analyticsService.subAdminDashboardAnalytics(userId);

    return result;
  };

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: "Super Admin Dashboard (Only Can Super Admin)" })
  @ApiOperation({ summary: "Super Admin Analytics" })
  @Get("super-admin-dashboard")
  async superAmdinDashboardData() {
    const result = await this.analyticsService.superAdminDashboardAnalytics();

    return result;
  };


}
