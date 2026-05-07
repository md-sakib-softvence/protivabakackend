import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

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
}
