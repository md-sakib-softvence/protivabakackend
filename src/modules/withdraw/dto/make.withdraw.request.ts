import { ApiProperty } from '@nestjs/swagger';
import { MobileBankingType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MakeWithdrawRequestCardPaymentDto {

    @ApiProperty({ example: 1000 })
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @ApiProperty({ example: 50 })
    @IsNotEmpty()
    @IsNumber()
    fee: number;

    @ApiProperty({ example: 950 })
    @IsNotEmpty()
    @IsNumber()
    netAmount: number;

    @ApiProperty({ example: "DBBL" })
    @IsNotEmpty()
    @IsString()
    bankName: string;

    @ApiProperty({ example: "1234567890" })
    @IsNotEmpty()
    @IsString()
    accountNumber: string;

    @ApiProperty({ example: "Mohammad Jihad" })
    @IsNotEmpty()
    @IsString()
    accountHolderName: string;

    @ApiProperty({ example: "Dhaka Branch" })
    @IsNotEmpty()
    @IsString()
    branchName: string;

    @ApiProperty({ example: "01700000000" })
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;
}

export class MakeWithdrawRequestMobileBankingDto {

    @ApiProperty({ example: 1000, description: 'Requested withdraw amount' })
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @ApiProperty({ example: 20, description: 'Transaction fee' })
    @IsNotEmpty()
    @IsNumber()
    fee: number;

    @ApiProperty({ example: 980, description: 'Amount after fee deduction' })
    @IsNotEmpty()
    @IsNumber()
    netAmount: number;

    @ApiProperty({ example: '01700000000', description: 'Number that receives the payment' })
    @IsNotEmpty()
    @IsString()
    mobileBankingPaymentTakeNumber: string;

    @ApiProperty({ enum: MobileBankingType, description: 'Type of mobile banking' })
    @IsNotEmpty()
    @IsEnum(MobileBankingType)
    mobileBankingType: MobileBankingType;

    @ApiProperty({ example: '01711111111', description: 'User phone number' })
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;
}