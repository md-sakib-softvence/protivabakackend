import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { WithdrawalStatus } from '@prisma/client';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) { }

  @Get("get-all")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({summary : "All withdraw list (Only Can Admin Do)"})
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  @ApiQuery({ name: "search", required: false, example: "" })
  @ApiQuery({ name: "status", required: false, enum: WithdrawalStatus, example: "" })
  async getAllWithdraw(
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 15,
    @Query("search") search?: string,
    @Query("status") status?: WithdrawalStatus) {

    const result = await this.withdrawService.getAllWithdrow(page, limit, search, status);

    return {
      success: true,
      message: "Withdraw Retrived Success",
      data: result
    }

  }



}
