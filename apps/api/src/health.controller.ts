import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  ping() {
    return { ok: true, ts: new Date().toISOString() };
  }
}
