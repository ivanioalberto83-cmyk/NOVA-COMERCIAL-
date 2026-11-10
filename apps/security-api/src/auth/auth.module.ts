import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthClient } from './supabase-auth.client';
import { createSupabaseAuthClient } from './supabase-auth.module.providers';

@Module({
  imports: [IdentityModule],
  controllers: [AuthController],
  providers: [
    SupabaseAuthService,
    { provide: SupabaseAuthClient, useFactory: createSupabaseAuthClient },
  ],
  exports: [SupabaseAuthService],
})
export class AuthModule {}
