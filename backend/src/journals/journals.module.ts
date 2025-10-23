import { Module } from '@nestjs/common';
import { JournalsController } from './journals.controller';
import { JournalsService } from './journals.service';
import { RolesGuard } from 'src/users/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JournalsController],
  providers: [JournalsService, RolesGuard],
})
export class JournalsModule {}
