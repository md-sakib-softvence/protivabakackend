import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCuponDto } from './dto/create.cupon.dto';
import { UpdateCuponDto } from './dto/update.cupon.dto';

@Injectable()
export class CuponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCuponDto: CreateCuponDto) {
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { couponCode: createCuponDto.couponCode },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: createCuponDto,
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    return coupon;
  }

  async update(id: string, updateCuponDto: UpdateCuponDto) {
    await this.findOne(id); // Ensure it exists

    if (updateCuponDto.couponCode) {
      const existingCoupon = await this.prisma.coupon.findUnique({
        where: { couponCode: updateCuponDto.couponCode },
      });

      if (existingCoupon && existingCoupon.id !== id) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: updateCuponDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.coupon.delete({
      where: { id },
    });
  }
}
