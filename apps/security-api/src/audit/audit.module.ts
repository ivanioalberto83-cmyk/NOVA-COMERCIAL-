import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma.module';
import { SupabaseAuditRepository } from './supabase-audit.repository';

@Module({
  imports: [PrismaModule],
  providers: [SupabaseAuditRepository],
  exports: [SupabaseAuditRepository],
})
export class AuditModule {}
