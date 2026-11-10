import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma.service';
import { SupabaseAuditRepository } from '../audit/supabase-audit.repository';

export type MasterDataResource =
  | 'branches'
  | 'fiscal_periods'
  | 'currencies'
  | 'units_of_measure'
  | 'tax_codes'
  | 'payment_methods'
  | 'customers'
  | 'suppliers'
  | 'item_categories'
  | 'items'
  | 'warehouses';

export interface MasterDataContext {
  userId: string;
  organizationId: string;
  productId: string;
  productCode: string;
}

type FieldKind = 'string' | 'uuid' | 'boolean' | 'integer' | 'decimal' | 'date' | 'datetime';

interface ResourceDefinition {
  table: string;
  fields: Record<string, FieldKind>;
  required: string[];
  searchFields: string[];
}

const DEFINITIONS: Record<MasterDataResource, ResourceDefinition> = {
  branches: {
    table: 'branches',
    fields: {
      code: 'string', name: 'string', branch_type: 'string', address_line: 'string',
      municipality: 'string', province: 'string', country_code: 'string', phone: 'string',
      email: 'string', is_headquarters: 'boolean', status: 'string',
    },
    required: ['code', 'name'],
    searchFields: ['code', 'name', 'municipality'],
  },
  fiscal_periods: {
    table: 'fiscal_periods',
    fields: {
      code: 'string', name: 'string', starts_on: 'date', ends_on: 'date',
      status: 'string', closed_at: 'datetime',
    },
    required: ['code', 'name', 'starts_on', 'ends_on'],
    searchFields: ['code', 'name'],
  },
  currencies: {
    table: 'currencies',
    fields: {
      code: 'string', name: 'string', symbol: 'string', decimal_places: 'integer',
      is_base: 'boolean', status: 'string',
    },
    required: ['name', 'symbol'],
    searchFields: ['code', 'name'],
  },
  units_of_measure: {
    table: 'units_of_measure',
    fields: {
      code: 'string', name: 'string', symbol: 'string', decimal_places: 'integer', status: 'string',
    },
    required: ['code', 'name', 'symbol'],
    searchFields: ['code', 'name', 'symbol'],
  },
  tax_codes: {
    table: 'tax_codes',
    fields: {
      code: 'string', name: 'string', tax_type: 'string', tax_rate: 'decimal',
      effective_from: 'date', effective_to: 'date', tax_authority_reference: 'string', status: 'string',
    },
    required: ['code', 'name', 'tax_type', 'tax_rate', 'effective_from'],
    searchFields: ['code', 'name', 'tax_authority_reference'],
  },
  payment_methods: {
    table: 'payment_methods',
    fields: {
      code: 'string', name: 'string', method_type: 'string', requires_reference: 'boolean', status: 'string',
    },
    required: ['code', 'name', 'method_type'],
    searchFields: ['code', 'name'],
  },
  customers: {
    table: 'customers',
    fields: {
      code: 'string', legal_name: 'string', trade_name: 'string', tax_id: 'string',
      email: 'string', phone: 'string', address_line: 'string', municipality: 'string',
      province: 'string', country_code: 'string', credit_limit: 'decimal',
      payment_terms_days: 'integer', notes: 'string', status: 'string',
    },
    required: ['code', 'legal_name'],
    searchFields: ['code', 'legal_name', 'trade_name', 'tax_id'],
  },
  suppliers: {
    table: 'suppliers',
    fields: {
      code: 'string', legal_name: 'string', trade_name: 'string', tax_id: 'string',
      email: 'string', phone: 'string', address_line: 'string', municipality: 'string',
      province: 'string', country_code: 'string', payment_terms_days: 'integer',
      notes: 'string', status: 'string',
    },
    required: ['code', 'legal_name'],
    searchFields: ['code', 'legal_name', 'trade_name', 'tax_id'],
  },
  item_categories: {
    table: 'item_categories',
    fields: {
      parent_category_id: 'uuid', code: 'string', name: 'string', description: 'string', status: 'string',
    },
    required: ['code', 'name'],
    searchFields: ['code', 'name'],
  },
  items: {
    table: 'items',
    fields: {
      category_id: 'uuid', unit_id: 'uuid', tax_code_id: 'uuid', code: 'string', barcode: 'string',
      item_type: 'string', name: 'string', description: 'string', track_stock: 'boolean',
      sales_price: 'decimal', purchase_price: 'decimal', status: 'string',
    },
    required: ['unit_id', 'code', 'item_type', 'name'],
    searchFields: ['code', 'barcode', 'name'],
  },
  warehouses: {
    table: 'warehouses',
    fields: {
      branch_id: 'uuid', code: 'string', name: 'string', address_line: 'string', status: 'string',
    },
    required: ['code', 'name'],
    searchFields: ['code', 'name'],
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^-?\d{1,15}(?:\.\d{1,4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamel);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()),
      toCamel(item),
    ]),
  );
}

function validDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SupabaseAuditRepository,
  ) {}

  async list(resource: MasterDataResource, context: MasterDataContext, query: unknown) {
    const definition = this.definition(resource);
    this.assertContext(context);
    if (!isRecord(query)) throw new BadRequestException('Invalid pagination or search query');

    const limit = this.parseInteger(query.limit, 50, 1, 100, 'limit');
    const offset = this.parseInteger(query.offset, 0, 0, 100_000, 'offset');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100) {
      throw new BadRequestException('search must be a text value with at most 100 characters');
    }

    const where = search.trim()
      ? ` AND (${definition.searchFields.map((field) => `${field} ILIKE '%' || $2 || '%'`).join(' OR ')})`
      : '';
    const countParameters = search.trim()
      ? [context.organizationId, search.trim()]
      : [context.organizationId];
    const rowsParameters = search.trim()
      ? [context.organizationId, search.trim(), limit, offset]
      : [context.organizationId, limit, offset];
    const limitPosition = rowsParameters.length - 1;
    const offsetPosition = rowsParameters.length;

    const countRows = await this.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT COUNT(*)::bigint AS total FROM nova_comercial.${definition.table}
       WHERE organization_id = $1::uuid${where}`,
      ...countParameters,
    );
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM nova_comercial.${definition.table}
       WHERE organization_id = $1::uuid${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
      ...rowsParameters,
    );
    return {
      data: rows.map((row) => toCamel(row)),
      pagination: { limit, offset, total: Number(countRows[0]?.total ?? 0n) },
    };
  }

  async get(resource: MasterDataResource, context: MasterDataContext, id: string) {
    const definition = this.definition(resource);
    this.assertContext(context);
    this.assertUuid(id, 'id');
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM nova_comercial.${definition.table}
       WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      context.organizationId,
      id,
    );
    if (!rows[0]) throw new NotFoundException('Record not found');
    return toCamel(rows[0]);
  }

  async create(resource: MasterDataResource, context: MasterDataContext, body: unknown) {
    const definition = this.definition(resource);
    this.assertContext(context);
    const data = this.validateBody(resource, body, false);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (resource === 'fiscal_periods') {
          await this.assertFiscalPeriodDoesNotOverlap(tx, context.organizationId, data);
        }
        const fields = Object.keys(data);
        const columns = ['organization_id', ...fields];
        const values = [context.organizationId, ...fields.map((field) => data[field])];
        const placeholders = values.map((_value, index) => `$${index + 1}`);
        const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `INSERT INTO nova_comercial.${definition.table} (${columns.join(', ')})
           VALUES (${placeholders.join(', ')}) RETURNING *`,
          ...values,
        );
        const row = rows[0];
        if (!row) throw new Error('Master data insert returned no record');
        await this.audit.write({
          actorUserId: context.userId,
          organizationId: context.organizationId,
          productId: context.productId,
          eventType: 'master_data',
          action: 'create',
          resourceType: resource,
          resourceId: String(row.id),
          outcome: 'success',
          severity: 'info',
          metadata: { fields },
        }, tx);
        return toCamel(row);
      });
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async update(resource: MasterDataResource, context: MasterDataContext, id: string, body: unknown) {
    const definition = this.definition(resource);
    this.assertContext(context);
    this.assertUuid(id, 'id');
    const data = this.validateBody(resource, body, true);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (resource === 'fiscal_periods') {
          await this.assertFiscalPeriodDoesNotOverlap(tx, context.organizationId, data, id);
        }
        const fields = Object.keys(data);
        const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
        const values = [...fields.map((field) => data[field]), context.organizationId, id];
        const organizationPosition = fields.length + 1;
        const idPosition = fields.length + 2;
        const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `UPDATE nova_comercial.${definition.table}
           SET ${assignments.join(', ')}, updated_at = now()
           WHERE organization_id = $${organizationPosition}::uuid AND id = $${idPosition}::uuid
           RETURNING *`,
          ...values,
        );
        const row = rows[0];
        if (!row) throw new NotFoundException('Record not found');
        await this.audit.write({
          actorUserId: context.userId,
          organizationId: context.organizationId,
          productId: context.productId,
          eventType: 'master_data',
          action: 'update',
          resourceType: resource,
          resourceId: String(row.id),
          outcome: 'success',
          severity: 'info',
          metadata: { fields },
        }, tx);
        return toCamel(row);
      });
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  private definition(resource: string): ResourceDefinition {
    if (!Object.prototype.hasOwnProperty.call(DEFINITIONS, resource)) {
      throw new NotFoundException('Master data resource not found');
    }
    return DEFINITIONS[resource as MasterDataResource];
  }

  private assertContext(context: MasterDataContext): void {
    if (!context || context.productCode !== 'nova-comercial' ||
        !UUID.test(context.userId) || !UUID.test(context.organizationId) || !UUID.test(context.productId)) {
      throw new ForbiddenException('NOVA COMERCIAL organization context is required');
    }
  }

  private assertUuid(value: string, field: string): void {
    if (typeof value !== 'string' || !UUID.test(value)) {
      throw new BadRequestException(`${field} must be a valid UUID`);
    }
  }

  private parseInteger(value: unknown, fallback: number, min: number, max: number, field: string): number {
    if (value === undefined) return fallback;
    const parsed = typeof value === 'number' ? value :
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN;
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
    }
    return parsed;
  }

  private validateBody(
    resource: MasterDataResource,
    body: unknown,
    isUpdate: boolean,
  ): Record<string, unknown> {
    const definition = this.definition(resource);
    if (!isRecord(body)) throw new BadRequestException('A JSON object is required');
    const keys = Object.keys(body);
    if (keys.length === 0) throw new BadRequestException('At least one field is required');
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(definition.fields, key)) {
        throw new BadRequestException(`Field ${key} is not writable for ${resource}`);
      }
    }
    if (!isUpdate) {
      for (const required of definition.required) {
        const value = body[required];
        if (value === undefined || value === null ||
            (typeof value === 'string' && value.trim().length === 0)) {
          throw new BadRequestException(`Field ${required} is required`);
        }
      }
    }

    for (const [field, value] of Object.entries(body)) {
      if (value === null) {
        if (definition.required.includes(field)) {
          throw new BadRequestException(`Field ${field} cannot be null`);
        }
        continue;
      }
      const kind = definition.fields[field];
      let valid = false;
      switch (kind) {
        case 'string':
          valid = typeof value === 'string';
          if (valid && field === 'email') valid = value === '' || EMAIL.test(value);
          if (valid && field === 'country_code') valid = /^[A-Z]{2}$/.test(value as string);
          if (valid && resource === 'currencies' && field === 'code') valid = /^[A-Z]{3}$/.test(value as string);
          break;
        case 'uuid':
          valid = typeof value === 'string' && UUID.test(value);
          break;
        case 'boolean':
          valid = typeof value === 'boolean';
          break;
        case 'integer':
          valid = typeof value === 'number' && Number.isSafeInteger(value);
          break;
        case 'decimal':
          valid = typeof value === 'string' && DECIMAL.test(value);
          break;
        case 'date':
          valid = typeof value === 'string' && validDate(value);
          break;
        case 'datetime':
          valid = typeof value === 'string' && value.includes('T') && Number.isFinite(Date.parse(value));
          break;
      }
      if (!valid) throw new BadRequestException(`Field ${field} has an invalid value`);
    }
    return body;
  }

  private async assertFiscalPeriodDoesNotOverlap(
    tx: Prisma.TransactionClient,
    organizationId: string,
    data: Record<string, unknown>,
    excludeId?: string,
  ): Promise<void> {
    let startsOn = data.starts_on as string | undefined;
    let endsOn = data.ends_on as string | undefined;
    let status = data.status as string | undefined;
    if (excludeId && (!startsOn || !endsOn || !status)) {
      const current = await tx.$queryRawUnsafe<Array<{ starts_on: Date; ends_on: Date; status: string }>>(
        'SELECT starts_on, ends_on, status FROM nova_comercial.fiscal_periods WHERE organization_id = $1::uuid AND id = $2::uuid',
        organizationId,
        excludeId,
      );
      if (!current[0]) throw new NotFoundException('Record not found');
      startsOn ??= current[0].starts_on.toISOString().slice(0, 10);
      endsOn ??= current[0].ends_on.toISOString().slice(0, 10);
      status ??= current[0].status;
    }
    if (!startsOn || !endsOn || !['OPEN', 'CLOSING'].includes(status ?? 'OPEN')) return;
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      `fiscal_periods:${organizationId}`,
    );
    const overlaps = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM nova_comercial.fiscal_periods
       WHERE organization_id = $1::uuid
         AND status IN ('OPEN', 'CLOSING')
         AND starts_on <= $3::date
         AND ends_on >= $2::date
         AND ($4::uuid IS NULL OR id <> $4::uuid)
       LIMIT 1`,
      organizationId,
      startsOn,
      endsOn,
      excludeId ?? null,
    );
    if (overlaps[0]) throw new ConflictException('Fiscal period overlaps another open or closing period');
  }

  private translateDatabaseError(error: unknown): never {
    const candidate = error as { code?: string; meta?: { code?: string } };
    const sqlState = candidate?.meta?.code ?? candidate?.code;
    if (sqlState === '23505' || candidate?.code === 'P2002') {
      throw new ConflictException('A record with the same organisation code or unique identifier already exists');
    }
    if (sqlState === '23503' || candidate?.code === 'P2003') {
      throw new BadRequestException('A referenced record does not exist or belongs to another organisation');
    }
    if (['23514', '22P02', '22007', '22003', '22001'].includes(sqlState ?? '')) {
      throw new BadRequestException('The supplied values violate the data rules for this record');
    }
    throw error;
  }
}
