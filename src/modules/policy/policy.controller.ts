import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { policyDto } from './create.policy.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.auth.guard';
import { SuperAdminGuard } from '../../common/guards/admin.guard';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async getPolicy() {
    return await this.policyService.getPolicy();
  }

  @Put('create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async createPolicy(@Body() content: policyDto) {
    return await this.policyService.createPolicy(content.content);
  }
}
