import { Module } from '@nestjs/common';
import { JournalsController } from './journals.controller';
import { JournalsService } from './journals.service';
import { RolesGuard } from 'src/users/roles.guard';

@Module({
  controllers: [JournalsController],
  providers: [JournalsService, RolesGuard],
})
export class JournalsModule {}