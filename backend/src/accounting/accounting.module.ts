import { Module } from '@nestjs/common';
import { RolesGuard } from 'src/users/roles.guard';
import { AccountsController } from './accounting.controller';
import { AccountsService } from './accounting.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, RolesGuard],
})
export class AccountsModule {}