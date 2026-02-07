import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Base price', example: 100 })
  @IsOptional()
  @Type(() => Number)   // << convert string -> number
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Full includeService array to replace',
  })
  @IsOptional()
  @Type(() => String)   // << ensure array items are string
  @IsArray()
  @IsString({ each: true })
  includeService?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Remove selected includeService items',
  })
  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsString({ each: true })
  includeServiceRemove?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Remove selected old image URLs',
  })
  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsString({ each: true })
  removedImages?: string[];
}
