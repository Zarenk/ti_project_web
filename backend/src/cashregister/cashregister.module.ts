import { Module } from '@nestjs/common';
import { CashregisterService } from './cashregister.service';
import { CashregisterController } from './cashregister.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CashregisterController],
  providers: [CashregisterService, PrismaService],
})
export class CashregisterModule {}
