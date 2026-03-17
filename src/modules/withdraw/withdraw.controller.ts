import { Body, Controller, Get, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { ApiBasicAuth, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { WithdrawalStatus } from '@prisma/client';
import { GetUser } from 'src/common/decorators';
import { ProviderGuard } from 'src/common/guards/provider.guard';
import { MakeWithdrawRequestCardPaymentDto, MakeWithdrawRequestMobileBankingDto } from './dto/make.withdraw.request';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) { }

  @Get("get-all")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "All withdraw list (Only Can Admin Do)" })
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

  @Get("get-my-all-withdraw")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "All My withdraw list (Only Can Own Profile)" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  @ApiQuery({ name: "status", required: false, enum: WithdrawalStatus, example: "" })
  async getMyAllWithdrawList(
    @GetUser("id") userId: string,
    @Query("page", ParseIntPipe) page: number,
    @Query("limit", ParseIntPipe) limit: number,
    @Query("status") status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED",

  ) {

    const result = await this.withdrawService.getMyWithdraw(userId, page, limit, status)

    return {
      success: true,
      message: "My all withdraw",
      data: result
    }

  }


  @Patch('approve-withdraw')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Approve Withdraw Request (Only Can Do Admin)"
  })
  @ApiQuery({ name: "withdrawId", required: true })
  async approveWithdrawRequest(
    @Query("withdrawId") id: string
  ) {

    const result = await this.withdrawService.approveWithdrawRequest(id);

    return {
      success: true,
      message: "Withdraw Request Approved",
      data: result
    }

  }


  @Patch('reject-withdraw')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Reject Withdraw Request (Only Can Do Admin)"
  })
  @ApiQuery({ name: "withdrawId", required: true })
  async rejectWithdrawRequest(
    @Query("withdrawId") id: string
  ) {

    const result = await this.withdrawService.approveWithdrawRequest(id);

    return {
      success: true,
      message: "Withdraw Request Rejected",
      data: result
    }

  }

  @Get("provider-wallet")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiOperation({ summary: "Povider Wallet" })
  async getProviderWallet(@GetUser("id") userId: string) {
    const result = await this.withdrawService.providerWallet(userId);

    return {
      success: true,
      data: result
    }

  }
  @Get("cart-withdraw-request")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiOperation({ summary: "My All Withdraw Request" })
  async cartWithdrawRequest(@GetUser("id") userId: string) {
    const result = await this.withdrawService.providerWallet(userId);

    return {
      success: true,
      data: result
    }

  }

  @Post('card')
  @ApiOperation({ summary: 'Request withdraw using bank card (On' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiResponse({
    status: 201,
    description: 'Withdraw request created successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or insufficient balance'
  })
  async makeCardWithdrawRequest(
    @GetUser('id') userId: string,
    @Body() data: MakeWithdrawRequestCardPaymentDto
  ) {
    return this.withdrawService.makeCardWithdrawRequest(userId, data);
  }

  @Post('mobile-banking')
  @ApiOperation({ summary: 'Request withdraw using mobile banking' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiResponse({
    status: 201,
    description: 'Withdraw request created successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or insufficient balance'
  })
  async makeMobileBankingWithdrawRequest(
    @GetUser('id') userId: string,
    @Body() data: MakeWithdrawRequestMobileBankingDto
  ) {
    return this.withdrawService.makeIBankingWithdrawRequest(userId, data);
  }





}

