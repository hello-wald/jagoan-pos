import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { CategoriesController } from './categories.controller';
import { CatalogCategoriesController } from './catalog-categories.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [CategoriesController, CatalogCategoriesController],
})
export class CategoriesModule {}
