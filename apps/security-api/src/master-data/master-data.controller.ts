import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, ForbiddenException,
} from '@nestjs/common';
import { RequirePermissions } from '../security/require-permissions.decorator';
import { MasterDataContext, MasterDataResource, MasterDataService } from './master-data.service';
import { SupabasePrincipal } from '../auth/supabase-auth.service';

type AuthenticatedRequest = { auth?: SupabasePrincipal };

abstract class MasterDataResourceController {
  constructor(protected readonly service: MasterDataService) {}

  protected context(request: AuthenticatedRequest): MasterDataContext {
    const auth = request.auth;
    if (!auth) throw new ForbiddenException('A verified NOVA COMERCIAL session is required');
    return {
      userId: auth.sub,
      organizationId: auth.tenantId,
      productId: auth.productId,
      productCode: auth.product,
    };
  }

  protected listResource(resource: MasterDataResource, request: AuthenticatedRequest, query: unknown) {
    return this.service.list(resource, this.context(request), query);
  }

  protected getResource(resource: MasterDataResource, request: AuthenticatedRequest, id: string) {
    return this.service.get(resource, this.context(request), id);
  }

  protected createResource(resource: MasterDataResource, request: AuthenticatedRequest, body: unknown) {
    return this.service.create(resource, this.context(request), body);
  }

  protected updateResource(resource: MasterDataResource, request: AuthenticatedRequest, id: string, body: unknown) {
    return this.service.update(resource, this.context(request), id, body);
  }
}

@Controller('master-data/branches')
export class BranchesController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.branches.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('branches', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.branches.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('branches', request, id);
  }

  @Post()
  @RequirePermissions('master_data.branches.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('branches', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.branches.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('branches', request, id, body);
  }
}

@Controller('master-data/fiscal-periods')
export class FiscalPeriodsController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.fiscal_periods.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('fiscal_periods', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.fiscal_periods.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('fiscal_periods', request, id);
  }

  @Post()
  @RequirePermissions('master_data.fiscal_periods.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('fiscal_periods', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.fiscal_periods.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('fiscal_periods', request, id, body);
  }
}

@Controller('master-data/currencies')
export class CurrenciesController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.currencies.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('currencies', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.currencies.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('currencies', request, id);
  }

  @Post()
  @RequirePermissions('master_data.currencies.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('currencies', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.currencies.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('currencies', request, id, body);
  }
}

@Controller('master-data/units-of-measure')
export class UnitsOfMeasureController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.units_of_measure.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('units_of_measure', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.units_of_measure.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('units_of_measure', request, id);
  }

  @Post()
  @RequirePermissions('master_data.units_of_measure.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('units_of_measure', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.units_of_measure.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('units_of_measure', request, id, body);
  }
}

@Controller('master-data/tax-codes')
export class TaxCodesController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.tax_codes.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('tax_codes', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.tax_codes.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('tax_codes', request, id);
  }

  @Post()
  @RequirePermissions('master_data.tax_codes.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('tax_codes', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.tax_codes.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('tax_codes', request, id, body);
  }
}

@Controller('master-data/payment-methods')
export class PaymentMethodsController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.payment_methods.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('payment_methods', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.payment_methods.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('payment_methods', request, id);
  }

  @Post()
  @RequirePermissions('master_data.payment_methods.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('payment_methods', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.payment_methods.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('payment_methods', request, id, body);
  }
}

@Controller('master-data/customers')
export class CustomersController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.customers.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('customers', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.customers.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('customers', request, id);
  }

  @Post()
  @RequirePermissions('master_data.customers.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('customers', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.customers.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('customers', request, id, body);
  }
}

@Controller('master-data/suppliers')
export class SuppliersController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.suppliers.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('suppliers', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.suppliers.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('suppliers', request, id);
  }

  @Post()
  @RequirePermissions('master_data.suppliers.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('suppliers', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.suppliers.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('suppliers', request, id, body);
  }
}

@Controller('master-data/item-categories')
export class ItemCategoriesController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.item_categories.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('item_categories', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.item_categories.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('item_categories', request, id);
  }

  @Post()
  @RequirePermissions('master_data.item_categories.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('item_categories', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.item_categories.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('item_categories', request, id, body);
  }
}

@Controller('master-data/items')
export class ItemsController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.items.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('items', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.items.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('items', request, id);
  }

  @Post()
  @RequirePermissions('master_data.items.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('items', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.items.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('items', request, id, body);
  }
}

@Controller('master-data/warehouses')
export class WarehousesController extends MasterDataResourceController {
  constructor(service: MasterDataService) { super(service); }

  @Get()
  @RequirePermissions('master_data.warehouses.read')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.listResource('warehouses', request, query);
  }

  @Get(':id')
  @RequirePermissions('master_data.warehouses.read')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.getResource('warehouses', request, id);
  }

  @Post()
  @RequirePermissions('master_data.warehouses.create')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.createResource('warehouses', request, body);
  }

  @Patch(':id')
  @RequirePermissions('master_data.warehouses.update')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.updateResource('warehouses', request, id, body);
  }
}

