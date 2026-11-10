import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SupabaseAuthService } from './supabase-auth.service';

const user = { id: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111', email: 'user@example.test' };
const membership = {
  membershipId: 'e4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  organizationId: 'f4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  productId: 'a4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  productCode: 'nova-comercial',
  roles: ['org-admin'],
  permissions: ['customers.read', 'customers.write'],
};

describe('SupabaseAuthService', () => {
  it('authenticates through Supabase and only issues access for an active tenant/product membership', async () => {
    const calls: string[] = [];
    const provider = {
      signInWithPassword: async () => ({
        accessToken: 'provider-access',
        refreshToken: 'provider-refresh',
        expiresIn: 3600,
        tokenType: 'bearer',
        user,
      }),
      signOut: async (token: string) => { calls.push(token); },
      getUser: async () => user,
      refreshSession: async () => { throw new Error('unused'); },
    };
    const identity = {
      findActiveProductMembership: async (userId: string, organizationId: string, productCode: string) => {
        assert.equal(userId, user.id);
        assert.equal(organizationId, membership.organizationId);
        assert.equal(productCode, membership.productCode);
        return membership;
      },
    };
    const service = new SupabaseAuthService(provider as never, identity as never);
    const result = await service.login({
      email: 'USER@example.test',
      password: 'password',
      organizationId: membership.organizationId,
      productCode: membership.productCode,
    });
    assert.equal(result.accessToken, 'provider-access');
    assert.equal(result.refreshToken, 'provider-refresh');
    assert.deepEqual(result.permissions, membership.permissions);
    assert.deepEqual(calls, []);
  });

  it('rejects an authenticated Supabase user without an active organization/product entitlement', async () => {
    let signedOut = false;
    const provider = {
      signInWithPassword: async () => ({
        accessToken: 'provider-access',
        refreshToken: 'provider-refresh',
        expiresIn: 3600,
        tokenType: 'bearer',
        user,
      }),
      signOut: async () => { signedOut = true; },
      getUser: async () => user,
      refreshSession: async () => { throw new Error('unused'); },
    };
    const identity = { findActiveProductMembership: async () => null };
    const service = new SupabaseAuthService(provider as never, identity as never);
    await assert.rejects(service.login({
      email: 'user@example.test',
      password: 'password',
      organizationId: membership.organizationId,
      productCode: membership.productCode,
    }), /inactive access/i);
    assert.equal(signedOut, true);
  });

  it('revalidates membership for every protected request instead of trusting client context', async () => {
    const provider = {
      signInWithPassword: async () => { throw new Error('unused'); },
      signOut: async () => undefined,
      getUser: async (token: string) => {
        assert.equal(token, 'provider-access');
        return user;
      },
      refreshSession: async () => { throw new Error('unused'); },
    };
    let requestedTenant = '';
    const identity = {
      findActiveProductMembership: async (_userId: string, organizationId: string) => {
        requestedTenant = organizationId;
        return organizationId === membership.organizationId ? membership : null;
      },
    };
    const service = new SupabaseAuthService(provider as never, identity as never);
    const valid = await service.authorizeAccessToken(
      'provider-access', membership.organizationId, membership.productCode,
    );
    assert.equal(valid?.tenantId, membership.organizationId);
    assert.deepEqual(valid?.permissions, membership.permissions);

    const invalid = await service.authorizeAccessToken(
      'provider-access', 'b4a1c111-3c32-4a45-9a0b-31d9f4c9a111', membership.productCode,
    );
    assert.equal(invalid, null);
    assert.equal(requestedTenant, 'b4a1c111-3c32-4a45-9a0b-31d9f4c9a111');
  });
});
