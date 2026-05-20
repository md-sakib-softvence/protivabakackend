import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString } from "class-validator";

const optionalTrimmedString = ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export class CreateMarketingDto {
    @ApiPropertyOptional({ description: 'Carpentry & Woodwork', example: "Carpentry & Woodwork" })
    @Transform(optionalTrimmedString)
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: "Boost your business with our powerful solutions designed to increase growth, improve customer engagement, and deliver outstanding results. Join us today and take your brand to the next level.", example: "Boost your business with our powerful solutions designed to increase growth, improve customer engagement, and deliver outstanding results. Join us today and take your brand to the next level." })
    @Transform(optionalTrimmedString)
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: "https://link.pro.fake.com", example: "https://link.pro.fake.com" })
    @Transform(optionalTrimmedString)
    @IsOptional()
    @IsString()
    link?: string;

    @ApiPropertyOptional({ description: "Start date in ISO format (YYYY-MM-DD)", example: "2026-03-25T10:30:00Z" })
    @Transform(optionalTrimmedString)
    @IsOptional()
    @IsDateString()
    startDate?: string;


    @ApiPropertyOptional({ description: "End date in ISO format (YYYY-MM-DD)", example: "2026-03-25T10:30:00Z" })
    @Transform(optionalTrimmedString)
    @IsOptional()
    @IsDateString()
    endDate?: string
}




// model Marketing {
//   id           String       @id @default(cuid())
//   title        String?
//   description  String?
//   image        String
//   link         String?
//   targetRole   String?
//   startDate    DateTime?
//   endDate      DateTime?
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
