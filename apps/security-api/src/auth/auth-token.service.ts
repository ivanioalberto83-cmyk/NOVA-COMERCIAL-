import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface AccessTokenClaims {
  sub: string; sid: string; membershipId: string; tenantId: string; product: string;
  iat: number; exp: number; iss: 'nova-security-core'; aud: 'nova-products';
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly secret = process.env.JWT_SECRET ?? '') {}
  createRefreshToken(): string { return randomBytes(48).toString('base64url'); }
  hashRefreshToken(token: string): string { return createHash('sha256').update(token, 'utf8').digest('hex'); }
  signAccessToken(input: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>, now = Date.now()): string {
    if (this.secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
    const issuedAt = Math.floor(now / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload: AccessTokenClaims = { ...input, iat: issuedAt, exp: issuedAt + 900, iss: 'nova-security-core', aud: 'nova-products' };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = header + '.' + body;
    const signature = createHmac('sha256', this.secret).update(signingInput).digest('base64url');
    return signingInput + '.' + signature;
  }
  verifyAccessToken(token: string, now = Date.now()): AccessTokenClaims | null {
    if (this.secret.length < 32 || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
      const signingInput = parts[0] + '.' + parts[1];
      const expected = createHmac('sha256', this.secret).update(signingInput).digest();
      const actual = Buffer.from(parts[2], 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as AccessTokenClaims;
      const required = [payload.sub, payload.sid, payload.membershipId, payload.tenantId, payload.product];
      if (required.some(value => typeof value !== 'string' || value.trim().length === 0)) return null;
      if (payload.iss !== 'nova-security-core' || payload.aud !== 'nova-products') return null;
      if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
      if (payload.exp <= Math.floor(now / 1000) || payload.iat > Math.floor(now / 1000) + 30) return null;
      return payload;
    } catch { return null; }
  }
}
