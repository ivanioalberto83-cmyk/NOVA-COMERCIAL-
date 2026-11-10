import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from './public.decorator';
import { SupabaseAuthRequestValidationPipe } from './supabase-auth-request-validation.pipe';
import { SupabaseAuthService } from './supabase-auth.service';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: SupabaseAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body(new SupabaseAuthRequestValidationPipe('login')) body: {
    email: string; password: string; organizationId: string; productCode: string;
  }) {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new SupabaseAuthRequestValidationPipe('refresh')) body: {
    refreshToken: string; organizationId: string; productCode: string;
  }) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Headers('authorization') authorization?: string) {
    if (typeof authorization !== 'string' || !/^Bearer\\s+\\S+$/i.test(authorization)) {
      throw new UnauthorizedException('A valid bearer token is required');
    }
    return this.auth.logout(authorization.replace(/^Bearer\\s+/i, ''));
  }
}
