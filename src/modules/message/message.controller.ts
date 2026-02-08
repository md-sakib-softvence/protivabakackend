import { Body, Controller, Post } from '@nestjs/common';
import { MessageService } from './message.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendMessageDto } from './dto/sent.message.dto';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }


  @Post('send')
  @ApiOperation({ summary: 'Send a message to a receiver' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async sendMessage(@Body() dto: SendMessageDto) {
    const { senderId, receiverId, content, messageType } = dto;

    const message = await this.messageService.createMessage(senderId, receiverId, content, messageType);

    return {
      status: 'success',
      message: 'Message sent successfully',
      data: message
    };
  }

}
