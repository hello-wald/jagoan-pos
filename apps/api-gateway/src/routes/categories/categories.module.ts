import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
