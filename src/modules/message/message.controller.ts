import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { MessageService } from './message.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { GetMessagesDto, MarkReadDto } from './dto/sent.message.dto';


const MB = 1024 * 1024;

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // ─── GET /messages/conversations ─────────────────────────────────────────
  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.messageService.getConversations(req.user.id);
  }

  // ─── GET /messages/history?bookingId=xxx&limit=50&cursor=xxx ─────────────
  @Get('history')
  async getHistory(@Req() req: any, @Query() dto: GetMessagesDto) {
    return this.messageService.getMessages(req.user.id, dto);
  }

  // ─── GET /messages/room/:bookingId ────────────────────────────────────────
  @Get('room/:bookingId')
  async getRoomInfo(@Req() req: any, @Param('bookingId') bookingId: string) {
    return this.messageService.getRoomByBooking(bookingId, req.user.id);
  }

  // ─── POST /messages/read ─────────────────────────────────────────────────
  @Post('read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Req() req: any, @Body() dto: MarkReadDto) {
    return this.messageService.markMessagesAsRead(
      req.user.id,
      dto.bookingId,
      dto.messageIds,
    );
  }

  // ─── DELETE /messages/:messageId ─────────────────────────────────────────
  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Req() req: any, @Param('messageId') messageId: string) {
    return this.messageService.deleteMessage(req.user.id, messageId);
  }

  // ─── POST /messages/upload/image ─────────────────────────────────────────
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * MB }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|gif)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.messageService.uploadMessageMedia(file, 'image');
  }

  // ─── POST /messages/upload/audio ─────────────────────────────────────────
  @Post('upload/audio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * MB }),
          new FileTypeValidator({ fileType: /audio\/(mpeg|ogg|wav|webm|mp4)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.messageService.uploadMessageMedia(file, 'audio');
  }

  // ─── POST /messages/upload/file ──────────────────────────────────────────
  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 20 * MB })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.messageService.uploadMessageMedia(file, 'file');
  }
}