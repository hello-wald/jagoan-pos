import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CategoryWithUsage } from '@jagoan-pos/contracts';
import { ProductsClient } from '../../clients/products.client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Catalog categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CASHIER')
@Controller('categories')
export class CatalogCategoriesController {
  constructor(private readonly products: ProductsClient) {}

  @Get()
  list(): Promise<CategoryWithUsage[]> {
    return this.products.send('categories.list', { activeOnly: true });
  }
}
