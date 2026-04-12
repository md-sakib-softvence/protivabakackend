import { Module } from '@nestjs/common';
import { ExpartRecommendationService } from './expart-recommendation.service';
import { ExpartRecommendationController } from './expart-recommendation.controller';

@Module({
  controllers: [ExpartRecommendationController],
  providers: [ExpartRecommendationService],
})
export class ExpartRecommendationModule {}
