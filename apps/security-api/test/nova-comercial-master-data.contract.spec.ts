import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const migrationPath = join(
  process.cwd(),
  'database',
  'nova_comercial',
  'migrations',
  '20261110000100_master_data_foundation.sql',
);

describe('NOVA COMERCIAL master-data migration contract', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('creates the first operational master-data tables only in nova_comercial', () => {
    const expectedTables = [
      'branches', 'fiscal_periods', 'currencies', 'units_of_measure',
      'tax_codes', 'payment_methods', 'customers', 'suppliers',
      'item_categories', 'items', 'warehouses',
    ];

    assert.match(sql, /CREATE SCHEMA IF NOT EXISTS nova_comercial/i);
    for (const table of expectedTables) {
      assert.match(
        sql,
        new RegExp('CREATE TABLE nova_comercial\\.' + table + '\\b', 'i'),
        'Missing nova_comercial.' + table,
      );
    }
    assert.doesNotMatch(sql, /CREATE TABLE public\./i);
    assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/i);
  });

  it('enforces organization ownership with foreign keys and composite tenant references', () => {
    for (const table of [
      'branches', 'fiscal_periods', 'currencies', 'units_of_measure',
      'tax_codes', 'payment_methods', 'customers', 'suppliers',
      'item_categories', 'items', 'warehouses',
    ]) {
      assert.match(
        sql,
        new RegExp('CREATE TABLE nova_comercial\\.' + table + '[\\s\\S]*?FOREIGN KEY \\(organization_id\\) REFERENCES nova_core\\.organizations', 'i'),
        table + ' must reference nova_core.organizations',
      );
    }

    assert.match(sql, /FOREIGN KEY \(organization_id, parent_category_id\)/i);
    assert.match(sql, /FOREIGN KEY \(organization_id, category_id\)/i);
    assert.match(sql, /FOREIGN KEY \(organization_id, unit_id\)/i);
    assert.match(sql, /FOREIGN KEY \(organization_id, tax_code_id\)/i);
    assert.match(sql, /FOREIGN KEY \(organization_id, branch_id\)/i);
  });

  it('enables row-level security on every ERP table without opening client access', () => {
    const enabled = [...sql.matchAll(/ALTER TABLE nova_comercial\.[a-z_]+ ENABLE ROW LEVEL SECURITY/gi)];
    assert.equal(enabled.length, 11, 'all eleven tables must have RLS enabled');
    assert.doesNotMatch(sql, /GRANT .* TO (anon|authenticated)/i);
    assert.match(sql, /REVOKE ALL ON SCHEMA nova_comercial FROM PUBLIC, anon, authenticated/i);
    assert.doesNotMatch(sql, /CREATE POLICY/i);
  });

  it('keeps fiscal rates configurable and monetary values in fixed precision', () => {
    assert.match(sql, /tax_rate NUMERIC\(7,4\)/i);
    assert.match(sql, /credit_limit NUMERIC\(19,4\)/i);
    assert.match(sql, /sales_price NUMERIC\(19,4\)/i);
    assert.match(sql, /purchase_price NUMERIC\(19,4\)/i);
    assert.match(sql, /DEFAULT 'AOA'/i);
  });
});
