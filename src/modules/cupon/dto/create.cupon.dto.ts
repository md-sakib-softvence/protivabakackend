import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCuponDto {
  @ApiProperty({
    example: 'SAVE20',
    description: 'Unique coupon code',
  })
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @ApiProperty({
    example: 20,
    description: 'Discount percentage (1-100)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Status of the coupon',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 100,
    description: 'Total use limit of the coupon',
  })
  @IsInt()
  totalUselimit: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Current use limit of the coupon',
  })
  @IsOptional()
  @IsInt()
  currentUselimit?: number;

  @ApiProperty({
    example: '2025-12-31T23:59:59',
    description: 'Coupon expiry date',
  })
  @Type(() => Date)
  @IsDate()
  expireAt: Date;
}
