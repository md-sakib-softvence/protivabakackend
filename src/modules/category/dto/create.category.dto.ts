import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        example: 'Information Technology',
        description: 'Category name',
    })
    @IsString()
    name: string;

    // @ApiProperty({
    //     example: 'information-technology',
    //     description: 'Unique URL-friendly slug',
    // })
    // @IsString()
    // slug: string;

    @ApiPropertyOptional({
        example: 'All IT related jobs and services',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        example: 'it-icon',
        description: 'Icon name or icon URL',
    })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional({
        example: 'https://example.com/category.png',
    })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    isActive?: boolean;
}
