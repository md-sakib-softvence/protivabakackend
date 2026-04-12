import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AppleAuthDto {
  @ApiProperty({ description: 'Apple OAuth token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}