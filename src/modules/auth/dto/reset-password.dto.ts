import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}