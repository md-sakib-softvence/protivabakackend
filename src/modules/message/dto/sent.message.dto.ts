import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";

export class SendMessageDto {
    @ApiProperty()
    @IsString()
    senderId: string;

    @ApiProperty()
    @IsString()
    receiverId: string;

    @ApiProperty({
        example: "Hello"
    })
    @IsString()
    content: string;


    @ApiProperty({ example: "TEXT", description: "Message type: TEXT or AUDIO (Socket)" })
    @IsEnum(["TEXT", "AUDIO"])
    messageType: "TEXT" | "AUDIO";
}