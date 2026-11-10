import { Module } from '@nestjs/common';
import { IdentityRepository } from './identity.repository';
import { PrismaModule } from '../persistence/prisma.module';
import { SupabaseIdentityRepository } from './supabase-identity.repository';

@Module({
  imports: [PrismaModule],
  providers: [IdentityRepository, SupabaseIdentityRepository],
  exports: [IdentityRepository, SupabaseIdentityRepository],
})
export class IdentityModule {}
