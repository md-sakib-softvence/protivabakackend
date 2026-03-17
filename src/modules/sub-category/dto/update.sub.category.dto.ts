import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSubCategoryDto {
  @ApiPropertyOptional({ example: 'Mobile Phones' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'All kinds of smartphones' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'phone-icon', description: 'Icon name or URL' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: 'https://example.com/sub-category.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
