import { Module } from '@nestjs/common';
import { CashregisterService } from './cashregister.service';
import { CashregisterController } from './cashregister.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [CashregisterController],
  providers: [CashregisterService, PrismaService],
})
export class CashregisterModule {}
