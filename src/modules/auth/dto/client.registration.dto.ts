import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ClientRegistrationDto {
    @ApiProperty({ description: 'The first name of the client', example: 'John' })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({ description: 'The last name of the client', example: 'Doe' })
    @IsNotEmpty()
    @IsString()
    lastName: string;
    @ApiProperty({ description: 'The email of the client', example: 'john.doe@example.com' })
    @IsNotEmpty()
    @IsString()
    email: string;
    @ApiProperty({ description: 'The password of the client', example: 'password123' })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiProperty({ description: 'The phone number of the client', example: '+1234567890' })
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({ description: 'The city of the client', example: 'New York' })
    @IsNotEmpty()
    @IsString()
    city: string;

}