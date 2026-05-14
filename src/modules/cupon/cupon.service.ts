import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCuponDto } from './dto/create.cupon.dto';
import { UpdateCuponDto } from './dto/update.cupon.dto';

@Injectable()
export class CuponService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCuponDto: CreateCuponDto) {
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { couponCode: createCuponDto.couponCode },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        ...createCuponDto,
        currentUselimit: createCuponDto.currentUselimit || 0,
      },
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

  /**
   * Validate a coupon by code (Check expiry, activity, and usage limits)
   */
  async validateCoupon(couponCode: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { couponCode },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is currently inactive');
    }

    // Check expiry
    if (new Date() > new Date(coupon.expireAt)) {
      throw new BadRequestException('This coupon has expired');
    }

    // Check usage limit (if totalUselimit is 0, we treat it as unlimited or handle accordingly)
    // If you want 0 to mean unlimited, keep the check:
    if (coupon.totalUselimit > 0 && coupon.currentUselimit >= coupon.totalUselimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    return coupon;
  }

  /**
   * Use a coupon (Increment usage count)
   */
  async useCoupon(couponCode: string) {
    const coupon = await this.validateCoupon(couponCode);

    return this.prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        currentUselimit: {
          increment: 1,
        },
      },
    });
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
