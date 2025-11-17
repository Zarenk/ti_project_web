import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket = process.env.S3_BUCKET as string;

  constructor() {
    this.client = new S3Client({ region: process.env.AWS_REGION });
  }

  async uploadAndSign(
    key: string,
    body: Buffer,
    contentType: string,
    ttlSeconds = 60,
  ) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }
}
