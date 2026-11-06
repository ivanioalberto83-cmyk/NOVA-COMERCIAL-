import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { AuthModule } from './auth/auth.module';
import { AuthSessionGuard } from './auth/auth-session.guard';
import { AuthorizationGuard } from './security/authorization.guard';

@Module({
  imports: [IdentityModule, AuthModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthSessionGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
})
export class AppModule {}
