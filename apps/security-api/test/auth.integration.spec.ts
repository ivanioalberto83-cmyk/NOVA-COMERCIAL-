import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AuthService } from '../src/auth/auth.service';
import { AuthTokenService } from '../src/auth/auth-token.service';
import { IdentityRepository } from '../src/identity/identity.repository';
import { PrismaService } from '../src/persistence/prisma.service';
import { PasswordService } from '../src/auth/password.service';

const enabled = Boolean(process.env.DATABASE_URL);

describe('authentication and refresh-token lifecycle', { skip: !enabled }, () => {
  const prisma = new PrismaService();
  const identity = new IdentityRepository(prisma);
  const passwords = new PasswordService();
  const tokens = new AuthTokenService('integration-test-secret-that-is-long-enough-32');
  const auth = new AuthService(identity, passwords, tokens);
  let organizationId: string;
  let productId: string;
  let userId: string;
  let membershipId: string;
  const password = 'NOVA-Integration-Passphrase-2026!';

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

    const organization = await prisma.organization.create({
      data: { name: 'Auth test tenant', slug: 'auth-test-tenant' }, select: { id: true },
    });
    organizationId = organization.id;
    const product = await prisma.product.create({
      data: { code: 'nova-comercial-auth-test', name: 'NOVA COMERCIAL auth test' }, select: { id: true },
    });
    productId = product.id;
    const user = await prisma.user.create({
      data: { email: 'auth-test@example.test' }, select: { id: true },
    });
    userId = user.id;
    await prisma.credential.create({
      data: { userId, passwordHash: await passwords.hash(password) },
    });
    const membership = await prisma.membership.create({
      data: { userId, organizationId, productId, status: 'ACTIVE' }, select: { id: true },
    });
    membershipId = membership.id;
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

  it('rejects an incorrect password and increments failed-login state', async () => {
    await assert.rejects(auth.login({
      email: 'AUTH-TEST@example.test', password: 'Wrong-Password-2026!',
      organizationId, productCode: 'nova-comercial-auth-test',
    }));
    const credential = await prisma.credential.findUniqueOrThrow({ where: { userId } });
    assert.equal(credential.failedLoginAttempts, 1);
  });

  it('logs in, signs a tenant-bound access token and rotates refresh tokens exactly once', async () => {
    const first = await auth.login({
      email: 'AUTH-TEST@example.test', password, organizationId,
      productCode: 'nova-comercial-auth-test',
    });
    const claims = tokens.verifyAccessToken(first.accessToken);
    assert.equal(claims?.sub, userId);
    assert.equal(claims?.tenantId, organizationId);
    assert.equal(claims?.product, 'nova-comercial-auth-test');
    assert.equal(claims?.membershipId, membershipId);

    const second = await auth.refresh(first.refreshToken);
    assert.notEqual(second.refreshToken, first.refreshToken);
    await assert.rejects(auth.refresh(first.refreshToken));
    assert.ok(tokens.verifyAccessToken(second.accessToken));
  });

  it('authorizes access only while the exact session, membership, user, tenant and product remain active', async () => {
    const loggedIn = await auth.login({
      email: 'auth-test@example.test', password, organizationId,
      productCode: 'nova-comercial-auth-test',
    });
    const claims = tokens.verifyAccessToken(loggedIn.accessToken);
    assert.ok(claims);
    const active = await identity.findActiveSession({
      sessionId: claims.sid,
      membershipId: claims.membershipId,
      userId: claims.sub,
      organizationId: claims.tenantId,
      productCode: claims.product,
    });
    assert.ok(active);
    assert.equal(active.id, claims.sid);

    await auth.logout(loggedIn.refreshToken);
    const revoked = await identity.findActiveSession({
      sessionId: claims.sid,
      membershipId: claims.membershipId,
      userId: claims.sub,
      organizationId: claims.tenantId,
      productCode: claims.product,
    });
    assert.equal(revoked, null);
  });

  it('revokes the current refresh session on logout', async () => {
    const loggedIn = await auth.login({
      email: 'auth-test@example.test', password, organizationId,
      productCode: 'nova-comercial-auth-test',
    });
    assert.deepEqual(await auth.logout(loggedIn.refreshToken), { revoked: true });
    await assert.rejects(auth.refresh(loggedIn.refreshToken));
  });
});
