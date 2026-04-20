import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class AdminUserDto {
    // User Info

    @ApiProperty({ example: 'John' })
    @IsNotEmpty()
    @IsString()
    firstName!: string;
    @ApiProperty({ example: 'Doe' })
    @IsNotEmpty()
    @IsString()
    lastName!: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    @IsNotEmpty()
    @IsString()
    email!: string;
    @ApiProperty({ example: '+8801234567890' })
    @IsNotEmpty()
    @IsString()
    phone!: string;
    @ApiProperty({ example: 'StrongPass123!' })
    @IsNotEmpty()
    @IsString()
    password!: string;

    // Booking
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewBooking!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageBooking!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isExportBooking!: boolean;

    // Provider
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewProvider!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageProvider!: boolean;

    // User
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewUser!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageUser!: boolean;

    // Category
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewCategory!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageCategory!: boolean;

    // transection
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewTransaction!: boolean;

    // withdrawal
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewWithdrawal!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageWithdrawal!: boolean;

    // job
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isJobView!: boolean;

    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isJobManage!: boolean;

};