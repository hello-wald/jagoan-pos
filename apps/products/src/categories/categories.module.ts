import { Module } from '@nestjs/common';
import { RedisModule } from '@jagoan-pos/redis';
import { ProductsPrismaModule } from '../prisma/prisma.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [ProductsPrismaModule, RedisModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
