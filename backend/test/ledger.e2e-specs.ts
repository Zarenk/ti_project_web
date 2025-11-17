import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AccountingModule } from '../src/accounting/accounting.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Accounting Ledger (e2e)', () => {
  let app: INestApplication;
  const mockPrisma = {
    journalLine: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 1, date: new Date(), debit: 100, credit: 0 },
        ]),
    },
  } as any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AccountingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/accounting/reports/ledger (GET)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/accounting/reports/ledger',
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
