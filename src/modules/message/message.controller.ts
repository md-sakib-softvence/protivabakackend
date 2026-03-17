import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MessageService } from './message.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendMessageDto } from './dto/sent.message.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { GetUser } from 'src/common/decorators';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }


  @Post('send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a message to a receiver' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async sendMessage(@Body() dto: SendMessageDto, @GetUser('id') userId: string,) {
    const { receiverId, content, messageType } = dto;

    const message = await this.messageService.createMessage(userId, receiverId, content, messageType);

    return {
      status: 'success',
      message: 'Message sent successfully',
      data: message
    };
  }




}
