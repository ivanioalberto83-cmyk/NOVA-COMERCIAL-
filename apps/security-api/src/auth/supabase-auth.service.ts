import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseIdentityRepository } from '../identity/supabase-identity.repository';
import { SupabaseAuthClient, SupabaseAuthSession, SupabaseAuthUser } from './supabase-auth.client';

const INVALID_ACCESS = 'Invalid credentials or inactive access';

export interface SupabasePrincipal {
  sub: string;
  email?: string;
  tenantId: string;
  membershipId: string;
  productId: string;
  product: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class SupabaseAuthService {
  constructor(
    private readonly provider: SupabaseAuthClient,
    private readonly identity: SupabaseIdentityRepository,
  ) {}

  async login(input: { email: string; password: string; organizationId: string; productCode: string }) {
    let session: SupabaseAuthSession;
    try {
      session = await this.provider.signInWithPassword(input.email.trim().toLowerCase(), input.password);
    } catch {
      throw new UnauthorizedException(INVALID_ACCESS);
    }

    const membership = await this.identity.findActiveProductMembership(
      session.user.id, input.organizationId, input.productCode,
    );
    if (!membership) {
      await this.provider.signOut(session.accessToken).catch(() => undefined);
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    return {
      tokenType: session.tokenType,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      organizationId: membership.organizationId,
      membershipId: membership.membershipId,
      productCode: membership.productCode,
      roles: membership.roles,
      permissions: membership.permissions,
    };
  }

  async refresh(input: { refreshToken: string; organizationId: string; productCode: string }) {
    let session: SupabaseAuthSession;
    try {
      session = await this.provider.refreshSession(input.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const membership = await this.identity.findActiveProductMembership(
      session.user.id, input.organizationId, input.productCode,
    );
    if (!membership) {
      await this.provider.signOut(session.accessToken).catch(() => undefined);
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    return {
      tokenType: session.tokenType,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      organizationId: membership.organizationId,
      membershipId: membership.membershipId,
      productCode: membership.productCode,
      roles: membership.roles,
      permissions: membership.permissions,
    };
  }

  async logout(accessToken: string): Promise<{ revoked: boolean }> {
    try {
      await this.provider.signOut(accessToken);
      return { revoked: true };
    } catch {
      return { revoked: false };
    }
  }

  async authorizeAccessToken(
    accessToken: string,
    organizationId: string,
    productCode: string,
  ): Promise<SupabasePrincipal | null> {
    let user: SupabaseAuthUser;
    try {
      user = await this.provider.getUser(accessToken);
    } catch {
      return null;
    }
    if (!organizationId || !productCode) return null;
    const membership = await this.identity.findActiveProductMembership(
      user.id, organizationId, productCode,
    );
    if (!membership) return null;
    return {
      sub: user.id,
      ...(user.email ? { email: user.email } : {}),
      tenantId: membership.organizationId,
      membershipId: membership.membershipId,
      productId: membership.productId,
      product: membership.productCode,
      roles: membership.roles,
      permissions: membership.permissions,
    };
  }
}
