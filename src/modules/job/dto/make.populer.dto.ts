import { IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class MakePopularDto {
    @ApiProperty({ example: true })
    @Type(() => Boolean)
    @IsBoolean()
    isPopuler!: boolean;
}