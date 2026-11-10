import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaService } from '../src/persistence/prisma.service';
import { SupabaseIdentityRepository } from '../src/identity/supabase-identity.repository';
import { assertDisposableDatabaseUrl } from './disposable-database';

if (process.env.DATABASE_URL) assertDisposableDatabaseUrl(process.env);

describe('Supabase identity repository against disposable PostgreSQL', { skip: !process.env.DATABASE_URL }, () => {
  const prisma = new PrismaService();
  const repository = new SupabaseIdentityRepository(prisma);
  const userId = randomUUID();
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const productId = randomUUID();
  const roleId = randomUUID();
  const permissionId = randomUUID();
  let connected = false;

  before(async () => {
    await prisma.$connect();
    connected = true;
    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS auth');
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)');
    await prisma.$executeRaw`INSERT INTO auth.users (id) VALUES (${userId})`;

    await prisma.organization.createMany({
      data: [
        { id: organizationId, legalName: 'Tenant A Integration', displayName: 'Tenant A Integration', status: 'active' },
        { id: otherOrganizationId, legalName: 'Tenant B Integration', displayName: 'Tenant B Integration', status: 'active' },
      ],
    });
    await prisma.product.create({
      data: { id: productId, code: 'nova-comercial-integration', name: 'NOVA COMERCIAL Integration', status: 'active' },
    });
    await prisma.organizationProduct.createMany({
      data: [
        {
          organizationId, productId, status: 'active',
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 60_000),
        },
        {
          organizationId: otherOrganizationId, productId, status: 'active',
          startsAt: new Date(Date.now() + 60_000),
          endsAt: new Date(Date.now() + 120_000),
        },
      ],
    });
    await prisma.membership.createMany({
      data: [
        { organizationId, userId, status: 'active', isPrimary: true },
        { organizationId: otherOrganizationId, userId, status: 'active', isPrimary: false },
      ],
    });
    await prisma.role.create({
      data: { id: roleId, code: 'org-admin-integration', name: 'Integration administrator', scope: 'organization' },
    });
    await prisma.permission.create({
      data: { id: permissionId, code: 'customers.read', resource: 'customers', action: 'read' },
    });
    await prisma.rolePermission.create({ data: { roleId, permissionId } });
    const membership = await prisma.membership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    await prisma.membershipRole.create({ data: { membershipId: membership.id, roleId, grantedBy: userId } });
  });

  after(async () => {
    if (!connected) return;
    await prisma.membershipRole.deleteMany({ where: { roleId } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.organizationProduct.deleteMany({ where: { productId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.permission.deleteMany({ where: { id: permissionId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } });
    await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}`;
    await prisma.$disconnect();
  });

  it('resolves active organization, product, role and permission for the authenticated user', async () => {
    const result = await repository.findActiveProductMembership(
      userId, organizationId, 'nova-comercial-integration',
    );
    assert.ok(result);
    assert.equal(result.organizationId, organizationId);
    assert.deepEqual(result.roles, ['org-admin-integration']);
    assert.deepEqual(result.permissions, ['customers.read']);
  });

  it('does not grant access across organizations or before an entitlement starts', async () => {
    const crossTenant = await repository.findActiveProductMembership(
      userId, otherOrganizationId, 'nova-comercial-integration',
    );
    assert.equal(crossTenant, null);
  });
});
