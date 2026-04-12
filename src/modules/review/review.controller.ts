import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { GetUser } from 'src/common/decorators';
import { CreateReviewDto } from './dto/create.review.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("give-review")
  async giveReview(@GetUser('id') userId: string, @Body() data: CreateReviewDto) {
    const result = await this.reviewService.createReview(userId, data);
    return {
      success: true,
      result
    }

  }

}
