import { Injectable } from '@nestjs/common';
import { MembershipStatus, PrismaClient } from '@prisma/client';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveMembership(
    userId: string,
    organizationId: string,
    productCode: string,
  ) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        organization: { status: 'ACTIVE' },
        product: { code: productCode, status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        productId: true,
        status: true,
        product: { select: { code: true } },
        roles: {
          select: {
            role: {
              select: {
                code: true,
                permissions: { select: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });
  }

  async createSession(input: {
    membershipId: string;
    organizationId: string;
    productId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }) {
    if (!input.refreshTokenHash || input.refreshTokenHash.trim().length < 32) {
      throw new Error('A refresh token hash with at least 32 characters is required');
    }
    if (input.expiresAt.getTime() <= Date.now()) {
      throw new Error('Session expiry must be in the future');
    }

    return this.prisma.securitySession.create({
      data: {
        membershipId: input.membershipId,
        organizationId: input.organizationId,
        productId: input.productId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
      },
      select: { id: true, membershipId: true, expiresAt: true, createdAt: true },
    });
  }

  async revokeSession(sessionId: string, membershipId: string): Promise<boolean> {
    const result = await this.prisma.securitySession.updateMany({
      where: { id: sessionId, membershipId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
  }
}
