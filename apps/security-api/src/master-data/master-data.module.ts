import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MasterDataService } from './master-data.service';
import { BranchesController,
  FiscalPeriodsController,
  CurrenciesController,
  UnitsOfMeasureController,
  TaxCodesController,
  PaymentMethodsController,
  CustomersController,
  SuppliersController,
  ItemCategoriesController,
  ItemsController,
  WarehousesController } from './master-data.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BranchesController, FiscalPeriodsController, CurrenciesController, UnitsOfMeasureController, TaxCodesController, PaymentMethodsController, CustomersController, SuppliersController, ItemCategoriesController, ItemsController, WarehousesController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
