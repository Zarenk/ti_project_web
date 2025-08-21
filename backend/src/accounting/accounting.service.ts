import { ConflictException, Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';

interface Account {
  id: number;
  code: string;
  name: string;
}

@Injectable()
export class AccountsService {
  private accounts: Account[] = [];

  create(dto: CreateAccountDto): Account {
    if (this.accounts.some((a) => a.code === dto.code)) {
      throw new ConflictException('Account already exists');
    }
    const account: Account = { id: this.accounts.length + 1, ...dto };
    this.accounts.push(account);
    return account;
  }
}