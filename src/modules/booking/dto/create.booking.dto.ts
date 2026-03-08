import { ApiProperty } from "@nestjs/swagger";
import { ServiceLocation } from "@prisma/client";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreteBookingDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: "123" })
    providerId: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: "123" })
    jobId: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: "Car Service" })
    serviceName: string;


    @ApiProperty({
        example: "2026-03-10T10:00:00.000Z",
        description: "Preferred booking date"
    })
    @IsNotEmpty()
    @IsDateString()
    preferredDate?: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: "10 AM" })
    preferredTime: string;


    @ApiProperty({
        enum: ServiceLocation,
        example: ServiceLocation.CUSTOMER_LOCATION
    })
    @IsEnum(ServiceLocation)
    serviceLocation: ServiceLocation;


    @ApiProperty({
        example: 23.8103,
        description: "Location latitude"
    })
    @IsNumber()
    locationLatitude: number;


    @ApiProperty({
        example: 90.4125,
        description: "Location longitude"
    })
    @IsNumber()
    locationLongitude: number;


    @ApiProperty({
        example: "House 12, Road 5, Dhanmondi, Dhaka"
    })
    @IsString()
    locationDetails: string;


    @ApiProperty({
        example: "+8801712345678"
    })
    @IsString()
    contactPhone: string;


    @ApiProperty({
        example: 500
    })
    @IsNumber()
    serviceAmount: string;


    @ApiProperty({
        example: "Please arrive in the morning."
    })
    @IsString()
    message: string;

}