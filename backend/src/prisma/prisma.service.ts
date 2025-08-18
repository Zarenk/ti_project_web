import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { KmsService } from '../common/security/kms.service';
import { encryptCredentialsMiddleware } from '../common/security/credentials.middleware';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly kms = new KmsService();

  async onModuleInit() {
    this.$use(encryptCredentialsMiddleware(this.kms));
    await this.$connect();
  }
}