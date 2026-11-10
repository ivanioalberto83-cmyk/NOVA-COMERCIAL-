import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SupabaseIdentityRepository } from '../identity/supabase-identity.repository';

describe('SupabaseIdentityRepository', () => {
  it('uses lowercase statuses and honours trial and nullable entitlement dates', async () => {
    const statements: string[] = [];
    const prisma = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        const sql = Array.from(strings).join(' ');
        statements.push(sql);
        if (statements.length === 1) {
          return [{
            membership_id: 'e4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
            organization_id: 'f4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
            product_id: 'a4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
            product_code: 'nova-comercial',
          }];
        }
        return [{ role_code: 'org-admin', permission_code: 'customers.read' }];
      },
    };
    const repository = new SupabaseIdentityRepository(prisma as never);
    const result = await repository.findActiveProductMembership(
      'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      'f4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      'nova-comercial',
    );

    assert.ok(result);
    assert.match(statements[0], /m\.status\s*=\s*'active'/);
    assert.match(statements[0], /o\.status\s*=\s*'active'/);
    assert.match(statements[0], /op\.status\s+IN\s*\('active',\s*'trial'\)/);
    assert.match(statements[0], /p\.status\s*=\s*'active'/);
    assert.match(statements[0], /\(op\.starts_at IS NULL OR op\.starts_at\s*<=\s*now\(\)\)/);
  });
});
