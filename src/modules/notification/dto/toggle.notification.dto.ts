import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class ToggleNotificationDto {
  @ApiProperty({ description: 'Enable or disable notifications', example: true })
  @IsNotEmpty()
  @IsBoolean()
  enabled: boolean;
}