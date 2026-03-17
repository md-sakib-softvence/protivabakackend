import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { SubCategoryService } from './sub-category.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSubCategoryDto } from './dto/create.sub.category.dto';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SuperAdminGuard } from 'src/common/guards/admin.guard';
import { UpdateSubCategoryDto } from './dto/update.sub.category.dto';
import { memoryStorage } from 'multer';


@ApiTags("Sub Category")
@Controller('sub-category')
@ApiBearerAuth()
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService, private readonly cloudinaryService: CloudinaryUploadService) { }

  @Post("create")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'icon', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Sub-category create (Only Can Do Super Admin)"
  })
  @ApiBody({
    description: 'Create a sub-category with optional image and icon',
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        isActive: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
      required: ['categoryId', 'name'],
    },
  })
  async createSubCategory(
    @Body() body: CreateSubCategoryDto,
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {

    if (files.image?.[0]) {
      const uploadedImage: any = await this.cloudinaryService.uploadImageFromBuffer(
        files.image[0].buffer,
        'sub-categories',
        files.image[0].originalname,
      );
      body.image = uploadedImage.secure_url;
    }

    if (files.icon?.[0]) {
      const uploadedIcon: any = await this.cloudinaryService.uploadImageFromBuffer(
        files.icon[0].buffer,
        'sub-category-icons',
        files.icon[0].originalname,
      );
      body.icon = uploadedIcon.secure_url;
    }

    return this.subCategoryService.createSubCategory(body);
  }


  @Patch(':sub_ctg_id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Sub-category Update (Only Can Do Super Admin)"
  })
  @ApiBody({
    description: 'Update sub-category with optional image and icon',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        isActive: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  async updateSubCategory(
    @Param('sub_ctg_id') sub_ctg_id: string,
    @Body() body: UpdateSubCategoryDto,
    @UploadedFiles()
    files?: { image?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const updateBody: UpdateSubCategoryDto = {};

    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        updateBody[key] = value;
      }
    });


    if (files?.image && files.image.length > 0) {
      const image = files.image[0];
      const uploadedImage: any =
        await this.cloudinaryService.uploadImageFromBuffer(
          image.buffer,
          'sub-categories',
          image.originalname,
        );
      updateBody.image = uploadedImage.secure_url;
    }

    if (files?.icon && files.icon.length > 0) {
      const icon = files.icon[0];
      const uploadedIcon: any =
        await this.cloudinaryService.uploadImageFromBuffer(
          icon.buffer,
          'sub-category-icons',
          icon.originalname,
        );
      updateBody.icon = uploadedIcon.secure_url;
    }

    const data = await this.subCategoryService.updateSubCategory(sub_ctg_id, updateBody);
    return {
      success: true,
      data
    }
  }


  @Delete(":sub-categoryId/deete")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({
    summary: "Sub-category Delete (Only Can Do Super Admin)"
  })
  async deleteCategory(@Param("sub-categoryId") Id: string) {
    const result = await this.subCategoryService.deleteSubCategory(Id);

    return {
      success: true,
      data: result
    }

  }

  @Get('/sub-category/:subCategoryId')
  @ApiOperation({ summary: "All job under sub category" })
  async subCategoryUnderAllCategory(
    @Param('subCategoryId') subCategoryId: string,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.subCategoryService.subCategoryUnderAllCategory(
      subCategoryId,
      page,
      limit,
    );
  }

}
