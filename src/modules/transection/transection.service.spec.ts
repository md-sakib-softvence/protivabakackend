import { Test, TestingModule } from '@nestjs/testing';
import { TransectionService } from './transection.service';

describe('TransectionService', () => {
  let service: TransectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransectionService],
    }).compile();

    service = module.get<TransectionService>(TransectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
