import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateCategoryDto } from './dto/create.category.dto';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SuperAdminGuard } from 'src/common/guards/admin.guard';
import { UpdateCategoryDto } from './dto/update.category.dto';

@ApiTags("Category")
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService, private readonly cloudinaryService: CloudinaryUploadService) { }

  @Post("create")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'icon', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Create Category (Only Can Super Admin)"
  })
  @ApiBody({
    description: 'Create a category with optional image and icon',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        isActive: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
      required: ['name'],
    },
  })
  async createCategory(
    @Body() body: CreateCategoryDto,
    @UploadedFiles() files: { image?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    if (files.image?.[0]) {
      const uploadedImage = await this.cloudinaryService.uploadImageFromBuffer(
        files.image[0].buffer,
        'categories',
        `category-${Date.now()}`,
      );
      body.image = (uploadedImage as any).secure_url;
    }

    if (files.icon?.[0]) {
      const uploadedIcon = await this.cloudinaryService.uploadImageFromBuffer(
        files.icon[0].buffer,
        'category-icons',
        `icon-${Date.now()}`,
      );
      body.icon = (uploadedIcon as any).secure_url;
    }

    return this.categoryService.createCategory(body);
  }



  @Patch(':ctg_id')
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
    summary: "Update Category (Only Can Super Admin)"
  })
  @ApiBody({
    description: 'Update category with optional image and icon',
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
  async updateCategory(
    @Param('ctg_id') ctg_id: string,
    @Body() body: UpdateCategoryDto,
    @UploadedFiles()
    files?: { image?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const updateBody: UpdateCategoryDto = {};

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
          'categories',
          image.originalname,
        );
      updateBody.image = uploadedImage.secure_url;
    }

    if (files?.icon && files.icon.length > 0) {
      const icon = files.icon[0];
      const uploadedIcon: any =
        await this.cloudinaryService.uploadImageFromBuffer(
          icon.buffer,
          'category-icons',
          icon.originalname,
        );
      updateBody.icon = uploadedIcon.secure_url;
    }

    const data = await this.categoryService.updateCategory(ctg_id, updateBody);

    return {
      success: true,
      data,
    };
  }

  @Get("all-categoris-for-user")
  @ApiOperation({ summary: 'Get all categories (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 15 })
  async getAllCategory(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 15,
  ) {
    console.log("C-1")
    const result = await this.categoryService.ClientHomeCategory(page, limit);

    return {
      success: true,
      data: result
    }

  }

  @Get(':categoryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single category by id' })
  async getSingleCategory(
    @Param('categoryId') categoryId: string,
  ) {
    const data = await this.categoryService.getSingleCategory(categoryId);
    return {
      success: true,
      data,
    };
  }






  @Get('sub-categories/:categoryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sub-categories of a category (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 15 })
  async getAllSubCategoryByCategoryId(
    @Param('categoryId') categoryId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 15,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ) {
    const data =
      await this.categoryService.getAllSubCategoryByCategoryId(categoryId, page, limit);

    return {
      success: true,
      data,
    };
  }

  @Delete("deete/:categoryId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({
    summary: "Category Delete (Only Can Do Super Admin)"
  })
  async deleteCategory(@Param("categoryId") categoryId: string) {
    const result = await this.categoryService.deleteCategory(categoryId);

    return {
      success: true,
      data: result
    }

  }

}
