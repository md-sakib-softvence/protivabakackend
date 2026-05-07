import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CuponService } from './cupon.service';
import { CreateCuponDto } from './dto/create.cupon.dto';
import { UpdateCuponDto } from './dto/update.cupon.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SuperAdminGuard } from 'src/common/guards/admin.guard';

@ApiTags('Cupon')
@Controller('cupon')
export class CuponController {
  constructor(private readonly cuponService: CuponService) {}

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new coupon (Super Admin Only)' })
  async create(@Body() createCuponDto: CreateCuponDto) {
    const data = await this.cuponService.create(createCuponDto);
    return {
      success: true,
      message: 'Coupon created successfully',
      data,
    };
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all coupons' })
  async findAll() {
    const data = await this.cuponService.findAll();
    return {
      success: true,
      message: 'Coupons retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.cuponService.findOne(id);
    return {
      success: true,
      message: 'Coupon retrieved successfully',
      data,
    };
  }

  @Patch('update/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Update a coupon (Super Admin Only)' })
  async update(@Param('id') id: string, @Body() updateCuponDto: UpdateCuponDto) {
    const data = await this.cuponService.update(id, updateCuponDto);
    return {
      success: true,
      message: 'Coupon updated successfully',
      data,
    };
  }

  @Delete('delete/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Delete a coupon (Super Admin Only)' })
  async remove(@Param('id') id: string) {
    await this.cuponService.remove(id);
    return {
      success: true,
      message: 'Coupon deleted successfully',
    };
  }
}
