import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsNumber,
    IsArray,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PriceType, JobStatus } from '@prisma/client';

export class CreateJobDto {
    @ApiProperty()
    @IsNotEmpty({ message: 'categoryId is required' })
    @IsString({ message: 'categoryId must be a string' })
    categoryId: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'subCategoryId is required' })
    @IsString({ message: 'subCategoryId must be a string' })
    subCategoryId: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'title is required' })
    @IsString({ message: 'title must be a string' })
    title: string;


    @ApiProperty()
    @IsNotEmpty({ message: 'description is required' })
    @IsString({ message: 'description must be a string' })
    description: string;

    @ApiProperty({ example: 100.0 })
    @IsNotEmpty({ message: 'basePrice is required' })
    @Type(() => Number)
    @IsNumber({}, { message: 'basePrice must be a number' })
    @Min(0, { message: 'basePrice must be a positive number' })
    basePrice: number;

    @ApiProperty({ enum: PriceType })
    @IsNotEmpty({ message: 'priceType is required' })
    @IsEnum(PriceType, { message: `priceType must be one of: ${Object.values(PriceType).join(', ')}` })
    priceType: PriceType;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];


    @ApiProperty({
        type: [String],
        example: ['Fast delivery', 'Source code included'],
    })
    @IsNotEmpty({ message: 'includeService is required' })
    @IsArray({ message: 'includeService must be an array' })
    @IsString({ each: true, message: 'each service must be a string' })
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value
            : typeof value === 'string'
                ? value.split(',').map(v => v.trim())
                : [],
    )
    includeService: string[];

    @ApiProperty({ enum: JobStatus, default: JobStatus.DRAFT })
    @IsNotEmpty({ message: 'status is required' })
    @IsEnum(JobStatus, { message: `status must be one of: ${Object.values(JobStatus).join(', ')}` })
    status: JobStatus;
}