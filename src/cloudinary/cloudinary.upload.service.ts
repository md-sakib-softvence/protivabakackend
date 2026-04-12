import { Inject, Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryUploadService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
  ) {}

  // async uploadImage(filePath: string, folderName: string) {
  //     return this.cloudinary.uploader.upload(filePath, { folder: folderName });
  // }

  // async uploadImageFromBuffer(buffer: Buffer, folderName: string, fileName: string){
  //     return new Promise((resolve, reject) => {
  //         const stream = this.cloudinary.uploader.upload_stream(
  //             { folder: folderName, public_id: fileName },
  //             (error, result) => {
  //                 if (error) reject(error);
  //                 else resolve(result);
  //             },
  //         );
  //         stream.end(buffer);
  //     });
  // }

  async uploadImageFromBuffer(
    buffer: Buffer,
    folderName: string,
    publicId: string,
  ) {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        { folder: folderName, public_id: publicId },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
