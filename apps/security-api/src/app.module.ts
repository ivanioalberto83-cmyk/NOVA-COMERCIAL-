import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthSessionGuard } from './auth/supabase-auth-session.guard';
import { AuthorizationGuard } from './security/authorization.guard';
import { MasterDataModule } from './master-data/master-data.module';

@Module({
  imports: [IdentityModule, AuthModule, MasterDataModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: SupabaseAuthSessionGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
})
export class AppModule {}
