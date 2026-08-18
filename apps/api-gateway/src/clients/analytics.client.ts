import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type { AiPattern, AiRequest, AiResponse } from '@jagoan-pos/contracts';

export const ANALYTICS_CLIENT = 'ANALYTICS_CLIENT';

@Injectable()
export class AnalyticsClient {
  constructor(@Inject(ANALYTICS_CLIENT) private readonly client: ClientProxy) {}

  send<P extends AiPattern>(pattern: P, data: AiRequest<P>): Promise<AiResponse<P>> {
    return lastValueFrom(this.client.send<AiResponse<P>, AiRequest<P>>(pattern, data));
  }
}
