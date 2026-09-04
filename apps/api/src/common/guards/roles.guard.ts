import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@katacraft/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types';

/** Must run after JwtAuthGuard — relies on request.user already being set. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
