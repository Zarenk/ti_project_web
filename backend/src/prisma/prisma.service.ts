import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { KmsService } from '../common/security/kms.service';
import { encryptCredentialsMiddleware } from '../common/security/credentials.middleware';

type GlobalPrisma = typeof globalThis & {
  __TI_GLOBAL_PRISMA__?: PrismaService;
  __TI_PRISMA_MIDDLEWARE__?: boolean;
  __TI_PRISMA_SHUTDOWN__?: boolean;
};

const globalForPrisma = globalThis as GlobalPrisma;

function buildPooledDatabaseUrl(): string | undefined {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return undefined;

  try {
    const parsed = new URL(baseUrl);
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT;
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT;

    if (connectionLimit && !parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', connectionLimit);
    }

    if (poolTimeout && !parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', poolTimeout);
    }

    return parsed.toString();
  } catch {
    return baseUrl;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static middlewareConfigured = false;
  private static instance: PrismaService | null = null;
  private readonly kms = new KmsService();

  constructor() {
    const existingInstance =
      PrismaService.instance ?? globalForPrisma.__TI_GLOBAL_PRISMA__;
    if (existingInstance) {
      return existingInstance;
    }

    // Prisma 7.x requires driver adapters
    const pooledUrl = buildPooledDatabaseUrl();
    const connectionString = pooledUrl || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    PrismaService.instance = this;
    globalForPrisma.__TI_GLOBAL_PRISMA__ = this;

    if (!globalForPrisma.__TI_PRISMA_SHUTDOWN__) {
      const disconnect = async () => {
        if (PrismaService.instance) {
          await PrismaService.instance.$disconnect();
        }
      };

      process.once('beforeExit', () => {
        void disconnect();
      });
      process.once('SIGINT', () => {
        void disconnect().finally(() => process.exit(0));
      });
      process.once('SIGTERM', () => {
        void disconnect().finally(() => process.exit(0));
      });

      globalForPrisma.__TI_PRISMA_SHUTDOWN__ = true;
    }
  }

  async onModuleInit() {
    if (
      !PrismaService.middlewareConfigured &&
      !globalForPrisma.__TI_PRISMA_MIDDLEWARE__
    ) {
      // Prisma 7.x uses $extends instead of $use
      const extendedClient = (this as any).$extends(
        encryptCredentialsMiddleware(this.kms),
      );
      // Copy extended methods back to this instance
      Object.assign(this, extendedClient);
      PrismaService.middlewareConfigured = true;
      globalForPrisma.__TI_PRISMA_MIDDLEWARE__ = true;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
