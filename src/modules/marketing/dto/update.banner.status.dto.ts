import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { BannerStatus } from "@prisma/client";

export class UpdateBannerStatusDto {
  @ApiProperty({ 
    description: "Status of the banner", 
    enum: BannerStatus, 
    example: BannerStatus.ACTIVE 
  })
  @IsEnum(BannerStatus, { message: "Status must be one of DRAFT, ACTIVE, INACTIVE" })
  status: BannerStatus;
}