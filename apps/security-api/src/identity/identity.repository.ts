import { Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../persistence/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async findUserForAuthentication(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
        credential: {
          select: { passwordHash: true, failedLoginAttempts: true, lockedUntil: true },
        },
      },
    });
  }

  async recordFailedLogin(userId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const credential = await tx.credential.update({
        where: { userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });
      if (credential.failedLoginAttempts >= 5) {
        await tx.credential.update({
          where: { userId },
          data: { lockedUntil: new Date(now.getTime() + 15 * 60 * 1000) },
        });
      }
    });
  }

  async clearFailedLogins(userId: string): Promise<void> {
    await this.prisma.credential.update({
      where: { userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }


  async findActiveSession(input: {
    sessionId: string;
    membershipId: string;
    userId: string;
    organizationId: string;
    productCode: string;
    now?: Date;
  }) {
    return this.prisma.securitySession.findFirst({
      where: {
        id: input.sessionId,
        membershipId: input.membershipId,
        organizationId: input.organizationId,
        revokedAt: null,
        expiresAt: { gt: input.now ?? new Date() },
        membership: {
          status: MembershipStatus.ACTIVE,
          userId: input.userId,
          user: { status: 'ACTIVE' },
          organization: { status: 'ACTIVE' },
          product: { code: input.productCode, status: 'ACTIVE' },
        },
      },
      select: {
        id: true,
        membershipId: true,
        organizationId: true,
        productId: true,
        expiresAt: true,
        revokedAt: true,
        membership: {
          select: {
            roles: {
              select: {
                role: {
                  select: {
                    code: true,
                    permissions: {
                      select: { permission: { select: { code: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findRefreshSessionByHash(refreshTokenHash: string) {
    return this.prisma.securitySession.findUnique({
      where: { refreshTokenHash },
      include: {
        membership: {
          include: {
            user: { select: { id: true, status: true } },
            organization: { select: { id: true, status: true } },
            product: { select: { id: true, code: true, status: true } },
          },
        },
      },
    });
  }

  async rotateRefreshSession(
    sessionId: string,
    oldHash: string,
    newHash: string,
    now = new Date(),
  ): Promise<boolean> {
    const result = await this.prisma.securitySession.updateMany({
      where: { id: sessionId, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: now } },
      data: { refreshTokenHash: newHash, lastUsedAt: now },
    });
    return result.count === 1;
  }

  async revokeRefreshSessionByHash(refreshTokenHash: string): Promise<boolean> {
    const result = await this.prisma.securitySession.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
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
