import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateSystemSettingDto {
  @ApiProperty({ example: 10, description: 'The value of the system setting' })
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
