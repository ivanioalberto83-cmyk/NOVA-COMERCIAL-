import { evaluateAccess, AccessContext, AccessPolicy } from './authorization';

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
    expect(evaluateAccess(context, policy)).toBe(true);
  });

  it('denies access when the active tenant does not match the resource tenant', () => {
    expect(evaluateAccess({ ...context, tenantId: 'tenant-b' }, policy)).toBe(false);
  });

  it('denies access when the permission is absent', () => {
    expect(evaluateAccess({ ...context, permissions: [] }, policy)).toBe(false);
  });

  it('denies access when the policy is disabled', () => {
    expect(evaluateAccess(context, { ...policy, enabled: false })).toBe(false);
  });
});
