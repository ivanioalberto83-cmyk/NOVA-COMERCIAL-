import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REQUIRED_PERMISSIONS_KEY } from '../security/require-permissions.decorator';
import {
  BranchesController,
  FiscalPeriodsController,
  CurrenciesController,
  UnitsOfMeasureController,
  TaxCodesController,
  PaymentMethodsController,
  CustomersController,
  SuppliersController,
  ItemCategoriesController,
  ItemsController,
  WarehousesController,
} from '../master-data/master-data.controller';

const resources = [
  [BranchesController, 'master_data.branches'],
  [FiscalPeriodsController, 'master_data.fiscal_periods'],
  [CurrenciesController, 'master_data.currencies'],
  [UnitsOfMeasureController, 'master_data.units_of_measure'],
  [TaxCodesController, 'master_data.tax_codes'],
  [PaymentMethodsController, 'master_data.payment_methods'],
  [CustomersController, 'master_data.customers'],
  [SuppliersController, 'master_data.suppliers'],
  [ItemCategoriesController, 'master_data.item_categories'],
  [ItemsController, 'master_data.items'],
  [WarehousesController, 'master_data.warehouses'],
] as const;

describe('Master data controller permission policies', () => {
  it('requires resource-specific read, create and update permissions on every endpoint', () => {
    for (const [controller, resource] of resources) {
      assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller.prototype.list), [`${resource}.read`]);
      assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller.prototype.get), [`${resource}.read`]);
      assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller.prototype.create), [`${resource}.create`]);
      assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller.prototype.update), [`${resource}.update`]);
    }
  });
});
