import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { SupabaseAuditRepository } from '../audit/supabase-audit.repository';

export interface MasterDataContext {
  userId: string;
  organizationId: string;
  productId: string;
  productCode: string;
}

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SupabaseAuditRepository,
  ) {}

  async list(_resource: string, _context: MasterDataContext, _query: unknown): Promise<unknown> {
    throw new Error('Master data service is not implemented');
  }

  async get(_resource: string, _context: MasterDataContext, _id: string): Promise<unknown> {
    throw new Error('Master data service is not implemented');
  }

  async create(_resource: string, _context: MasterDataContext, _body: unknown): Promise<unknown> {
    throw new Error('Master data service is not implemented');
  }

  async update(_resource: string, _context: MasterDataContext, _id: string, _body: unknown): Promise<unknown> {
    throw new Error('Master data service is not implemented');
  }
}
