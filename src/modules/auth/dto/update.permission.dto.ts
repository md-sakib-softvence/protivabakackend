import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class UpdatePermissionDto {

    @ApiProperty({ example: 'userId' })
    @IsNotEmpty()
    @IsString()
    userId!: string;

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

    // transaction
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

    // marketing
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isViewManageMarketing!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isManageMarketing!: boolean;

    // marketing
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isJobView!: boolean;
    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    isJobManage!: boolean;

}