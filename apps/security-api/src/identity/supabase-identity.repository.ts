import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

export interface ActiveProductMembership {
  membershipId: string;
  organizationId: string;
  productId: string;
  productCode: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class SupabaseIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveProductMembership(
    userId: string,
    organizationId: string,
    productCode: string,
  ): Promise<ActiveProductMembership | null> {
    const memberships = await this.prisma.$queryRaw<Array<{
      membership_id: string;
      organization_id: string;
      product_id: string;
      product_code: string;
    }>>`
      SELECT m.id AS membership_id,
             m.organization_id,
             p.id AS product_id,
             p.code AS product_code
      FROM nova_core.memberships AS m
      JOIN nova_core.organizations AS o
        ON o.id = m.organization_id
      JOIN nova_core.organization_products AS op
        ON op.organization_id = m.organization_id
      JOIN nova_core.products AS p
        ON p.id = op.product_id
      WHERE m.user_id = ${userId}::uuid
        AND m.organization_id = ${organizationId}::uuid
        AND m.status = 'active'
        AND o.status = 'active'
        AND op.status = 'active'
        AND op.starts_at <= now()
        AND (op.ends_at IS NULL OR op.ends_at > now())
        AND p.code = ${productCode}
        AND p.status = 'active'
      LIMIT 1
    `;

    const membership = memberships[0];
    if (!membership) return null;

    const grants = await this.prisma.$queryRaw<Array<{
      role_code: string;
      permission_code: string | null;
    }>>`
      SELECT r.code AS role_code, p.code AS permission_code
      FROM nova_core.membership_roles AS mr
      JOIN nova_core.roles AS r ON r.id = mr.role_id
      LEFT JOIN nova_core.role_permissions AS rp ON rp.role_id = r.id
      LEFT JOIN nova_core.permissions AS p ON p.id = rp.permission_id
      WHERE mr.membership_id = ${membership.membership_id}::uuid
    `;

    return {
      membershipId: membership.membership_id,
      organizationId: membership.organization_id,
      productId: membership.product_id,
      productCode: membership.product_code,
      roles: [...new Set(grants.map((grant) => grant.role_code))],
      permissions: [...new Set(grants.flatMap((grant) => grant.permission_code ? [grant.permission_code] : []))],
    };
  }
}
