import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityRepository } from '../identity/identity.repository';
import { PasswordService } from './password.service';
import { AuthTokenService } from './auth-token.service';

const INVALID_LOGIN = 'Invalid credentials or inactive access';
const REFRESH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly identity: IdentityRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(input: { email: string; password: string; organizationId: string; productCode: string }) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = input.password;
    if (!email || !email.includes('@') || typeof password !== 'string' || password.length < 12 || password.length > 128 || !input.organizationId || !input.productCode) {
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    const account = await this.identity.findUserForAuthentication(email);
    if (!account || account.status !== 'ACTIVE' || !account.credential) {
      await this.passwords.hash(password);
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    if (account.credential.lockedUntil && account.credential.lockedUntil.getTime() > Date.now()) {
      await this.passwords.hash(password);
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    const validPassword = await this.passwords.verify(account.credential.passwordHash, password);
    if (!validPassword) {
      await this.identity.recordFailedLogin(account.id);
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    await this.identity.clearFailedLogins(account.id);

    const membership = await this.identity.findActiveMembership(account.id, input.organizationId, input.productCode);
    if (!membership) throw new UnauthorizedException(INVALID_LOGIN);

    const refreshToken = this.tokens.createRefreshToken();
    const session = await this.identity.createSession({
      membershipId: membership.id,
      organizationId: membership.organizationId,
      productId: membership.productId,
      refreshTokenHash: this.tokens.hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
    });
    return this.issueTokens(account.id, membership.id, membership.organizationId, membership.product.code, session.id, refreshToken);
  }

  async refresh(refreshToken: string) {
    if (typeof refreshToken !== 'string' || refreshToken.length < 40 || refreshToken.length > 200) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const oldHash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.identity.findRefreshSessionByHash(oldHash);
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now ||
        session.membership.status !== 'ACTIVE' || session.membership.user.status !== 'ACTIVE' ||
        session.membership.organization.status !== 'ACTIVE' || session.membership.product.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRefreshToken = this.tokens.createRefreshToken();
    const rotated = await this.identity.rotateRefreshSession(
      session.id, oldHash, this.tokens.hashRefreshToken(nextRefreshToken), now,
    );
    if (!rotated) throw new UnauthorizedException('Invalid refresh token');

    return this.issueTokens(
      session.membership.user.id,
      session.membershipId,
      session.membership.organizationId,
      session.membership.product.code,
      session.id,
      nextRefreshToken,
    );
  }


  async authorizeAccessToken(token: string) {
    const claims = this.tokens.verifyAccessToken(token);
    if (!claims) return null;
    const session = await this.identity.findActiveSession({
      sessionId: claims.sid,
      membershipId: claims.membershipId,
      userId: claims.sub,
      organizationId: claims.tenantId,
      productCode: claims.product,
    });
    if (!session) return null;
    const roles = session.membership.roles.map(item => item.role.code);
    const permissions = [...new Set(
      session.membership.roles.flatMap(item =>
        item.role.permissions.map(grant => grant.permission.code),
      ),
    )];
    return { ...claims, roles, permissions };
  }

  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    if (typeof refreshToken !== 'string' || refreshToken.length < 40 || refreshToken.length > 200) {
      return { revoked: false };
    }
    return { revoked: await this.identity.revokeRefreshSessionByHash(this.tokens.hashRefreshToken(refreshToken)) };
  }

  private issueTokens(userId: string, membershipId: string, tenantId: string, product: string, sessionId: string, refreshToken: string) {
    const accessToken = this.tokens.signAccessToken({
      sub: userId, sid: sessionId, membershipId, tenantId, product,
    });
    return { tokenType: 'Bearer', accessToken, expiresIn: 900, refreshToken };
  }
}
