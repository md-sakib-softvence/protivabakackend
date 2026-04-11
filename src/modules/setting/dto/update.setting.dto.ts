import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateUserSettingDto {

    @ApiProperty({ example: true, description: "Whether the user's contact information is public" })
    @IsNotEmpty()
    @IsBoolean()
    isContactInfoPublic !: boolean;

    @ApiProperty({ example: true, description: "Whether the user's profile is public" })
    @IsNotEmpty()
    @IsBoolean()
    isProfilePublic !: boolean;

    @ApiProperty({ example: true, description: "Whether notifications are enabled for the user" })
    @IsNotEmpty()
    @IsBoolean()
    isNotificationEnabled !: boolean;

    @ApiProperty({ example: true, description: "Whether booking reminders are enabled for the user" })
    @IsNotEmpty()
    @IsBoolean()
    isBookingReminderEnabled !: boolean;

}