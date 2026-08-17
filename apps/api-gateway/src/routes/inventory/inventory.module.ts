import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [InventoryController],
})
export class InventoryModule {}
