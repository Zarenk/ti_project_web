import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { Roles } from 'src/users/roles.decorator';
import { RolesGuard } from 'src/users/roles.guard';
import { AccountsService } from './accounting.service';
import { CreateAccountDto } from './accounts/dto/create-account.dto';
import { Account } from '@prisma/client';

@ApiTags('accounts')
@Controller('accounting/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateAccountDto): Account {
    return this.accountsService.create(dto);
  }
}