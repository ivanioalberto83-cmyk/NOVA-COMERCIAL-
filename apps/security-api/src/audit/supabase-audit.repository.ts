import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

@Injectable()
export class SupabaseAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async write(_event: unknown): Promise<void> {
    throw new Error('Audit repository is not implemented');
  }
}
