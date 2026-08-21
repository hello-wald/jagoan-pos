import { Test } from '@nestjs/testing';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ProductsClient } from '../../clients/products.client';
import { CatalogCategoriesController } from './catalog-categories.controller';

describe('CatalogCategoriesController', () => {
  let controller: CatalogCategoriesController;
  const products = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CatalogCategoriesController],
      providers: [{ provide: ProductsClient, useValue: products }],
    }).compile();

    controller = module.get<CatalogCategoriesController>(CatalogCategoriesController);
  });

  it('lists active catalog categories through the products service', async () => {
    products.send.mockResolvedValueOnce([]);

    await controller.list();

    expect(products.send).toHaveBeenCalledWith('categories.list', { activeOnly: true });
  });

  it('is restricted to cashiers', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CatalogCategoriesController)).toEqual(['CASHIER']);
  });
});
