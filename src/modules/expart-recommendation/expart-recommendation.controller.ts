import { Body, Controller, DefaultValuePipe, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ExpartRecommendationService } from './expart-recommendation.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { SubAdminGuard } from 'src/common/guards/sub.admin.guard';

@Controller('expart-recommendation')
export class ExpartRecommendationController {
  constructor(private readonly expartRecommendationService: ExpartRecommendationService) { }

  @ApiBearerAuth()
  @ApiProperty({ example: "Make Recomendation to Provider (Only Can Provider)" })
  @UseGuards(JwtAuthGuard, SubAdminGuard)
  @Patch('expert-recommendation/:id')
  @ApiOperation({ summary: 'Make or remove expert recommendation' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID (Provider ID)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isRecmmendation: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  async makeExpartCommendation(
    @Param('id') userId: string,
    @Body('isRecmmendation', ParseBoolPipe) isRecmmendation: boolean,
  ) {
    const result =
      await this.expartRecommendationService.makeExpartCommendation(
        userId,
        isRecmmendation,
      );

    return {
      success: true,
      message: isRecmmendation
        ? 'Provider marked as expert recommendation successfully'
        : 'Provider removed from expert recommendation',
      data: result,
    };
  }


  @Get('expert-recommendations')
  @ApiOperation({ summary: 'Get all expert recommended providers' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  async getExpartRecommendation(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result =
      await this.expartRecommendationService.getExpartRecommendation(
        page,
        limit,
      );

    return {
      success: true,
      message: 'Expert recommendations fetched successfully',
      data: result,
    };
  }

}
