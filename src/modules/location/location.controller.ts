import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';

import { LocationService } from './location.service';

import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { GetCurrentLocationDto, GetLocationHistoryDto } from './dto/location.dto';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // GET /location/current?bookingId=xxx
  @Get('current')
  async getCurrentLocations(
    @Req() req: any,
    @Query() dto: GetCurrentLocationDto,
  ) {
    return this.locationService.getCurrentLocations(dto.bookingId, req.user.id);
  }

  // GET /location/history?bookingId=xxx&role=PROVIDER&limit=100
  @Get('history')
  async getLocationHistory(
    @Req() req: any,
    @Query() dto: GetLocationHistoryDto,
  ) {
    return this.locationService.getLocationHistory(req.user.id, dto);
  }
}