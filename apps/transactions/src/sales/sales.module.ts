import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { TransactionsPrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TransactionsPrismaModule, RpcClientsModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
