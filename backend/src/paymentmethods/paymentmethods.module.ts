import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentMethodsService } from './paymentmethods.service';
import { PaymentMethodsController } from './paymentmethods.controller';

@Module({
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, PrismaService],
})
export class PaymentmethodsModule {}
