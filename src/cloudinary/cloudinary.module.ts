import { Global, Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryUploadService } from './cloudinary.upload.service';

@Global()
@Module({
  controllers: [],
  providers: [CloudinaryProvider, CloudinaryUploadService],
  exports: [CloudinaryProvider, CloudinaryUploadService]
})
export class CloudinaryModule { }
