import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { GetUser } from 'src/common/decorators';
import { CreateReviewDto } from './dto/create.review.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { memoryStorage } from 'multer';

@ApiTags('Review')
@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly cloudinaryService: CloudinaryUploadService
  ) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("give-review")
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit a review for a booking' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        receiverId: { type: 'string' },
        jobId: { type: 'string' },
        rating: { type: 'number' },
        comment: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['bookingId', 'receiverId', 'jobId', 'rating', 'comment'],
    },
  })
  async giveReview(
    @GetUser('id') userId: string,
    @Body() data: CreateReviewDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file) {
      const uploadedImage: any = await this.cloudinaryService.uploadImageFromBuffer(
        file.buffer,
        'reviews',
        `review-${userId}-${Date.now()}`
      );
      data.image = uploadedImage.secure_url;
    }

    const result = await this.reviewService.createReview(userId, data);
    return {
      success: true,
      message: 'Review submitted successfully',
      result
    }
  }
}
