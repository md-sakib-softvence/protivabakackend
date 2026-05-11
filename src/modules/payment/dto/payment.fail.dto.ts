import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum PaymentFailStatus {
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

export class PaymentFailDto {
    @ApiProperty({
        description: 'The transaction ID of the payment',
        example: 'abc123',
    })
    @IsString()
    @IsNotEmpty()
    transactionId!: string;

    @ApiProperty({
        description: 'The status of the payment failure',
        enum: PaymentFailStatus,
        example: PaymentFailStatus.FAILED,
    })
    @IsEnum(PaymentFailStatus)
    status!: PaymentFailStatus;

    @ApiProperty({
        description: 'The reason for the payment failure',
        example: 'Insufficient funds',
    })
    @IsString()
    @IsOptional()
    reason?: string;
}