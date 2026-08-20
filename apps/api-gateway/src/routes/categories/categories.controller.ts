import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Category, CategoryWithUsage } from '@jagoan-pos/contracts';
import { ProductsClient } from '../../clients/products.client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CategoryListQueryDto,
  CreateCategoryDto,
  SetCategoryActiveDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GLOBAL_ADMIN')
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly products: ProductsClient) {}

  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.products.send('categories.create', dto);
  }

  @Get()
  list(@Query() query: CategoryListQueryDto): Promise<CategoryWithUsage[]> {
    return this.products.send('categories.list', query);
  }

  @Get(':categoryId')
  getById(@Param('categoryId', ParseUUIDPipe) id: string): Promise<Category> {
    return this.products.send('categories.getById', { id });
  }

  @Patch(':categoryId')
  update(
    @Param('categoryId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.products.send('categories.update', { id, dto });
  }

  // No DELETE: a category in use is referenced by products, so it is retired
  // through this endpoint rather than removed.
  @Patch(':categoryId/status')
  setActive(
    @Param('categoryId', ParseUUIDPipe) id: string,
    @Body() dto: SetCategoryActiveDto,
  ): Promise<Category> {
    return this.products.send('categories.setActive', { id, dto });
  }
}
