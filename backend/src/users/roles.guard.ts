import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

const SUPER_ADMIN_ROLES = new Set([
  "SUPER_ADMIN_GLOBAL",
  "SUPER_ADMIN_ORG",
  "SUPER_ADMIN",
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const normalizedRole =
      typeof user?.role === "string" ? user.role.toUpperCase() : undefined;

    if (!normalizedRole) {
      throw new ForbiddenException("Forbidden resource");
    }

    if (SUPER_ADMIN_ROLES.has(normalizedRole)) {
      return true;
    }

    const normalizedRequired = requiredRoles.map((role) => role.toUpperCase());

    if (!normalizedRequired.includes(normalizedRole)) {
      throw new ForbiddenException("Forbidden resource");
    }

    return true;
  }
}