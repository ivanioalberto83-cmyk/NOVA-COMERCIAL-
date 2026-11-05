import { Module } from '@nestjs/common';
import { IdentityRepository } from './identity.repository';
import { PrismaModule } from '../persistence/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [IdentityRepository],
  exports: [IdentityRepository],
})
export class IdentityModule {}
