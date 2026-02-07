import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create.job.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { UpdateJobDto } from './dto/update.job.dto';
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

        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createJob(
    @Body() data: CreateJobDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
    },
    @GetUser('id') userId: string,
  ) {
    return this.jobService.createJob(data, userId, files?.images);
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



  @Patch(':job_id/update-job')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update Job (Provider) Not Conplite This Route'
  })
  @ApiParam({
    name: 'job_id',
    description: 'Job ID',
    example: 'cmlbqxr2m000024vnmq3pqeaj',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Job title',
          example: 'Senior Web Developer'
        },
        description: {
          type: 'string',
          description: 'Job description',
          example: 'Looking for an experienced developer with 5+ years experience'
        },
        basePrice: {
          type: 'number',
          description: 'Job base price',
          example: 100
        },
        priceType: {
          type: 'string',
          enum: ['FIXED', 'HOURLY', 'NEGOTIABLE'],
          description: 'Pricing model',
          example: 'FIXED'
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'DELETED'],
          description: 'Job status',
          example: 'ACTIVE'
        },
        categoryId: {
          type: 'string',
          description: 'Category ID',
          example: 'cat_123456'
        },
        subCategoryId: {
          type: 'string',
          description: 'Sub-category ID',
          example: 'subcat_123456'
        },
        includeService: {
          type: 'string',
          description: 'Full array to replace existing services (JSON string or comma-separated)',
          example: '["Logo Design","Business Card","Brand Identity"]'
        },
        includeServiceRemove: {
          type: 'string',
          description: 'Services to remove from existing list (JSON string or comma-separated)',
          example: '["Old Service 1","Old Service 2"]'
        },
        removedImages: {
          type: 'string',
          description: 'Image URLs to remove from existing list (JSON string or comma-separated)',
          example: '["https://example.com/old-image1.jpg","https://example.com/old-image2.jpg"]'
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Upload new images (max 10)',
        },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  async updateJob(
    @Param('job_id') jobId: string,
    @Body() body: UpdateJobDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @GetUser('id') userId: string,
  ) {
    return this.jobService.updateJob(jobId, body, files?.images, userId);
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




}
