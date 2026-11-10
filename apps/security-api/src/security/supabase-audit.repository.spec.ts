import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SupabaseAuditRepository } from '../audit/supabase-audit.repository';

describe('SupabaseAuditRepository', () => {
  it('appends a structured audit event using parameterized SQL without storing credentials', async () => {
    let statement = '';
    let values: unknown[] = [];
    const prisma = {
      $executeRaw: async (strings: TemplateStringsArray, ...parameters: unknown[]) => {
        statement = Array.from(strings).join(' ');
        values = parameters;
        return 1;
      },
    };
    const repository = new SupabaseAuditRepository(prisma as never);
    await repository.write({
      actorUserId: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      organizationId: 'f4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      productId: 'a4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      eventType: 'authentication',
      action: 'login',
      resourceType: 'membership',
      resourceId: 'e4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
      outcome: 'success',
      severity: 'info',
      source: 'nova-security-api',
      metadata: { productCode: 'nova-comercial' },
    });

    assert.match(statement, /INSERT INTO nova_core\.audit_events/);
    assert.doesNotMatch(statement, /UPDATE|DELETE/i);
    assert.match(statement, /::uuid/);
    assert.match(statement, /::jsonb/);
    assert.ok(values.includes('authentication'));
    assert.ok(values.includes('login'));
    assert.ok(values.includes('success'));
    assert.ok(values.includes(JSON.stringify({ productCode: 'nova-comercial' })));
    assert.equal(values.some(value => typeof value === 'string' && /Bearer|refresh|password|secret/i.test(value)), false);
  });

  it('rejects unsupported outcome and empty action before writing', async () => {
    let calls = 0;
    const prisma = { $executeRaw: async () => { calls += 1; return 1; } };
    const repository = new SupabaseAuditRepository(prisma as never);
    await assert.rejects(repository.write({
      eventType: 'authentication',
      action: 'login',
      outcome: 'unknown',
    } as never));
    await assert.rejects(repository.write({
      eventType: 'authentication',
      action: ' ',
      outcome: 'failure',
    }));
    assert.equal(calls, 0);
  });
});
