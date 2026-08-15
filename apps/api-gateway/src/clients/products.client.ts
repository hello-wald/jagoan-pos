import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type {
  ProductsPattern,
  ProductsRequest,
  ProductsResponse,
} from '@jagoan-pos/contracts';

export const PRODUCTS_CLIENT = 'PRODUCTS_CLIENT';

@Injectable()
export class ProductsClient {
  constructor(@Inject(PRODUCTS_CLIENT) private readonly client: ClientProxy) {}

  send<P extends ProductsPattern>(
    pattern: P,
    data: ProductsRequest<P>,
  ): Promise<ProductsResponse<P>> {
    return lastValueFrom(this.client.send<ProductsResponse<P>, ProductsRequest<P>>(pattern, data));
  }
}
