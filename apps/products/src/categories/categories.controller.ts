import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import type { ProductsRequest, ProductsResponse } from "@jagoan-pos/contracts";
import { CategoriesService } from "./categories.service";
import { CategoryListQueryDto, CreateCategoryDto } from "./dto/category.dto";

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @MessagePattern("categories.create")
  create(@Payload() dto: CreateCategoryDto): Promise<ProductsResponse<"categories.create">> {
    return this.categoriesService.create(dto);
  }

  @MessagePattern("categories.list")
  list(@Payload() query: CategoryListQueryDto): Promise<ProductsResponse<"categories.list">> {
    return this.categoriesService.list(query);
  }

  @MessagePattern("categories.getById")
  getById(
    @Payload() payload: ProductsRequest<"categories.getById">,
  ): Promise<ProductsResponse<"categories.getById">> {
    return this.categoriesService.getById(payload.id);
  }

  @MessagePattern("categories.update")
  update(
    @Payload() payload: ProductsRequest<"categories.update">,
  ): Promise<ProductsResponse<"categories.update">> {
    return this.categoriesService.update(payload.id, payload.dto);
  }

  @MessagePattern("categories.setActive")
  setActive(
    @Payload() payload: ProductsRequest<"categories.setActive">,
  ): Promise<ProductsResponse<"categories.setActive">> {
    return this.categoriesService.setActive(payload.id, payload.dto.isActive);
  }
}
