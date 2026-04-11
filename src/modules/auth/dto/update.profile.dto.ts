import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateProfileDto {

    @ApiProperty({ example: "firstName", description: "The name of the field to update (e.g., 'name', 'email', 'phone')", enum: ['firstName', 'lastName', 'email', 'phone', 'bio', 'streetAddress', 'city', 'state', 'zipCode'] })
    @IsNotEmpty()
    @IsString()
    fildName !: string;


    @ApiProperty({ example: "John Doe", description: "The new value for the specified field" })
    @IsNotEmpty()
    @IsString()
    value !: string;

}