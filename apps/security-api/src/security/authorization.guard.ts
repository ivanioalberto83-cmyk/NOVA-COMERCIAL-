import 'reflect-metadata';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { hasRequiredPermissions } from './authorization';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

type AuthorizationRequest = {
  auth?: { permissions?: readonly string[] };
};

@Injectable()
export class AuthorizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const controller = context.getClass();
    if (Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
        Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true) return true;
    const required = Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) ??
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller);

    if (required === undefined) {
      throw new ForbiddenException('Protected route has no explicit permission policy');
    }

    const request = context.switchToHttp().getRequest<AuthorizationRequest>();
    if (!Array.isArray(required) ||
        !hasRequiredPermissions(request.auth?.permissions, required)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
