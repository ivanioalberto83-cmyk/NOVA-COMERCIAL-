import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordService } from './password.service';

@Module({
  imports: [IdentityModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    { provide: AuthTokenService, useFactory: () => new AuthTokenService(process.env.JWT_SECRET ?? '') },
  ],
  exports: [AuthService, AuthTokenService, PasswordService],
})
export class AuthModule {}
