import { Global, Module } from '@nestjs/common';
import { ProductsPrismaService } from './prisma.service';

@Global()
@Module({
  providers: [ProductsPrismaService],
  exports: [ProductsPrismaService],
})
export class ProductsPrismaModule {}
