import { Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { ProviderGuard } from 'src/common/guards/provider.guard';
import { GetUser } from 'src/common/decorators';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @Get("all-booking")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all bookings with pagination, status filter, and search' })
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


  

}
