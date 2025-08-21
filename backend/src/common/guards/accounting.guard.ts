import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAccountingEnabled } from 'src/config/feature-flags';

@Injectable()
export class AccountingFeatureGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    if (!isAccountingEnabled()) {
      throw new NotFoundException();
    }
    return true;
  }
}