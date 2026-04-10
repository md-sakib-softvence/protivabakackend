import { Module } from '@nestjs/common';
import { TransectionService } from './transection.service';
import { TransectionController } from './transection.controller';

@Module({
  controllers: [TransectionController],
  providers: [TransectionService],
})
export class TransectionModule {}
