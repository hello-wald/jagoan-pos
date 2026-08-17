import { Test } from '@nestjs/testing';
import { PRODUCTS_CLIENT, ProductsClient } from './clients/products.client';
import { InventoryModule } from './inventory/inventory.module';
import { InventoryService } from './inventory/inventory.service';
import { SalesModule } from './sales/sales.module';
import { SalesService } from './sales/sales.service';
import { AppModule } from './app.module';

process.env.TRANSACTIONS_DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.TRANSACTIONS_DIRECT_URL = 'postgresql://user:pass@localhost:5432/db';

/**
 * Every other spec constructs services directly with mocks, so nothing else
 * exercises the module graph. compile() builds the injector without firing
 * onModuleInit, so no connection is opened.
 */
describe('AppModule wiring', () => {
  it('shares one products client between sales and inventory', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(moduleRef.get(SalesService, { strict: false })).toBeDefined();
    expect(moduleRef.get(InventoryService, { strict: false })).toBeDefined();

    // A feature module registering its own proxy instead of importing
    // RpcClientsModule would give each its own instance, and the service would
    // open a second TCP connection to products.
    const fromSales = moduleRef.select(SalesModule).get(ProductsClient, { strict: false });
    const fromInventory = moduleRef.select(InventoryModule).get(ProductsClient, { strict: false });
    expect(fromInventory).toBe(fromSales);

    expect(moduleRef.select(InventoryModule).get(PRODUCTS_CLIENT, { strict: false })).toBe(
      moduleRef.select(SalesModule).get(PRODUCTS_CLIENT, { strict: false }),
    );

    await moduleRef.close();
  });
});
