import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { RolesGuard } from 'src/users/roles.guard';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, RolesGuard],
})
export class AccountsModule {}