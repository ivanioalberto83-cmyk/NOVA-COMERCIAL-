import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GET /health', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  after(async () => {
    await app?.close();
  });

  it('returns a non-sensitive readiness response', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    assert.deepEqual(response.body, {
      status: 'ok',
      service: 'nova-security-api',
    });
  });
});
