import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma.module';
import { SupabaseIdentityRepository } from './supabase-identity.repository';

@Module({
  imports: [PrismaModule],
  providers: [SupabaseIdentityRepository],
  exports: [SupabaseIdentityRepository],
})
export class IdentityModule {}
