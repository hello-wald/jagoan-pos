import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type { CorePattern, CoreRequest, CoreResponse } from '@jagoan-pos/contracts';

export const CORE_CLIENT = 'CORE_CLIENT';

/** Typed access to the core service: the pattern fixes both payload and result. */
@Injectable()
export class CoreClient {
  constructor(@Inject(CORE_CLIENT) private readonly client: ClientProxy) {}

  send<P extends CorePattern>(pattern: P, data: CoreRequest<P>): Promise<CoreResponse<P>> {
    return lastValueFrom(this.client.send<CoreResponse<P>, CoreRequest<P>>(pattern, data));
  }
}
