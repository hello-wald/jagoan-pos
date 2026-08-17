import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { TransactionsPrismaModule } from '../prisma/prisma.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TransactionsPrismaModule, RpcClientsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
