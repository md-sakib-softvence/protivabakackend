import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { ProviderGuard } from 'src/common/guards/provider.guard';
import { GetUser } from 'src/common/decorators';
import { BookingCompliteInProgress, BookingStatus } from '@prisma/client';
import { ClientGuard } from 'src/common/guards/client.guard';
import { CreteBookingDto } from './dto/create.booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @Get("all-booking")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all bookings with pagination, status filter, and search (Only Can Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 10)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by bookingNumber, serviceName or serviceDescription' })
  async getAllBookings(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('status') status?: "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REFUNDED",
    @Query('search') search?: string,
  ) {
    const result = await this.bookingService.getAllBooking(page, limit, status, search);

    return {
      success: true,
      message: "All Booking Retrived Successfully",
      data: result
    }
  }



  @Patch(':bookingId/status/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiOperation({ summary: 'Provider updates booking status (Only Can ACCEPTED Or REJECTED)' })
  @ApiParam({ name: 'bookingId', type: 'string', description: 'Booking ID' })
  @ApiParam({
    name: 'status',
    enum: ['ACCEPTED', 'REJECTED'],
    description: 'Booking status to update'
  })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully.' })
  async updateBookingStatus(
    @Param('bookingId') bookingId: string,
    @Param('status') status: "ACCEPTED" | "REJECTED",
    @GetUser("id") userId: string
  ) {
    const result = await this.bookingService.bookingStatusUpdate(bookingId, userId, status);

    return {
      success: true,
      message: `Booking ${status} Successfully`,
      data: result
    }

  }

  @Get("my-all-booking")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ClientGuard)
  @ApiOperation({ summary: "My all booking (Only Can User)" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  @ApiQuery({ name: "status", required: false, enum: BookingStatus })
  async myAllBooking(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: BookingStatus
  ) {

    return this.bookingService.myBooking(
      userId,
      Number(page),
      Number(limit),
      status
    );
  }


  @Post("make-booking")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ClientGuard)
  @ApiOperation({ summary: "Book a service (Only Can CLIENT)" })
  async makeBooking(@GetUser("id") userId: string, @Body() dto: CreteBookingDto) {
    const result = await this.bookingService.makeBooking(userId, dto);
    return {
      success: true,
      message: "Thank You! We’ve sent your booking details to Provider",
      data: result
    }

  }



  @Patch(':bookingId/complete-inprogress/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Booking Status Update (Complete or InProgress)' })
  @ApiParam({ name: 'bookingId', type: 'string', description: 'Booking ID' })
  @ApiParam({
    name: 'status',
    enum: BookingCompliteInProgress,
    description: 'Booking status to update'
  })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully.' })
  async bookingCompliteInProgress(
    @Param('bookingId') bookingId: string,
    @Param('status') status: BookingCompliteInProgress,
    @GetUser("id") userId: string
  ) {

    const result = await this.bookingService.bookingCompliteInProgress(
      userId,
      bookingId,
      status
    );

    return {
      success: true,
      message: `Booking ${status} Successfully`,
      data: result
    };
  }


  @Get('recent-bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Recent All Booking (Provider)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Recent bookings fetched successfully' })
  async recentAllBooking(
    @GetUser("id") userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {

    const result = await this.bookingService.recentAllBooking(
      userId,
      Number(page),
      Number(limit)
    );

    return {
      success: true,
      message: "Recent bookings fetched successfully",
      ...result
    };
  }

}
