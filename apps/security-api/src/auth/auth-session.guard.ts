import 'reflect-metadata';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AccessTokenClaims } from './auth-token.service';

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  auth?: AccessTokenClaims;
};

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler()) === true ||
      Reflect.getMetadata(IS_PUBLIC_KEY, context.getClass()) === true;
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
      throw new UnauthorizedException('A valid bearer token is required');
    }
    const token = authorization.replace(/^Bearer\s+/i, '');
    const claims = await this.auth.authorizeAccessToken(token);
    if (!claims) throw new UnauthorizedException('Invalid or inactive session');
    request.auth = claims;
    return true;
  }
}
