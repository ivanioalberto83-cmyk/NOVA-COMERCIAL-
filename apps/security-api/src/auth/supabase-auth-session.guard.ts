import 'reflect-metadata';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SupabaseAuthService, SupabasePrincipal } from './supabase-auth.service';

type RequestWithAuth = {
  headers: Record<string, string | string[] | undefined>;
  auth?: SupabasePrincipal;
};

@Injectable()
export class SupabaseAuthSessionGuard implements CanActivate {
  constructor(private readonly auth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler()) === true ||
      Reflect.getMetadata(IS_PUBLIC_KEY, context.getClass()) === true;
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;
    const organizationId = request.headers['x-organization-id'];
    const productCode = request.headers['x-product-code'];
    if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization) ||
        typeof organizationId !== 'string' || typeof productCode !== 'string') {
      throw new UnauthorizedException('A valid bearer token and organization/product context are required');
    }

    const principal = await this.auth.authorizeAccessToken(
      authorization.replace(/^Bearer\s+/i, ''),
      organizationId,
      productCode,
    );
    if (!principal) throw new UnauthorizedException('Invalid token or inactive organization/product access');
    request.auth = principal;
    return true;
  }
}
