import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const seed = readFileSync('database/nova_core/seeds/20261110000100_master_data_permissions.sql', 'utf8');
const resources = [
  'branches', 'fiscal_periods', 'currencies', 'units_of_measure', 'tax_codes',
  'payment_methods', 'customers', 'suppliers', 'item_categories', 'items', 'warehouses',
];

describe('NOVA COMERCIAL master-data permission catalogue', () => {
  it('declares read, create and update permissions for all eleven master-data resources', () => {
    for (const resource of resources) {
      for (const action of ['read', 'create', 'update']) {
        assert.ok(
          seed.includes(`'master_data.${resource}.${action}'`),
          `missing ${action} permission for ${resource}`,
        );
        assert.ok(
          seed.includes(`'master_data.${resource}', '${action}'`),
          `resource/action pair missing for ${resource}.${action}`,
        );
      }
    }
  });

  it('is idempotent and does not assign permissions to users or roles automatically', () => {
    assert.match(seed, /ON CONFLICT DO NOTHING/);
    assert.doesNotMatch(seed, /INSERT INTO nova_core\.(membership_roles|role_permissions)/i);
    assert.doesNotMatch(seed, /INSERT INTO nova_core\.memberships/i);
  });
});
