import { AccountingDto } from '../dto/accounting.dto';

interface AccountingStatus {
  status: string;
}

export function toAccountingDto(data: AccountingStatus): AccountingDto {
  return { status: data.status };
}