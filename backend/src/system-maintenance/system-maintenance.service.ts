import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export interface GeneratedBackup {
  stream: Readable;
  filename: string;
  contentType: string;
}

@Injectable()
export class SystemMaintenanceService {
  private readonly logger = new Logger(SystemMaintenanceService.name);
  private readonly preservedTables = new Set([
    'user',
    'sitesettings',
    '_prisma_migrations',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateBackup(params?: {
    organizationId?: number | null;
    companyId?: number | null;
  }): Promise<GeneratedBackup> {
    const organizationId = this.normalizeNumericId(params?.organizationId);
    const companyId = this.normalizeNumericId(params?.companyId);

    if (organizationId != null || companyId != null) {
      return this.generateTenantBackup({
        organizationId,
        companyId,
      });
    }

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

  private async generateTenantBackup(params: {
    organizationId?: number | null;
    companyId?: number | null;
  }): Promise<GeneratedBackup> {
    const organizationId = this.normalizeNumericId(params.organizationId);
    const companyId = this.normalizeNumericId(params.companyId);

    if (organizationId == null && companyId == null) {
      throw new BadRequestException(
        'Debe seleccionar una organización o empresa válida antes de generar el respaldo.',
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataset = await this.prisma.$transaction(async (tx) => {
      const { tables, columnsByTable } =
        await this.loadTenantAwareTableMetadata(tx);

      const snapshot: Record<string, unknown[]> = {};

      for (const table of tables) {
        const normalizedName = table.toLowerCase();
        const columnMap = columnsByTable.get(normalizedName);
        if (!columnMap) {
          continue;
        }

        const organizationColumn = columnMap.get('organizationid');
        const companyColumn = columnMap.get('companyid');

        const clauses: string[] = [];
        if (organizationColumn && organizationId != null) {
          clauses.push(`"${organizationColumn}" = ${organizationId}`);
        }
        if (companyColumn && companyId != null) {
          clauses.push(`"${companyColumn}" = ${companyId}`);
        }

        if (clauses.length === 0) {
          continue;
        }

        const whereClause =
          clauses.length === 1
            ? clauses[0]
            : clauses.map((clause) => `(${clause})`).join(' OR ');

        const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`
            SELECT * FROM "${table}" WHERE ${whereClause}
          `);

        if (rows && rows.length > 0) {
          snapshot[table] = rows;
        }
      }

      return snapshot;
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      organizationId,
      companyId,
      tables: dataset,
    };

    return {
      stream: Readable.from([JSON.stringify(payload, null, 2)]),
      filename: `backup-org-${organizationId ?? 'global'}-${timestamp}.json`,
      contentType: 'application/json',
    };
  }

  async purgeNonUserData(params: {
    organizationId?: number | null;
    companyId?: number | null;
  }): Promise<{
    deletedCounts: Record<string, number>;
    finishedAt: string;
  }> {
    const organizationId = this.normalizeNumericId(params.organizationId);
    const companyId = this.normalizeNumericId(params.companyId);

    if (organizationId == null && companyId == null) {
      throw new BadRequestException(
        'Debe seleccionar una organización o empresa válida antes de purgar los datos.',
      );
    }

    const deletedCounts: Record<string, number> = {};

    await this.prisma.$transaction(async (tx) => {
      const { tables, columnsByTable } =
        await this.loadTenantAwareTableMetadata(tx);

      if (tables.length === 0) {
        return;
      }

      for (const table of tables) {
        const normalizedName = table.toLowerCase();
        const columnMap = columnsByTable.get(normalizedName);
        if (!columnMap) {
          continue;
        }

        const organizationColumn = columnMap.get('organizationid');
        const companyColumn = columnMap.get('companyid');

        const clauses: string[] = [];
        if (organizationColumn && organizationId != null) {
          clauses.push(`"${organizationColumn}" = ${organizationId}`);
        }
        if (companyColumn && companyId != null) {
          clauses.push(`"${companyColumn}" = ${companyId}`);
        }

        if (clauses.length === 0) {
          continue;
        }

        const whereClause =
          clauses.length === 1
            ? clauses[0]
            : clauses.map((clause) => `(${clause})`).join(' OR ');

        const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${table}" WHERE ${whereClause}`,
        );
        const count = Number(countRows?.[0]?.count ?? 0);

        if (count === 0) {
          continue;
        }

        deletedCounts[table] = count;

        await tx.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE ${whereClause}`,
        );
      }
    });

    return {
      deletedCounts,
      finishedAt: new Date().toISOString(),
    };
  }

  private normalizeNumericId(value?: number | null): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }

  private async loadTenantAwareTableMetadata(
    tx: Prisma.TransactionClient,
  ): Promise<{
    tables: string[];
    columnsByTable: Map<string, Map<string, string>>;
  }> {
    const tables = await tx.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const columnRows = await tx.$queryRaw<
      Array<{ table_name: string; column_name: string }>
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;

    const columnsByTable = new Map<string, Map<string, string>>();
    for (const row of columnRows) {
      const tableName = row.table_name?.toLowerCase();
      const columnName = row.column_name;
      if (!tableName || !columnName) {
        continue;
      }

      let columnMap = columnsByTable.get(tableName);
      if (!columnMap) {
        columnMap = new Map<string, string>();
        columnsByTable.set(tableName, columnMap);
      }
      columnMap.set(columnName.toLowerCase(), columnName);
    }

    const tablesToProcess = tables
      .map((row) => row.tablename)
      .filter(
        (name) =>
          name &&
          !this.preservedTables.has(name.toLowerCase()) &&
          !name.startsWith('_'),
      );

    return {
      tables: tablesToProcess,
      columnsByTable,
    };
  }

  private generatePgDumpBackup(
    databaseUrl: string,
    timestamp: string,
  ): Promise<GeneratedBackup> {
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

  private async generateJsonBackup(
    timestamp: string,
  ): Promise<GeneratedBackup> {
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
      this.logger.error(
        'Failed to serialize database for backup',
        error as Error,
      );
      throw new InternalServerErrorException('Failed to generate backup');
    }
  }
}
