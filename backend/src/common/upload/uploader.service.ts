import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { S3Service } from '../storage/s3.service';
import { AntivirusService } from '../security/antivirus.service';

@Injectable()
export class UploaderService {
  constructor(private s3: S3Service, private av: AntivirusService) {}

  async uploadImage(file: Express.Multer.File, key: string) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large');
    }
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(file.buffer);
    if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
      throw new Error('Invalid file type');
    }
    await this.av.scan(file.buffer);
    // sharp without withMetadata strips EXIF
    const buffer = await sharp(file.buffer).rotate().toBuffer();
    return this.s3.uploadAndSign(key, buffer, type.mime, 60);
  }
}