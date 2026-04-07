import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { UserStatus } from '@prisma/client';
import { GetUser } from 'src/common/decorators';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @Get("all-provider")
  @ApiOperation({
    summary: 'Get all providers with pagination, search and verification filter (Only Can Admin)',
  })

  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'rahim' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
  })

  @ApiResponse({
    status: 200,
    description: 'Providers fetched successfully',
  })
  async getAllProviders(
    @GetUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    const result = await this.userService.getAllProvider(userId, page, limit, search, status);

    return {
      success: true,
      message: "All Provider Retrived Successfully",
      data: result
    }
  }

  @Patch("verified-provider")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Provider Verification Successfully (Only Can Admin)"
  })
  @ApiQuery({ name: "providerId" })
  async updateProviderVerificationStatus(@Query("providerId") userId: string) {
    const result = await this.userService.providerVerificationStatusUpdate(userId, "VERIFIED");

    return {
      success: true,
      message: "Provider Verification Successfully",
      data: result
    }

  }


  @Patch("reject-provider")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Provider rejected successfully (Only Can Admin)"
  })
  @ApiQuery({ name: "providerId" })
  async rejectProvider(@Query("providerId") userId: string) {
    const result = await this.userService.providerVerificationStatusUpdate(userId, "REJECTED");

    return {
      success: true,
      message: "Provider reject Successfully",
      data: result
    }

  }



  @Get("get-all-user")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiOperation({
    summary: 'Get all user with pagination, search and verification filter (Only Can Admin)',
  })

  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: '' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', "DELETED"],
  })
  async getAllUser(
    @GetUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
  ) {
    const result = await this.userService.getAllUser(userId, page, limit, search, status);

    return {
      success: true,
      message: "All Provider Retrived Successfully",
      data: result
    }
  }


  @Get(':providerId')
  @ApiOperation({ summary: "Single provider with (Service & Review)" })
  async getSingleProviderWithReviewAndService(@Param('providerId') providerId: string) {
    return this.userService.getSingleProviderWithReviewAndService(providerId);
  }

  @Patch("delete-user")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiOperation({
    summary: "Delete user (Only Can Admin)"
  })
  @ApiQuery({ name: "userId" })
  async deleteUser(@GetUser("id") adminUserId: string, @Query("userId") userId: string) {
    console.log(`Admin User ID: ${adminUserId}, User ID to Delete: ${userId}`); // Debug log
    const result = await this.userService.deleteUser(adminUserId, userId);

    return {
      success: true,
      message: "User deleted successfully",
      data: result
    };
  }
}
