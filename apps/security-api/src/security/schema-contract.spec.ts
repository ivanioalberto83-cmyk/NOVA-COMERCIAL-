import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';

const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));

describe('NOVA CORE Prisma contract', () => {
  it('maps only to the nine tables that actually exist in nova_core', () => {
    const expected = {
      Organization: 'organizations',
      Product: 'products',
      OrganizationProduct: 'organization_products',
      Membership: 'memberships',
      Role: 'roles',
      Permission: 'permissions',
      RolePermission: 'role_permissions',
      MembershipRole: 'membership_roles',
      AuditEvent: 'audit_events',
    };

    assert.deepEqual([...models.keys()].sort(), Object.keys(expected).sort());

    for (const [modelName, tableName] of Object.entries(expected)) {
      assert.equal(models.get(modelName)?.dbName, tableName, `${modelName} must map to nova_core.${tableName}`);
    }
  });

  it('uses the real organization, membership, product and audit columns', () => {
    const expectedFields: Record<string, string[]> = {
      Organization: ['legalName', 'displayName', 'taxId', 'countryCode', 'status', 'metadata'],
      Product: ['code', 'name', 'description', 'status'],
      OrganizationProduct: ['organizationId', 'productId', 'status', 'startsAt', 'endsAt', 'configuration'],
      Membership: ['organizationId', 'userId', 'status', 'isPrimary'],
      Role: ['code', 'name', 'scope', 'isSystem'],
      Permission: ['code', 'resource', 'action', 'description'],
      MembershipRole: ['membershipId', 'roleId', 'grantedBy'],
      AuditEvent: ['actorUserId', 'organizationId', 'productId', 'eventType', 'action', 'outcome', 'severity', 'metadata'],
    };

    for (const [modelName, fields] of Object.entries(expectedFields)) {
      const actual = new Set(models.get(modelName)?.fields.map((field) => field.name) ?? []);
      for (const field of fields) {
        assert.ok(actual.has(field), `${modelName} must expose field ${field}`);
      }
    }
  });
});
