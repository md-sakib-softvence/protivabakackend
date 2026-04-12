import { Test, TestingModule } from '@nestjs/testing';
import { ExpartRecommendationService } from './expart-recommendation.service';

describe('ExpartRecommendationService', () => {
  let service: ExpartRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpartRecommendationService],
    }).compile();

    service = module.get<ExpartRecommendationService>(ExpartRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
