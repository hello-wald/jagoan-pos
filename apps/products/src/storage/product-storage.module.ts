import { Module } from "@nestjs/common";
import { ProductStorageService } from "./product-storage.service";

@Module({
  providers: [ProductStorageService],
  exports: [ProductStorageService],
})
export class ProductStorageModule {}
