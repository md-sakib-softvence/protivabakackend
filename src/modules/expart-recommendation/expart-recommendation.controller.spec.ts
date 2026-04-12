import { Test, TestingModule } from '@nestjs/testing';
import { ExpartRecommendationController } from './expart-recommendation.controller';
import { ExpartRecommendationService } from './expart-recommendation.service';

describe('ExpartRecommendationController', () => {
  let controller: ExpartRecommendationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpartRecommendationController],
      providers: [ExpartRecommendationService],
    }).compile();

    controller = module.get<ExpartRecommendationController>(ExpartRecommendationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
