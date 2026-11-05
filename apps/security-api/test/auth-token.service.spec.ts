import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthTokenService } from '../src/auth/auth-token.service';

describe('access and refresh token primitives', () => {
  const tokens = new AuthTokenService('test-secret-that-is-at-least-thirty-two-characters');
  it('issues signed access tokens with tenant and product claims', () => {
    const now = 1_800_000_000_000;
    const token = tokens.signAccessToken({ sub: 'user-1', sid: 'session-1', membershipId: 'membership-1', tenantId: 'tenant-a', product: 'nova-comercial' }, now);
    const claims = tokens.verifyAccessToken(token, now);
    assert.equal(claims?.sub, 'user-1');
    assert.equal(claims?.tenantId, 'tenant-a');
    assert.equal(claims?.product, 'nova-comercial');
  });
  it('rejects tampered, expired and malformed access tokens', () => {
    const now = 1_800_000_000_000;
    const token = tokens.signAccessToken({ sub: 'user-1', sid: 'session-1', membershipId: 'membership-1', tenantId: 'tenant-a', product: 'nova-comercial' }, now);
    assert.equal(tokens.verifyAccessToken(token + 'x', now), null);
    assert.equal(tokens.verifyAccessToken(token, now + 901_000), null);
    assert.equal(tokens.verifyAccessToken('not-a-jwt', now), null);
  });
  it('creates random opaque refresh tokens and stores only their SHA-256 digest', () => {
    const first = tokens.createRefreshToken();
    const second = tokens.createRefreshToken();
    assert.notEqual(first, second);
    assert.notEqual(tokens.hashRefreshToken(first), first);
    assert.equal(tokens.hashRefreshToken(first).length, 64);
  });
  it('refuses to sign tokens without a sufficiently strong secret', () => {
    const insecure = new AuthTokenService('weak');
    assert.throws(() => insecure.signAccessToken({ sub: 'u', sid: 's', membershipId: 'm', tenantId: 't', product: 'p' }), /JWT_SECRET/);
  });
});
