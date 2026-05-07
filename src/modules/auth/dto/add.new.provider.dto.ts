import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsEmail,
    IsNotEmpty,
    MinLength,
    MaxLength
} from 'class-validator';

export class AddNewProviderDto {

    @ApiProperty({ example: 'Jihad' })
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @ApiProperty({ example: 'Hasan' })
    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @ApiProperty({ example: 'jihad@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ example: '01712345678' })
    @IsString()
    @IsNotEmpty()
    phone!: string;

    @ApiProperty({ example: 'Dhaka' })
    @IsString()
    @IsNotEmpty()
    city!: string;

    @ApiProperty({ example: 'StrongPass123' })
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiProperty({ example: '1234567890' })
    @IsString()
    @IsNotEmpty()
    nidNumber!: string;


    @ApiProperty({ example: 'Dhaka City' })
    @IsString()
    @IsNotEmpty()
    serviceLocation!: string;

    @ApiProperty({ example: '3 years' })
    @IsString()
    @IsNotEmpty()
    yearOfExprience!: string;

    @ApiProperty({ example: 'I am a professional cleaner with 3 years experience' })
    @IsString()
    bio!: string;
};