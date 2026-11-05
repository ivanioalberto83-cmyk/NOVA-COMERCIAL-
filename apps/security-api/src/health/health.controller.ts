import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok'; service: 'nova-security-api' } {
    return { status: 'ok', service: 'nova-security-api' };
  }
}
