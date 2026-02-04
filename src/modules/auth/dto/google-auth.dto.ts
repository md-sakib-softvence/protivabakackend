import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google OAuth token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}