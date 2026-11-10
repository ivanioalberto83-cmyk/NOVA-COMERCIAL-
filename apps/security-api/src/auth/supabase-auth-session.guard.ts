import 'reflect-metadata';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SupabaseAuthService, SupabasePrincipal } from './supabase-auth.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_CODE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
        typeof organizationId !== 'string' || !UUID.test(organizationId) ||
        typeof productCode !== 'string' || productCode.length > 80 || !PRODUCT_CODE.test(productCode)) {
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
