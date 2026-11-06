import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { AuthRequestValidationPipe } from './auth-request-validation.pipe';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body(new AuthRequestValidationPipe('login')) body: { email: string; password: string; organizationId: string; productCode: string }) {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new AuthRequestValidationPipe('refresh')) body: { refreshToken: string }) {
    return this.auth.refresh(body?.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body(new AuthRequestValidationPipe('refresh')) body: { refreshToken: string }) {
    return this.auth.logout(body?.refreshToken);
  }
}
