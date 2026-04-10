import { Test, TestingModule } from '@nestjs/testing';
import { TransectionController } from './transection.controller';
import { TransectionService } from './transection.service';

describe('TransectionController', () => {
  let controller: TransectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransectionController],
      providers: [TransectionService],
    }).compile();

    controller = module.get<TransectionController>(TransectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
