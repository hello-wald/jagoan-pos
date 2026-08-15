import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PaginatedProducts, Product } from '@jagoan-pos/contracts';
import { ProductsClient } from '../clients/products.client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateProductDto,
  ProductListQueryDto,
  SetProductActiveDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GLOBAL_ADMIN')
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly products: ProductsClient) {}

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.products.send('products.create', dto);
  }

  @Get()
  list(@Query() query: ProductListQueryDto): Promise<PaginatedProducts> {
    return this.products.send('products.list', query);
  }

  @Get(':productId')
  getById(@Param('productId', ParseUUIDPipe) id: string): Promise<Product> {
    return this.products.send('products.getById', { id });
  }

  @Patch(':productId')
  update(
    @Param('productId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.products.send('products.update', { id, dto });
  }

  @Patch(':productId/status')
  setActive(
    @Param('productId', ParseUUIDPipe) id: string,
    @Body() dto: SetProductActiveDto,
  ): Promise<Product> {
    return this.products.send('products.setActive', { id, dto });
  }

  @Delete(':productId')
  delete(@Param('productId', ParseUUIDPipe) id: string): Promise<never> {
    return this.products.send('products.delete', { id });
  }
}
