import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class policyDto {
    @ApiProperty({ description: 'The content of the policy', example: 'This is the policy content.' })
    @IsNotEmpty()
    @IsString()
    content!: string;
    }   