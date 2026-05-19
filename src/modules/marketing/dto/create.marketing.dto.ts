import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMarketingDto {
    @ApiProperty({ description: 'Carpentry & Woodwork', example: "Carpentry & Woodwork" })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ description: "Boost your business with our powerful solutions designed to increase growth, improve customer engagement, and deliver outstanding results. Join us today and take your brand to the next level.", example: "Boost your business with our powerful solutions designed to increase growth, improve customer engagement, and deliver outstanding results. Join us today and take your brand to the next level." })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: "https://link.pro.fake.com", example: "https://link.pro.fake.com" })
    @IsString()
    @IsOptional()
    link?: string;

    @ApiProperty({ description: "Start date in ISO format (YYYY-MM-DD)", example: "2026-03-25T10:30:00Z" })
    @IsString()
    @IsOptional()
    startDate?: string;


    @ApiProperty({ description: "End date in ISO format (YYYY-MM-DD)", example: "2026-03-25T10:30:00Z" })
    @IsString()
    @IsOptional()
    endDate?: string
}




// model Marketing {
//   id           String       @id @default(cuid())
//   title        String
//   description  String?
//   image        String
//   link         String?
//   targetRole   String?
//   startDate    DateTime
//   endDate      DateTime
//   status       BannerStatus @default(DRAFT)
//   impressions  Int          @default(0)
//   clicks       Int          @default(0)
//   displayOrder Int          @default(0)
//   isActive     Boolean      @default(true)
//   createdAt    DateTime     @default(now())
//   updatedAt    DateTime     @updatedAt

//   @@index([status, startDate, endDate])
//   @@map("marketing")
// }