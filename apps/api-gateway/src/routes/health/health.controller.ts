import { Controller, Get } from '@nestjs/common';

/** Liveness only. The compose healthcheck polls /api/health. */
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
