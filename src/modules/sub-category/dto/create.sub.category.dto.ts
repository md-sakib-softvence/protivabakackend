import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateSubCategoryDto {
    @ApiProperty({
        example: 'ckxj2s9x90001abcd1234',
        description: 'Parent category ID',
    })
    @IsString()
    categoryId: string;

    @ApiProperty({
        example: 'Mobile Phones',
        description: 'Sub-category name',
    })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        example: 'All kinds of smartphones',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        example: 'phone-icon',
        description: 'Icon name or icon URL',
    })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional({
        example: 'https://example.com/sub-category.png',
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
