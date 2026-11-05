import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  authorize,
  canGrantAccess,
  createAuthorizationAuditEvent,
  SecurityPrincipal,
} from './policy';

const principal: SecurityPrincipal = {
  subjectId: 'user-1',
  tenantId: 'tenant-a',
  product: 'nova-comercial',
  roles: ['finance-manager'],
  permissions: ['invoices:read'],
  grantableRoles: ['finance-reader'],
  grantablePermissions: ['invoices:read'],
};

const resource = {
  resourceId: 'invoice-1',
  tenantId: 'tenant-a',
  product: 'nova-comercial',
};

describe('multi-tenant authorization policy', () => {
  it('allows an exact tenant, product, role and permission match', () => {
    assert.deepEqual(authorize({ principal, resource, action: 'invoices:read' }),
      { allowed: true, reason: 'allowed' });
  });

  it('denies cross-tenant access even when the permission matches', () => {
    assert.deepEqual(authorize({
      principal, resource: { ...resource, tenantId: 'tenant-b' }, action: 'invoices:read',
    }), { allowed: false, reason: 'tenant_mismatch' });
  });

  it('denies cross-product access', () => {
    assert.deepEqual(authorize({
      principal, resource: { ...resource, product: 'nova-taxi' }, action: 'invoices:read',
    }), { allowed: false, reason: 'product_mismatch' });
  });

  it('does not infer permissions from an administrator-like role name', () => {
    assert.deepEqual(authorize({
      principal: { ...principal, roles: ['super-admin'], permissions: [] },
      resource, action: 'tenants:read',
    }), { allowed: false, reason: 'permission_missing' });
  });

  it('fails closed for missing or malformed context', () => {
    assert.deepEqual(authorize(undefined), { allowed: false, reason: 'invalid_context' });
    assert.deepEqual(authorize({
      principal: { ...principal, tenantId: ' ' }, resource, action: 'invoices:read',
    }), { allowed: false, reason: 'invalid_context' });
  });

  it('requires a role and does not accept an empty action', () => {
    assert.deepEqual(authorize({
      principal: { ...principal, roles: [] }, resource, action: 'invoices:read',
    }), { allowed: false, reason: 'role_missing' });
    assert.equal(authorize({ principal, resource, action: ' ' }).allowed, false);
  });
});

describe('permission delegation', () => {
  it('allows only explicitly grantable roles and permissions', () => {
    assert.equal(canGrantAccess({
      actor: principal,
      targetTenantId: 'tenant-a',
      targetProduct: 'nova-comercial',
      targetRoles: ['finance-reader'],
      targetPermissions: ['invoices:read'],
    }), true);
  });

  it('blocks privilege escalation beyond the actor delegation ceiling', () => {
    assert.equal(canGrantAccess({
      actor: principal,
      targetTenantId: 'tenant-a',
      targetProduct: 'nova-comercial',
      targetRoles: ['tenant-owner'],
      targetPermissions: ['users:delete'],
    }), false);
  });

  it('blocks delegation to a different tenant or product', () => {
    assert.equal(canGrantAccess({
      actor: principal,
      targetTenantId: 'tenant-b',
      targetProduct: 'nova-comercial',
      targetRoles: ['finance-reader'],
      targetPermissions: ['invoices:read'],
    }), false);
    assert.equal(canGrantAccess({
      actor: principal,
      targetTenantId: 'tenant-a',
      targetProduct: 'nova-taxi',
      targetRoles: ['finance-reader'],
      targetPermissions: ['invoices:read'],
    }), false);
  });

  it('rejects empty or malformed grants', () => {
    assert.equal(canGrantAccess({
      actor: principal, targetTenantId: 'tenant-a', targetProduct: 'nova-comercial', targetRoles: [], targetPermissions: [],
    }), false);
    assert.equal(canGrantAccess({
      actor: null, targetTenantId: 'tenant-a', targetProduct: 'nova-comercial', targetRoles: ['finance-reader'], targetPermissions: [],
    }), false);
  });
});

describe('authorization audit event', () => {
  it('creates a structured event without user profile data', () => {
    const request = { principal, resource, action: 'invoices:read' };
    const decision = authorize(request);
    assert.deepEqual(createAuthorizationAuditEvent(
      request, decision, '2026-11-05T10:00:00.000Z', 'req-123',
    ), {
      occurredAt: '2026-11-05T10:00:00.000Z',
      correlationId: 'req-123',
      actorId: 'user-1',
      tenantId: 'tenant-a',
      action: 'invoices:read',
      resourceId: 'invoice-1',
      allowed: true,
      reason: 'allowed',
    });
  });

  it('refuses to create incomplete audit events', () => {
    assert.equal(createAuthorizationAuditEvent(
      { principal, resource, action: 'invoices:read' },
      { allowed: false, reason: 'invalid_context' }, '', 'req-123',
    ), null);
  });
});
