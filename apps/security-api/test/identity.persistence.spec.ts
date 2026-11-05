import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { IdentityRepository } from '../src/identity/identity.repository';
import { PrismaService } from '../src/persistence/prisma.service';

const enabled = Boolean(process.env.DATABASE_URL);

describe('identity persistence and tenant boundaries', { skip: !enabled }, () => {
  const prisma = new PrismaService();
  const repository = new IdentityRepository(prisma);
  let organizationA: { id: string };
  let organizationB: { id: string };
  let product: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let membershipA: { id: string };
  let membershipB: { id: string };

  before(async () => {
    await prisma.$connect();
    await prisma.securitySession.deleteMany();
    await prisma.membershipRole.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.product.deleteMany();

    organizationA = await prisma.organization.create({
      data: { name: 'Tenant A test', slug: 'tenant-a-test' }, select: { id: true },
    });
    organizationB = await prisma.organization.create({
      data: { name: 'Tenant B test', slug: 'tenant-b-test' }, select: { id: true },
    });
    product = await prisma.product.create({
      data: { code: 'nova-comercial-test', name: 'NOVA COMERCIAL test' }, select: { id: true },
    });
    userA = await prisma.user.create({ data: {}, select: { id: true } });
    userB = await prisma.user.create({ data: {}, select: { id: true } });
    membershipA = await prisma.membership.create({
      data: {
        userId: userA.id, organizationId: organizationA.id,
        productId: product.id, status: 'ACTIVE',
      }, select: { id: true },
    });
    membershipB = await prisma.membership.create({
      data: {
        userId: userB.id, organizationId: organizationB.id,
        productId: product.id, status: 'ACTIVE',
      }, select: { id: true },
    });
  });

  after(async () => {
    await prisma.securitySession.deleteMany();
    await prisma.membershipRole.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.product.deleteMany();
    await prisma.$disconnect();
  });

  it('returns only the requesting user membership in the requested tenant and product', async () => {
    const own = await repository.findActiveMembership(userA.id, organizationA.id, 'nova-comercial-test');
    const foreign = await repository.findActiveMembership(userA.id, organizationB.id, 'nova-comercial-test');
    const wrongProduct = await repository.findActiveMembership(userA.id, organizationA.id, 'nova-taxi');
    assert.equal(own?.id, membershipA.id);
    assert.equal(foreign, null);
    assert.equal(wrongProduct, null);
  });

  it('persists only a refresh-token hash and scopes revocation to the owning membership', async () => {
    const tokenHash = 'a'.repeat(64);
    const session = await repository.createSession({
      membershipId: membershipA.id,
      organizationId: organizationA.id,
      productId: product.id,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });
    assert.equal(session.membershipId, membershipA.id);
    assert.equal(await repository.revokeSession(session.id, membershipB.id), false);
    assert.equal(await repository.revokeSession(session.id, membershipA.id), true);
    assert.equal(await repository.revokeSession(session.id, membershipA.id), false);
    const persisted = await prisma.securitySession.findUniqueOrThrow({
      where: { id: session.id }, select: { refreshTokenHash: true, revokedAt: true },
    });
    assert.equal(persisted.refreshTokenHash, tokenHash);
    assert.ok(persisted.revokedAt instanceof Date);
  });

  it('rejects a session linked to a mismatched tenant through composite foreign keys', async () => {
    await assert.rejects(prisma.securitySession.create({
      data: {
        membershipId: membershipA.id,
        organizationId: organizationB.id,
        productId: product.id,
        refreshTokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
      },
    }));
  });
});
