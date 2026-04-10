import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TransectionService } from './transection.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';

@Controller('transection')
export class TransectionController {
  constructor(private readonly transectionService: TransectionService) { }


  @Get('all-transections')
  @ApiOperation({ summary: "All Transection Here (Only Can Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllTransection(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.transectionService.getAllTransection(
      Number(page),
      Number(limit),
    );
  }

}
