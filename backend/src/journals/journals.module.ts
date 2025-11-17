import { Module } from '@nestjs/common';
import { JournalsController } from './journals.controller';
import { JournalsService } from './journals.service';
import { RolesGuard } from 'src/users/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [JournalsController],
  providers: [JournalsService, RolesGuard],
})
export class JournalsModule {}
