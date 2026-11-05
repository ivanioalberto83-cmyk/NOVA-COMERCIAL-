import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthSessionGuard } from '../src/auth/auth-session.guard';
import { IS_PUBLIC_KEY } from '../src/auth/public.decorator';

const claims = { sub: 'u1', sid: 's1', membershipId: 'm1', tenantId: 't1', product: 'nova-comercial', iat: 1800000000, exp: 1800000900, iss: 'nova-security-core' as const, aud: 'nova-products' as const };
function makeContext(headers: Record<string, string | string[] | undefined>, publicRoute = false) {
  const handler = function route() {};
  class TestController {}
  if (publicRoute) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  const request: { headers: typeof headers; auth?: typeof claims } = { headers };
  const context = { getHandler: () => handler, getClass: () => TestController, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { context, request };
}

describe('AuthSessionGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const guard = new AuthSessionGuard({ authorizeAccessToken: async () => claims } as never);
    const { context } = makeContext({});
    await assert.rejects(guard.canActivate(context), UnauthorizedException);
  });
  it('rejects a token whose persisted session is inactive', async () => {
    const guard = new AuthSessionGuard(new Reflector(), { authorizeAccessToken: async () => null } as never);
    const { context } = makeContext({ authorization: 'Bearer token' });
    await assert.rejects(guard.canActivate(context), UnauthorizedException);
  });
  it('attaches verified identity and tenant claims to the request', async () => {
    const guard = new AuthSessionGuard(new Reflector(), { authorizeAccessToken: async () => claims } as never);
    const { context, request } = makeContext({ authorization: 'Bearer token' });
    assert.equal(await guard.canActivate(context), true);
    assert.deepEqual(request.auth, claims);
  });
  it('allows explicitly public routes to bypass authentication', async () => {
    const guard = new AuthSessionGuard(new Reflector(), { authorizeAccessToken: async () => null } as never);
    const { context } = makeContext({}, true);
    assert.equal(await guard.canActivate(context), true);
  });
});
