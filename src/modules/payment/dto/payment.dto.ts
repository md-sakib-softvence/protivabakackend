import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreatePaymentDto {
    @ApiProperty({ example: "1234567890", description: " Booking ID for the payment" })
    @IsNotEmpty()
    @IsString()
    bookingId!: string
    @ApiProperty({ example: 1000, description: "Amount of the payment" })
    @IsNotEmpty()
    @IsNumber()
    amount!: number
}