import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  UploadedFile,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create.job.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { UpdateJobDtoPro } from './dto/update.job.dto';
import { ProviderGuard } from 'src/common/guards/provider.guard';
@ApiTags("Job")
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post("create-job")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Job Only Can Do (Provider)" })
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string' },
        subCategoryId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        basePrice: { type: 'number' },
        priceType: {
          type: 'string',
          enum: ['FIXED', 'HOURLY'],
        },
        includeService: {
          type: 'array',
          items: {
            type: 'string',
            example: 'Fast delivery',
          },
        },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['categoryId', 'subCategoryId', 'title', 'description', 'basePrice', 'priceType', 'includeService', 'image'],
    },
  })
  @UseInterceptors(
    FileInterceptor('image')
  )
  async createJob(
    @Body() data: CreateJobDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser('id') userId: string,
  ) {
    if (!image) {
      throw new BadRequestException("Image is required");
    }

    return this.jobService.createJob(data, userId, image);
  }

  @Get(":jobId/single-job")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get Single Job" })
  async getSingleJob(
    @Query("jobId") jobId: string
  ) {

    const result = await this.jobService.getSingleJob(jobId);

    return {
      success: true,
      data: result
    }

  }

  @Patch(":jobId/update-jon-content")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  async updateJobContent(@GetUser('id') userId: string, @Param("jobId") jobId: string, @Body() data: UpdateJobDtoPro) {
    const result = await this.jobService.updateJObContent(userId, jobId, data)

    return {
      success: true,
      message: "Job update successfully",
      data: result
    }

  }

  @Get('home-jobs')
  @ApiOperation({ summary: 'Get all jobs for user homepage' })
  @ApiQuery({ name: 'isPopuler', required: false, type: Boolean, example: true, description: 'Filter only popular jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page' })
  async getAllJobForUserHomePage(
    @Query('isPopuler', new DefaultValuePipe(false), ParseBoolPipe) isPopuler: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.jobService.getAllJobForUserHomePage(
      isPopuler,
      page,
      limit,
    );

    return {
      success: true,
      data: result
    }

  }


  @Patch(':jobId/update/thumbnail')
  @ApiOperation({ summary: 'Update job thumbnail' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'jobId',
    type: String,
    description: 'Job ID'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @UseInterceptors(FileInterceptor('thumbnail'))
  async updateJobThumbnail(
    @GetUser('id') userId: string,
    @Param('jobId') jobId: string,
    @UploadedFile() thumbnail: Express.Multer.File
  ) {

    return this.jobService.updateJObThumbnail(
      userId,
      jobId,
      thumbnail
    );
  }

  @Get('my-job')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'My All Job (Only Can Do Provider)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Number of jobs per page' })
  async getMyAllJob(
    @GetUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.jobService.getMyAllJob(userId, Number(page), Number(limit));
  }


  @Get('my-active-job')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'My All Active Job (Only Can Do Provider)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Number of jobs per page' })
  async getMyActiveJob(
    @GetUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.jobService.getAllActiveJob(userId, Number(page), Number(limit));
  }

  @Get(':jobId/single-job-with-review')
  async singleJobWithReview(@Param('jobId') jobId: string) {
    return this.jobService.singleJobWithReview(jobId);
  }

  @Patch('make-populer/:id')
  @ApiOperation({summary : "Make Populer Job (Only Can Admin)"})
  async makePopuler(
    @Param('id') jobId: string,
    @Body('isPopuler', ParseBoolPipe) isPopuler: boolean,
  ) {
    await this.jobService.makePopuler(jobId, isPopuler);

    return {
      success: true,
      message: `Job ${isPopuler ? 'marked as popular' : 'removed from popular'}`,
    };
  }

}
