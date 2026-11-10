import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

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
  it('authenticates through Supabase, checks entitlement and records a non-sensitive audit event', async () => {
    const calls: string[] = [];
    const auditEvents: Array<Record<string, unknown>> = [];
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
    const audit = { write: async (event: Record<string, unknown>) => { auditEvents.push(event); } };
    const service = new SupabaseAuthService(provider as never, identity as never, audit as never);
    const result = await service.login({
      email: 'USER@example.test',
      password: 'NOVA-Strong-Passphrase-2026!',
      organizationId: membership.organizationId,
      productCode: membership.productCode,
    });
    assert.equal(result.accessToken, 'provider-access');
    assert.equal(result.refreshToken, 'provider-refresh');
    assert.deepEqual(result.permissions, membership.permissions);
    assert.deepEqual(calls, []);
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0].action, 'login');
    assert.equal(auditEvents[0].outcome, 'success');
    assert.equal(auditEvents[0].actorUserId, user.id);
    assert.deepEqual(auditEvents[0].metadata, { productCode: 'nova-comercial' });
  });

  it('revokes a provider session and audits denied access without disclosing credentials', async () => {
    let signedOut = false;
    const auditEvents: Array<Record<string, unknown>> = [];
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
    const audit = { write: async (event: Record<string, unknown>) => { auditEvents.push(event); } };
    const service = new SupabaseAuthService(provider as never, identity as never, audit as never);
    await assert.rejects(service.login({
      email: 'user@example.test',
      password: 'NOVA-Strong-Passphrase-2026!',
      organizationId: membership.organizationId,
      productCode: membership.productCode,
    }), /inactive access/i);
    assert.equal(signedOut, true);
    assert.equal(auditEvents[0].outcome, 'denied');
    assert.deepEqual(auditEvents[0].metadata, {
      reason: 'inactive_membership_or_product',
      productCode: 'nova-comercial',
    });
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
    const audit = { write: async () => undefined };
    const service = new SupabaseAuthService(provider as never, identity as never, audit as never);
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

  it('fails closed and revokes the provider session if successful login cannot be audited', async () => {
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
    const identity = { findActiveProductMembership: async () => membership };
    const audit = { write: async () => { throw new Error('database unavailable'); } };
    const service = new SupabaseAuthService(provider as never, identity as never, audit as never);
    await assert.rejects(service.login({
      email: 'user@example.test',
      password: 'NOVA-Strong-Passphrase-2026!',
      organizationId: membership.organizationId,
      productCode: membership.productCode,
    }), /audit could not be recorded/i);
    assert.equal(signedOut, true);
  });
});
