import { Module } from '@nestjs/common';
import { CuponService } from './cupon.service';
import { CuponController } from './cupon.controller';

@Module({
  controllers: [CuponController],
  providers: [CuponService],
})
export class CuponModule {}
