import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateMarketingDto } from './dto/create.marketing.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateMarketingDto } from './dto/update.marketing.dto';
import { UpdateBannerStatusDto } from './dto/update.banner.status.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) { }

  @Post("create")
  @ApiOperation({
    summary: "Create marketing banner (Only Can Super Admin)"
  })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", example: "Carpentry & Woodwork" },
        description: { type: "string", example: "Boost your business..." },
        link: { type: "string", example: "https://link.pro.fake.com" },
        startDate: { type: "string", example: "2026-03-25T10:30:00Z" },
        endDate: { type: "string", example: "2026-03-25T10:30:00Z" },
        image: {
          type: "string",
          format: "binary"
        }
      }
    }
  })
  @UseInterceptors(FileInterceptor("image"))
  async createMerketingBanner(
    @UploadedFile() image: Express.Multer.File,
    @Body() data: CreateMarketingDto
  ) {
    const result = await this.marketingService.createBanner(image, data);

    return {
      success: true,
      message: "Banner posted success",
      data: result
    };
  }


  @Put("update/:id")
  @ApiOperation({
    summary: "Update marketing banner (Only Can Super Admin)"
  })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", example: "Updated Title" },
        description: { type: "string", example: "Updated description" },
        link: { type: "string", example: "https://link.com" },
        startDate: { type: "string", example: "2026-03-25T10:30:00Z" },
        endDate: { type: "string", example: "2026-03-25T10:30:00Z" },
        image: {
          type: "string",
          format: "binary"
        }
      }
    }
  })
  @UseInterceptors(FileInterceptor("image"))
  async updateMarketingBanner(
    @Param("id") id: string,
    @UploadedFile() image: Express.Multer.File,
    @Body() data: UpdateMarketingDto
  ) {
    const result = await this.marketingService.updateBanner(id, image, data);

    return {
      success: true,
      message: "Banner updated successfully",
      data: result
    };
  }

  @Patch("update-status/:id")
  @ApiOperation({ summary: "Update marketing banner status (Only Can Super Admin)" })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  async updateBannerStatus(
    @Param("id") id: string,
    @Body() body: UpdateBannerStatusDto
  ) {
    const updated = await this.marketingService.updateBannerStatus(id, body.status);

    return {
      success: true,
      message: "Banner status updated successfully",
      data: updated,
    };
  }

  @Delete("delete/:id")
  @ApiOperation({ summary: "Delete marketing banner by ID (Only Can Super Admin)" })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiParam({ name: "id", description: "Banner ID to delete", example: "ckl123abc456" })
  async deleteBanner(@Param("id") id: string) {
    const result = await this.marketingService.deleteBanner(id);

    return {
      success: true,
      message: "Banner deleted successfully",
      data: result,
    };
  };


  @Get("admin/dashboard")
  @ApiOperation({ summary: "Get all banners for admin dashboard with stats & pagination (Only Can Super Admin)" })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @ApiQuery({ name: "page", required: false, type: Number, example: 1, description: "Page number (default 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10, description: "Number of banners per page (default 10)" })
  async getAllBannerForAdminDashboard(
    @Query("page", new ParseIntPipe({ optional: true })) page: number = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    const result = await this.marketingService.getAllBannerForAdminDashboard(page, limit);

    return {
      success: true,
      message: "Banners fetched successfully",
      ...result
    };
  };


  @Get("user/banners")
  @ApiOperation({ summary: "Get all banners for users with pagination" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1, description: "Page number" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10, description: "Number of banners per page" })
  async getAllBannerForUser(
    @Query("page", new ParseIntPipe({ optional: true })) page: number = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    const result = await this.marketingService.getAllBannerForUser(page, limit);

    return {
      success: true,
      message: "Banners fetched successfully",
      ...result
    };
  }

}
