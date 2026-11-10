import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MasterDataService, MasterDataContext } from '../master-data/master-data.service';

const context: MasterDataContext = {
  userId: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  organizationId: 'f4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  productId: 'a4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
  productCode: 'nova-comercial',
};

describe('MasterDataService', () => {
  it('creates a tenant-scoped branch and writes its audit event in the same transaction', async () => {
    let sql = '';
    let parameters: unknown[] = [];
    let transactionClient: unknown;
    let auditEvent: Record<string, unknown> | undefined;
    let auditExecutor: unknown;
    const tx = {
      $queryRawUnsafe: async (_query: string, ..._values: unknown[]) => {
        sql = _query;
        parameters = _values;
        return [{
          id: 'b4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
          organization_id: context.organizationId,
          code: 'LUANDA',
          name: 'Sede Luanda',
          status: 'ACTIVE',
        }];
      },
    };
    const prisma = {
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => {
        transactionClient = tx;
        return callback(tx);
      },
    };
    const audit = {
      write: async (event: Record<string, unknown>, executor: unknown) => {
        auditEvent = event;
        auditExecutor = executor;
      },
    };
    const service = new MasterDataService(prisma as never, audit as never);
    const result = await service.create('branches', context, { code: 'LUANDA', name: 'Sede Luanda' });

    assert.equal(result.organizationId, context.organizationId);
    assert.equal(result.code, 'LUANDA');
    assert.match(sql, /INSERT INTO nova_comercial\.branches/);
    assert.ok(parameters.includes(context.organizationId));
    assert.ok(parameters.includes('LUANDA'));
    assert.equal(auditEvent?.eventType, 'master_data');
    assert.equal(auditEvent?.action, 'create');
    assert.equal(auditEvent?.organizationId, context.organizationId);
    assert.equal(auditEvent?.resourceId, result.id);
    assert.equal(auditExecutor, transactionClient);
  });

  it('rejects client-supplied tenant identifiers and unknown fields', async () => {
    const service = new MasterDataService({} as never, { write: async () => undefined } as never);
    await assert.rejects(
      service.create('branches', context, { organization_id: 'other-tenant', code: 'X', name: 'X' }),
      BadRequestException,
    );
    await assert.rejects(
      service.create('branches', context, { code: 'X', name: 'X', is_admin: true }),
      BadRequestException,
    );
  });

  it('refuses to run ERP operations under another product context', async () => {
    const service = new MasterDataService({} as never, { write: async () => undefined } as never);
    await assert.rejects(
      service.list('branches', { ...context, productCode: 'nova-escolar' }, {}),
      ForbiddenException,
    );
  });

  it('does not allow required identifiers to be cleared during updates', async () => {
    const service = new MasterDataService({} as never, { write: async () => undefined } as never);
    await assert.rejects(
      service.update('branches', context, 'b4a1c111-3c32-4a45-9a0b-31d9f4c9a111', { code: '' }),
      BadRequestException,
    );
  });

  it('validates exact decimal strings to preserve NUMERIC precision', async () => {
    const service = new MasterDataService({} as never, { write: async () => undefined } as never);
    await assert.rejects(
      service.create('customers', context, { code: 'C-1', legal_name: 'Cliente', credit_limit: 123.45 }),
      BadRequestException,
    );
  });
});
