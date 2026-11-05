import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';

@Module({ imports: [IdentityModule], controllers: [HealthController] })
export class AppModule {}
