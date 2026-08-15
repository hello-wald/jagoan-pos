import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { ProductsRequest, ProductsResponse } from '@jagoan-pos/contracts';
import {
  CreateProductDto,
  ProductListQueryDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern('products.create')
  create(@Payload() dto: CreateProductDto): Promise<ProductsResponse<'products.create'>> {
    return this.productsService.create(dto);
  }

  @MessagePattern('products.list')
  list(@Payload() query: ProductListQueryDto): Promise<ProductsResponse<'products.list'>> {
    return this.productsService.list(query);
  }

  @MessagePattern('products.getById')
  getById(
    @Payload() payload: ProductsRequest<'products.getById'>,
  ): Promise<ProductsResponse<'products.getById'>> {
    return this.productsService.getById(payload.id);
  }

  @MessagePattern('products.update')
  update(
    @Payload() payload: ProductsRequest<'products.update'>,
  ): Promise<ProductsResponse<'products.update'>> {
    return this.productsService.update(payload.id, payload.dto);
  }

  @MessagePattern('products.setActive')
  setActive(
    @Payload() payload: ProductsRequest<'products.setActive'>,
  ): Promise<ProductsResponse<'products.setActive'>> {
    return this.productsService.setActive(payload.id, payload.dto.isActive);
  }

  @MessagePattern('products.delete')
  delete(@Payload() payload: ProductsRequest<'products.delete'>): Promise<never> {
    return this.productsService.rejectPermanentDelete(payload.id);
  }
}
