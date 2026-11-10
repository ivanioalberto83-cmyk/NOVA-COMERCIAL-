import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordService } from './password.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthClient } from './supabase-auth.client';
import { createSupabaseAuthClient } from './supabase-auth.module.providers';

@Module({
  imports: [IdentityModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthService,
    { provide: SupabaseAuthClient, useFactory: createSupabaseAuthClient },
    PasswordService,
    { provide: AuthTokenService, useFactory: () => new AuthTokenService(process.env.JWT_SECRET ?? '') },
  ],
  exports: [AuthService, AuthTokenService, PasswordService, SupabaseAuthService],
})
export class AuthModule {}
