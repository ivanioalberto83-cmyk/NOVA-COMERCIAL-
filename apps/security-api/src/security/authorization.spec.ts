import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as authorization from './authorization';
import { AccessContext, AccessPolicy, evaluateAccess } from './authorization';

describe('evaluateAccess', () => {
  const policy: AccessPolicy = {
    tenantId: 'tenant-a',
    product: 'nova-comercial',
    action: 'customers:read',
    enabled: true,
  };

  const context: AccessContext = {
    tenantId: 'tenant-a',
    product: 'nova-comercial',
    permissions: ['customers:read'],
  };

  it('allows an explicitly permitted action in the matching tenant and product', () => {
    assert.equal(evaluateAccess(context, policy), true);
  });

  it('denies access when the active tenant does not match the resource tenant', () => {
    assert.equal(evaluateAccess({ ...context, tenantId: 'tenant-b' }, policy), false);
  });

  it('denies access when the permission is absent', () => {
    assert.equal(evaluateAccess({ ...context, permissions: [] }, policy), false);
  });

  it('denies access when the policy is disabled', () => {
    assert.equal(evaluateAccess(context, { ...policy, enabled: false }), false);
  });
});

describe('hasRequiredPermissions', () => {
  it('requires every explicitly requested permission', () => {
    const check = (authorization as typeof authorization & {
      hasRequiredPermissions?: (granted: readonly string[] | null, required: readonly string[] | null) => boolean;
    }).hasRequiredPermissions;
    assert.equal(check?.(['customers:read', 'customers:update'], ['customers:read']), true);
    assert.equal(check?.(['customers:read'], ['customers:read', 'customers:update']), false);
  });

  it('fails closed when requirements or grants are missing or invalid', () => {
    const check = (authorization as typeof authorization & {
      hasRequiredPermissions?: (granted: readonly string[] | null, required: readonly string[] | null) => boolean;
    }).hasRequiredPermissions;
    assert.equal(check?.(['customers:read'], []), false);
    assert.equal(check?.(null, ['customers:read']), false);
    assert.equal(check?.(['customers:read'], null), false);
    assert.equal(check?.(['customers:read'], [' ']), false);
  });
});
