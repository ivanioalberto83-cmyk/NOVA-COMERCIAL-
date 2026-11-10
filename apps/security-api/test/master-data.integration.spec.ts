import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaService } from '../src/persistence/prisma.service';
import { SupabaseAuditRepository } from '../src/audit/supabase-audit.repository';
import { MasterDataService, MasterDataContext } from '../src/master-data/master-data.service';
import { assertDisposableDatabaseUrl } from './disposable-database';

if (process.env.DATABASE_URL) assertDisposableDatabaseUrl(process.env);

describe('NOVA COMERCIAL master data API service against disposable PostgreSQL', { skip: !process.env.DATABASE_URL }, () => {
  const prisma = new PrismaService();
  const service = new MasterDataService(prisma, new SupabaseAuditRepository(prisma));
  const userId = randomUUID();
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const productId = randomUUID();
  let connected = false;
  let branchId = '';

  const contextA: MasterDataContext = {
    userId,
    organizationId: organizationA,
    productId,
    productCode: 'nova-comercial',
  };
  const contextB: MasterDataContext = {
    userId,
    organizationId: organizationB,
    productId,
    productCode: 'nova-comercial',
  };

  before(async () => {
    await prisma.$connect();
    connected = true;
    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS auth');
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)');
    await prisma.$executeRaw`INSERT INTO auth.users (id) VALUES (${userId}::uuid)`;
    await prisma.organization.createMany({
      data: [
        { id: organizationA, legalName: 'Master Data Tenant A', displayName: 'Tenant A', status: 'active' },
        { id: organizationB, legalName: 'Master Data Tenant B', displayName: 'Tenant B', status: 'active' },
      ],
    });
    await prisma.product.create({
      data: { id: productId, code: 'nova-comercial', name: 'NOVA COMERCIAL', status: 'active' },
    });
  });

  after(async () => {
    if (!connected) return;
    await prisma.auditEvent.deleteMany({
      where: { organizationId: { in: [organizationA, organizationB] } },
    });
    await prisma.$executeRaw`DELETE FROM nova_comercial.warehouses WHERE organization_id IN (${organizationA}::uuid, ${organizationB}::uuid)`;
    await prisma.$executeRaw`DELETE FROM nova_comercial.customers WHERE organization_id IN (${organizationA}::uuid, ${organizationB}::uuid)`;
    await prisma.$executeRaw`DELETE FROM nova_comercial.fiscal_periods WHERE organization_id IN (${organizationA}::uuid, ${organizationB}::uuid)`;
    await prisma.$executeRaw`DELETE FROM nova_comercial.branches WHERE organization_id IN (${organizationA}::uuid, ${organizationB}::uuid)`;
    await prisma.organization.deleteMany({ where: { id: { in: [organizationA, organizationB] } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    await prisma.$disconnect();
  });

  it('isolates list, get and update by the verified organization context', async () => {
    const branch = await service.create('branches', contextA, {
      code: 'LUANDA-SEDE',
      name: 'Sede Luanda',
      is_headquarters: true,
    });
    branchId = String(branch.id);
    assert.equal(branch.organizationId, organizationA);
    assert.equal(branch.isHeadquarters, true);

    const own = await service.list('branches', contextA, { limit: '10', offset: '0' });
    const foreign = await service.list('branches', contextB, {});
    assert.equal(own.pagination.total, 1);
    assert.equal(own.data.length, 1);
    assert.equal(foreign.pagination.total, 0);

    await assert.rejects(service.get('branches', contextB, branchId), /Record not found/);
    await assert.rejects(
      service.update('branches', contextB, branchId, { name: 'Tentativa externa' }),
      /Record not found/,
    );

    const updated = await service.update('branches', contextA, branchId, { status: 'INACTIVE' });
    assert.equal(updated.status, 'INACTIVE');
    const retained = await service.get('branches', contextA, branchId);
    assert.equal(retained.status, 'INACTIVE');
  });

  it('rejects client tenant assignment and cross-organization foreign-key references', async () => {
    await assert.rejects(
      service.create('branches', contextA, {
        organization_id: organizationB,
        code: 'FORGED',
        name: 'Tenant forgery',
      }),
      /not writable/i,
    );

    await assert.rejects(
      service.create('warehouses', contextB, {
        code: 'WAREHOUSE-B',
        name: 'Armazém B',
        branch_id: branchId,
      }),
      /another organisation/i,
    );
  });

  it('preserves exact decimal precision for customer credit limits', async () => {
    const customer = await service.create('customers', contextA, {
      code: 'CLIENTE-001',
      legal_name: 'Cliente de teste',
      credit_limit: '1234567890123.1234',
      payment_terms_days: 30,
    });
    assert.equal(String(customer.creditLimit), '1234567890123.1234');
  });

  it('rejects overlapping open fiscal periods within the same organization', async () => {
    await service.create('fiscal_periods', contextA, {
      code: 'FY-2026-A',
      name: 'Exercício 2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
    });
    await assert.rejects(
      service.create('fiscal_periods', contextA, {
        code: 'FY-2026-B',
        name: 'Período sobreposto',
        starts_on: '2026-06-01',
        ends_on: '2027-05-31',
      }),
      /overlaps another/i,
    );
  });

  it('records create and update events in the same transaction as the master data writes', async () => {
    const events = await prisma.auditEvent.findMany({
      where: {
        organizationId: organizationA,
        eventType: 'master_data',
        resourceType: 'branches',
      },
      orderBy: { id: 'asc' },
    });
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((event) => event.action), ['create', 'update']);
    assert.ok(events.every((event) => event.actorUserId === userId));
  });
});
