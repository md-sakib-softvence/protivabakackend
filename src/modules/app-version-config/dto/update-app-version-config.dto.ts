import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAppVersionConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  androidLatestVersion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  androidMinRequiredVersion?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  androidForceUpdate?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  iosLatestVersion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  iosMinRequiredVersion?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  iosForceUpdate?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  androidStoreUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  iosStoreUrl?: string;
}
