import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsArray
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PriceType, JobStatus } from '@prisma/client';

export class CreateJobDto {
    @ApiProperty()
    @IsString()
    categoryId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    subCategoryId?: string;

    @ApiProperty()
    @IsString()
    title: string;


    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty({ example: 100.0 })
    @Type(() => Number)
    @IsNumber()
    basePrice: number;

    @ApiProperty({ enum: PriceType })
    @IsEnum(PriceType)
    priceType: PriceType;

    //   @ApiPropertyOptional({ type: Object })
    //   @IsOptional()
    //   features?: any;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];


    @ApiPropertyOptional({
        type: [String],
        example: ['Fast delivery', 'Source code included'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value
            : typeof value === 'string'
                ? value.split(',').map(v => v.trim())
                : [],
    )
    includeService?: string[];

    //   @ApiPropertyOptional({ type: [String] })
    //   @IsOptional()
    //   @IsArray()
    //   @IsString({ each: true })
    //   videos?: string[];

    @ApiPropertyOptional({ enum: JobStatus, default: JobStatus.DRAFT })
    @IsOptional()
    @IsEnum(JobStatus)
    status?: JobStatus;
}