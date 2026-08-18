import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type { ReportsPattern, ReportsRequest, ReportsResponse } from '@jagoan-pos/contracts';

export const REPORTS_CLIENT = 'REPORTS_CLIENT';

@Injectable()
export class ReportsClient {
  constructor(@Inject(REPORTS_CLIENT) private readonly client: ClientProxy) {}

  send<P extends ReportsPattern>(pattern: P, data: ReportsRequest<P>): Promise<ReportsResponse<P>> {
    return lastValueFrom(this.client.send<ReportsResponse<P>, ReportsRequest<P>>(pattern, data));
  }
}
