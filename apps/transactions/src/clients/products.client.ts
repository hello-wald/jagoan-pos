import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import type { ProductsPattern, ProductsRequest, ProductsResponse } from '@jagoan-pos/contracts';
import type { TransactionsEnv } from '../config/env.schema';

export const PRODUCTS_CLIENT = 'PRODUCTS_CLIENT';

@Injectable()
export class ProductsClient {
  private readonly timeoutMs: number;

  constructor(
    @Inject(PRODUCTS_CLIENT) private readonly client: ClientProxy,
    config: ConfigService<TransactionsEnv, true>,
  ) {
    this.timeoutMs = config.get('PRODUCTS_RPC_TIMEOUT_MS', { infer: true });
  }

  send<P extends ProductsPattern>(
    pattern: P,
    data: ProductsRequest<P>,
  ): Promise<ProductsResponse<P>> {
    return lastValueFrom(
      this.client
        .send<ProductsResponse<P>, ProductsRequest<P>>(pattern, data)
        .pipe(timeout(this.timeoutMs)),
    );
  }
}
