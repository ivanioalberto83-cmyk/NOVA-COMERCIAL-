import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthSessionGuard } from '../auth/supabase-auth-session.guard';

function context(headers: Record<string, string>) {
  const handler = function protectedRoute() {};
  class ProtectedController {}
  const request = { headers };
  return {
    getHandler: () => handler,
    getClass: () => ProtectedController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthSessionGuard request context validation', () => {
  it('rejects malformed organization identifiers before calling Supabase or PostgreSQL', async () => {
    let called = false;
    const auth = {
      authorizeAccessToken: async () => {
        called = true;
        return null;
      },
    };
    const guard = new SupabaseAuthSessionGuard(auth as never);
    await assert.rejects(guard.canActivate(context({
      authorization: 'Bearer valid-token',
      'x-organization-id': 'not-a-uuid',
      'x-product-code': 'nova-comercial',
    })), UnauthorizedException);
    assert.equal(called, false);
  });

  it('rejects malformed product codes before calling Supabase or PostgreSQL', async () => {
    let called = false;
    const auth = {
      authorizeAccessToken: async () => {
        called = true;
        return null;
      },
    };
    const guard = new SupabaseAuthSessionGuard(auth as never);
    await assert.rejects(guard.canActivate(context({
      authorization: 'Bearer valid-token',
      'x-organization-id': 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      'x-product-code': 'NOVA COMERCIAL',
    })), UnauthorizedException);
    assert.equal(called, false);
  });
});
