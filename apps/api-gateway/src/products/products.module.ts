import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { ProductsController } from './products.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
