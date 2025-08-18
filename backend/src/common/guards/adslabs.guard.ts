import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'
import { getAdsLabAllowlistRoles, getAdsLabAllowlistUserIds, isAdsLabEnabled } from 'src/config/feature-flags'

@Injectable()
export class AdsLabGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isAdsLabEnabled()) {
      throw new NotFoundException()
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user
    const ids = getAdsLabAllowlistUserIds()
    const roles = getAdsLabAllowlistRoles()

    if (!user) {
      throw new NotFoundException()
    }

    if (ids.includes(String(user.id)) || roles.includes(user.role)) {
      return true
    }

    throw new NotFoundException()
  }
}