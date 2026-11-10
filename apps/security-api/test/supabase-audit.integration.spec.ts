import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaService } from '../src/persistence/prisma.service';
import { SupabaseAuditRepository } from '../src/audit/supabase-audit.repository';
import { assertDisposableDatabaseUrl } from './disposable-database';

if (process.env.DATABASE_URL) assertDisposableDatabaseUrl(process.env);

describe('Supabase audit repository against disposable PostgreSQL', { skip: !process.env.DATABASE_URL }, () => {
  const prisma = new PrismaService();
  const audit = new SupabaseAuditRepository(prisma);
  const userId = randomUUID();
  const organizationId = randomUUID();
  const productId = randomUUID();
  const resourceId = randomUUID();
  let connected = false;

  before(async () => {
    await prisma.$connect();
    connected = true;
    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS auth');
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)');
    await prisma.$executeRaw`INSERT INTO auth.users (id) VALUES (${userId}::uuid)`;
    await prisma.organization.create({
      data: { id: organizationId, legalName: 'Audit Integration', displayName: 'Audit Integration', status: 'active' },
    });
    await prisma.product.create({
      data: { id: productId, code: 'nova-audit-integration', name: 'NOVA Audit Integration', status: 'active' },
    });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE nova_core.audit_events ADD CONSTRAINT audit_events_actor_user_fixture_fk FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL',
    );
  });

  after(async () => {
    if (!connected) return;
    await prisma.auditEvent.deleteMany({ where: { resourceId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    await prisma.$disconnect();
  });

  it('persists the authentication event with actor, tenant, product and structured metadata', async () => {
    await audit.write({
      actorUserId: userId,
      organizationId,
      productId,
      eventType: 'authentication',
      action: 'integration_test',
      resourceType: 'session',
      resourceId,
      outcome: 'success',
      severity: 'info',
      source: 'integration-test',
      metadata: { productCode: 'nova-audit-integration' },
    });

    const event = await prisma.auditEvent.findFirst({ where: { resourceId } });
    assert.ok(event);
    assert.equal(event.actorUserId, userId);
    assert.equal(event.organizationId, organizationId);
    assert.equal(event.productId, productId);
    assert.equal(event.outcome, 'success');
    assert.deepEqual(event.metadata, { productCode: 'nova-audit-integration' });
  });
});
