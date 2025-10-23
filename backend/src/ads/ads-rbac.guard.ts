import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdsRole } from './roles.enum';
import { ROLES_KEY } from 'src/users/roles.decorator';
import { ORGANIZATION_KEY } from './organization.decorator';

@Injectable()
export class AdsRbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<AdsRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    const organizationScoped = this.reflector.getAllAndOverride<boolean>(
      ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden role');
    }
    if (organizationScoped) {
      const orgParam =
        request.params?.organizationId ??
        request.body?.organizationId ??
        request.query?.organizationId;
      const organizationId = orgParam ? parseInt(orgParam, 10) : undefined;
      if (organizationId && user.organizationId !== organizationId) {
        throw new ForbiddenException('Forbidden organization');
      }
    }
    return true;
  }
}
