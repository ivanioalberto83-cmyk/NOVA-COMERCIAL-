import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { AuthModule } from './auth/auth.module';

@Module({ imports: [IdentityModule, AuthModule], controllers: [HealthController] })
export class AppModule {}
