import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type {
  TransactionsPattern,
  TransactionsRequest,
  TransactionsResponse,
} from '@jagoan-pos/contracts';

export const TRANSACTIONS_CLIENT = 'TRANSACTIONS_CLIENT';

@Injectable()
export class TransactionsClient {
  constructor(@Inject(TRANSACTIONS_CLIENT) private readonly client: ClientProxy) {}

  send<P extends TransactionsPattern>(
    pattern: P,
    data: TransactionsRequest<P>,
  ): Promise<TransactionsResponse<P>> {
    return lastValueFrom(
      this.client.send<TransactionsResponse<P>, TransactionsRequest<P>>(pattern, data),
    );
  }
}
