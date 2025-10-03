import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { PrismaService } from 'src/prisma/prisma.service';

export interface GeneratedBackup {
  stream: Readable;
  filename: string;
  contentType: string;
}

@Injectable()
export class SystemMaintenanceService {
  private readonly logger = new Logger(SystemMaintenanceService.name);
  private readonly preservedTables = new Set(['User', 'SiteSettings', '_prisma_migrations']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateBackup(): Promise<GeneratedBackup> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      return this.generateJsonBackup(timestamp);
    }

    try {
      return await this.generatePgDumpBackup(databaseUrl, timestamp);
    } catch (error) {
      this.logger.warn(
        `pg_dump backup failed, falling back to JSON serialization: ${(error as Error)?.message ?? error}`,
      );
      return this.generateJsonBackup(timestamp);
    }
  }

  async purgeNonUserData(): Promise<{ deletedCounts: Record<string, number>; finishedAt: string }> {
    const deletedCounts: Record<string, number> = {};

    await this.prisma.$transaction(async (tx) => {
      const tables = await tx.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;

      const tablesToPurge = tables
        .map((row) => row.tablename)
        .filter((name) => name && !this.preservedTables.has(name) && !name.startsWith('_'));

      if (tablesToPurge.length === 0) {
        return;
      }

      for (const table of tablesToPurge) {
        const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${table}"`,
        );
        const count = Number(countRows?.[0]?.count ?? 0);
        deletedCounts[table] = count;
      }

      const truncateStatement = `TRUNCATE TABLE ${tablesToPurge
        .map((table) => `"${table}"`)
        .join(', ')} CASCADE`;

      await tx.$executeRawUnsafe(truncateStatement);
    });

    return {
      deletedCounts,
      finishedAt: new Date().toISOString(),
    };
  }

  private generatePgDumpBackup(databaseUrl: string, timestamp: string): Promise<GeneratedBackup> {
    return new Promise<GeneratedBackup>((resolve, reject) => {
      const child = spawn('pg_dump', ['--dbname', databaseUrl], {
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      const buffers: Buffer[] = [];
      let resolved = false;

      child.stdout?.on('data', (chunk: Buffer) => {
        buffers.push(Buffer.from(chunk));
      });

      child.once('error', (error) => {
        if (resolved) {
          return;
        }
        resolved = true;
        reject(error);
      });

      child.once('close', (code) => {
        if (resolved) {
          return;
        }
        resolved = true;

        if (code === 0) {
          const stream = Readable.from(buffers);
          resolve({
            stream,
            filename: `backup-${timestamp}.sql`,
            contentType: 'application/sql',
          });
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
    });
  }

  private async generateJsonBackup(timestamp: string): Promise<GeneratedBackup> {
    try {
      const data = await this.prisma.$transaction(async (tx) => {
        const tableRows = await tx.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `;

        const tables = tableRows
          .map((row) => row.tablename)
          .filter((name) => name && !name.startsWith('_prisma'));

        const snapshot: Record<string, unknown[]> = {};

        for (const table of tables) {
          const records = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM "${table}"`,
          );
          snapshot[table] = records ?? [];
        }

        return snapshot;
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        tables: data,
      };

      return {
        stream: Readable.from([JSON.stringify(payload, null, 2)]),
        filename: `backup-${timestamp}.json`,
        contentType: 'application/json',
      };
    } catch (error) {
      this.logger.error('Failed to serialize database for backup', error as Error);
      throw new InternalServerErrorException('Failed to generate backup');
    }
  }
}