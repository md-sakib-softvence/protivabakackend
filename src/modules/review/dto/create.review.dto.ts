import { IsString, IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({ example: "booking-1222" })
    @IsString()
    @IsNotEmpty()
    bookingId!: string;

    @ApiProperty({ example: "providerId-1222" })
    @IsString()
    @IsNotEmpty()
    receiverId!: string;

    @ApiProperty({ example: "jobId-1222" })
    @IsString()
    @IsNotEmpty()
    jobId!: string;

    @ApiProperty({ example: "image", type: "string", format: "binary" })
    @IsString()
    @IsOptional()
    image?: string;

    @ApiProperty({ example: 3 })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    rating!: number;

    @ApiProperty({ example: "Good" })
    @IsString()
    @IsNotEmpty()
    comment!: string;
}