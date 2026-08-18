import { Module } from '@nestjs/common';
import { ProductsPrismaModule } from '../prisma/prisma.module';
import { ProductStorageModule } from '../storage/product-storage.module';
import { RedisModule } from '@jagoan-pos/redis';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [ProductsPrismaModule, ProductStorageModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
