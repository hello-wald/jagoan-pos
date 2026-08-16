import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { TransactionsController } from './transactions.controller';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [TransactionsController, InventoryController],
})
export class TransactionsModule {}
