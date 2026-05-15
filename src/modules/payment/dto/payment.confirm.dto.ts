import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentConfirmDto {
    @ApiProperty({
        description: 'The validation ID of the payment',
        example: 'def456',
    })
    @IsString()
    @IsOptional()
    val_id?: string;

    @ApiProperty({
        description: 'The transaction ID of the payment',
        example: 'ghi789',
    })
    @IsString()
    @IsOptional()
    tran_id?: string;

    @ApiProperty({
        description: 'The amount of the payment',
        example: 100,
    })
    @IsNumber()
    @IsNotEmpty()
    amount: number;
}