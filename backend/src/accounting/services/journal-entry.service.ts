import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntryStatus, Prisma } from '@prisma/client';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

export interface JournalEntryLine {
  accountId: number;
  description?: string;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryDto {
  date: Date;
  description?: string;
  source: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'MANUAL';
  moneda?: 'PEN' | 'USD';
  tipoCambio?: number;
  lines: JournalEntryLine[];
}

export interface UpdateJournalEntryDto {
  date?: Date;
  description?: string;
  lines?: JournalEntryLine[];
}

export interface JournalEntryFilters {
  from?: Date;
  to?: Date;
  sources?: string[];
  statuses?: EntryStatus[];
  accountIds?: number[];
  balanced?: boolean;
}

@Injectable()
export class JournalEntryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el próximo correlativo para el período actual
   */
  private async generateCorrelativo(
    date: Date,
    organizationId: number,
    periodId: number
  ): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Buscar el último correlativo del período
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: {
        organizationId,
        periodId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      orderBy: { correlativo: 'desc' },
    });

    if (!lastEntry) {
      return 'M001';
    }

    // Extraer número del correlativo (M001 → 1)
    const match = lastEntry.correlativo.match(/M(\d+)/);
    const num = match ? parseInt(match[1]) + 1 : 1;

    return `M${String(num).padStart(3, '0')}`;
  }

  /**
   * Genera un CUO (Código Único de Operación)
   */
  private generateCUO(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CUO${timestamp}${random}`;
  }

  /**
   * Valida que el asiento esté balanceado (debe = haber)
   */
  private validateBalance(lines: JournalEntryLine[]): void {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Asiento descuadrado: Debe ${totalDebit.toFixed(2)} ≠ Haber ${totalCredit.toFixed(2)}`
      );
    }
  }

  /**
   * Valida que cada línea tenga debe O haber (no ambos)
   */
  private validateLines(lines: JournalEntryLine[]): void {
    if (lines.length < 2) {
      throw new BadRequestException('Un asiento debe tener al menos 2 líneas');
    }

    for (const line of lines) {
      if (!line.accountId) {
        throw new BadRequestException('Cada línea debe tener una cuenta');
      }

      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(
          'Una línea no puede tener debe y haber al mismo tiempo'
        );
      }

      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException('Una línea debe tener debe o haber mayor a 0');
      }
    }
  }

  /**
   * Obtiene o crea el período para la fecha
   */
  private async getOrCreatePeriod(date: Date, organizationId: number): Promise<number> {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Calcular startDate y endDate del período
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Buscar período existente
    let period = await this.prisma.period.findFirst({
      where: {
        startDate,
        endDate,
      },
    });

    // Si no existe, crearlo
    if (!period) {
      period = await this.prisma.period.create({
        data: {
          startDate,
          endDate,
          status: 'OPEN',
        },
      });
    }

    return period.id;
  }

  /**
   * Crea un nuevo asiento contable
   */
  async create(
    data: CreateJournalEntryDto,
    tenant: TenantContext | null
  ): Promise<any> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    // Validaciones
    this.validateLines(data.lines);
    this.validateBalance(data.lines);

    // Calcular totales
    const debitTotal = data.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const creditTotal = data.lines.reduce((sum, line) => sum + Number(line.credit), 0);

    // Obtener o crear período
    const periodId = await this.getOrCreatePeriod(data.date, tenant.organizationId);

    // Generar correlativo y CUO
    const correlativo = await this.generateCorrelativo(
      data.date,
      tenant.organizationId,
      periodId
    );
    const cuo = this.generateCUO();

    // Determinar status y sunatStatus
    const status: EntryStatus = data.source === 'MANUAL' ? 'DRAFT' : 'POSTED';
    const sunatStatus = status === 'POSTED' ? '1' : '0';

    // Crear asiento con líneas
    const entry = await this.prisma.journalEntry.create({
      data: {
        journalId: 1, // TODO: Obtener journalId del sistema
        periodId,
        date: data.date,
        description: data.description,
        status,
        debitTotal,
        creditTotal,
        correlativo,
        cuo,
        sunatStatus,
        source: data.source,
        moneda: data.moneda || 'PEN',
        tipoCambio: data.tipoCambio,
        organizationId: tenant.organizationId,
        companyId: tenant.companyId,
        lines: {
          create: data.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        period: true,
      },
    });

    return entry;
  }

  /**
   * Obtiene un asiento por ID
   */
  async findOne(id: number, tenant: TenantContext | null): Promise<any> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        period: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Asiento #${id} no encontrado`);
    }

    return entry;
  }

  /**
   * Obtiene asientos con filtros
   */
  async findAll(
    filters: JournalEntryFilters,
    tenant: TenantContext | null,
    page = 1,
    size = 20
  ): Promise<{ data: any[]; total: number }> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const where: Prisma.JournalEntryWhereInput = {
      organizationId: tenant.organizationId,
    };

    // Filtro por rango de fechas
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }

    // Filtro por sources
    if (filters.sources && filters.sources.length > 0) {
      where.source = { in: filters.sources };
    }

    // Filtro por statuses
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    // Filtro por cuentas (si tiene líneas de esa cuenta)
    if (filters.accountIds && filters.accountIds.length > 0) {
      where.lines = {
        some: {
          accountId: { in: filters.accountIds },
        },
      };
    }

    // Nota: El filtro por balance no se aplica a nivel de base de datos
    // porque Prisma no permite comparar campos directamente.
    // Todos los asientos son validados al crearlos, por lo que deberían estar balanceados.

    let [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: true,
            },
          },
          period: true,
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    // Filtrar por balance en memoria si se especificó el filtro
    if (filters.balanced !== undefined) {
      data = data.filter((entry) => {
        const isBalanced = Math.abs(Number(entry.debitTotal) - Number(entry.creditTotal)) < 0.01;
        return filters.balanced ? isBalanced : !isBalanced;
      });
    }

    return { data, total };
  }

  /**
   * Actualiza un asiento (solo si está en DRAFT)
   */
  async update(
    id: number,
    data: UpdateJournalEntryDto,
    tenant: TenantContext | null
  ): Promise<any> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    // Verificar que existe y está en DRAFT
    const existing = await this.findOne(id, tenant);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Solo se pueden editar asientos en estado BORRADOR'
      );
    }

    // Si se actualizan las líneas, validar
    if (data.lines) {
      this.validateLines(data.lines);
      this.validateBalance(data.lines);
    }

    // Calcular nuevos totales si hay líneas
    let debitTotal = existing.debitTotal;
    let creditTotal = existing.creditTotal;

    if (data.lines) {
      debitTotal = data.lines.reduce((sum, line) => sum + Number(line.debit), 0);
      creditTotal = data.lines.reduce((sum, line) => sum + Number(line.credit), 0);
    }

    // Actualizar asiento
    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        date: data.date,
        description: data.description,
        debitTotal,
        creditTotal,
        lines: data.lines
          ? {
              deleteMany: {}, // Eliminar líneas existentes
              create: data.lines.map((line) => ({
                accountId: line.accountId,
                description: line.description,
                debit: line.debit,
                credit: line.credit,
              })),
            }
          : undefined,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        period: true,
      },
    });

    return updated;
  }

  /**
   * Cambia el estado de un asiento DRAFT → POSTED
   */
  async post(id: number, tenant: TenantContext | null): Promise<any> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const existing = await this.findOne(id, tenant);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden registrar asientos en BORRADOR');
    }

    // Validar que esté balanceado
    if (Math.abs(existing.debitTotal - existing.creditTotal) > 0.01) {
      throw new BadRequestException(
        'No se puede registrar un asiento descuadrado'
      );
    }

    // Cambiar estado
    const posted = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'POSTED',
        sunatStatus: '1',
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        period: true,
      },
    });

    return posted;
  }

  /**
   * Anula un asiento (POSTED → VOID)
   */
  async void(id: number, tenant: TenantContext | null): Promise<any> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const existing = await this.findOne(id, tenant);

    if (existing.status !== 'POSTED') {
      throw new BadRequestException('Solo se pueden anular asientos REGISTRADOS');
    }

    // Cambiar estado
    const voided = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'VOID',
        sunatStatus: '8',
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        period: true,
      },
    });

    return voided;
  }

  /**
   * Elimina un asiento (solo si está en DRAFT)
   */
  async delete(id: number, tenant: TenantContext | null): Promise<void> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const existing = await this.findOne(id, tenant);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Solo se pueden eliminar asientos en BORRADOR'
      );
    }

    await this.prisma.journalEntry.delete({
      where: { id },
    });
  }

  /**
   * Libro Mayor - Obtiene movimientos agrupados por cuenta desde JournalLine
   * Solo incluye asientos POSTED para reflejar el estado real contable
   */
  async getLedger(
    params: {
      accountId?: number;
      from?: string;
      to?: string;
    },
    tenant: TenantContext | null,
  ): Promise<{
    accounts: LedgerAccountData[];
    totals: { debit: number; credit: number };
  }> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const { accountId, from, to } = params;

    // Build where clause for JournalLine
    const entryWhere: Prisma.JournalEntryWhereInput = {
      organizationId: tenant.organizationId,
      status: 'POSTED', // Solo asientos contabilizados
    };

    if (from || to) {
      entryWhere.date = {};
      if (from) entryWhere.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        entryWhere.date.lte = toDate;
      }
    }

    const lineWhere: Prisma.JournalLineWhereInput = {
      entry: entryWhere,
    };

    if (accountId) {
      lineWhere.accountId = accountId;
    }

    // Fetch all matching lines with account and entry info
    const lines = await this.prisma.journalLine.findMany({
      where: lineWhere,
      include: {
        account: { select: { id: true, code: true, name: true, accountType: true } },
        entry: {
          select: {
            id: true,
            date: true,
            description: true,
            correlativo: true,
            source: true,
            moneda: true,
          },
        },
      },
      orderBy: [
        { account: { code: 'asc' } },
        { entry: { date: 'asc' } },
        { id: 'asc' },
      ],
    });

    // Group lines by account and calculate running balance per account
    const accountMap = new Map<number, LedgerAccountData>();
    let grandDebit = 0;
    let grandCredit = 0;

    for (const line of lines) {
      const acctId = line.accountId;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (!accountMap.has(acctId)) {
        accountMap.set(acctId, {
          accountId: acctId,
          accountCode: line.account.code,
          accountName: line.account.name,
          accountType: line.account.accountType,
          movements: [],
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        });
      }

      const acctData = accountMap.get(acctId)!;
      acctData.totalDebit += debit;
      acctData.totalCredit += credit;
      acctData.balance += debit - credit;

      grandDebit += debit;
      grandCredit += credit;

      acctData.movements.push({
        id: line.id,
        journalEntryId: line.entry.id,
        date: line.entry.date.toISOString(),
        description: line.description || line.entry.description || '',
        correlativo: line.entry.correlativo,
        source: line.entry.source || 'MANUAL',
        moneda: line.entry.moneda || 'PEN',
        debit,
        credit,
        runningBalance: acctData.balance,
      });
    }

    // Sort accounts by code
    const accounts = Array.from(accountMap.values()).sort((a, b) =>
      a.accountCode.localeCompare(b.accountCode),
    );

    return {
      accounts,
      totals: { debit: grandDebit, credit: grandCredit },
    };
  }

  /**
   * Balance de Comprobación - Sumas y saldos por cuenta desde JournalLine
   * Solo incluye asientos POSTED
   */
  async getTrialBalance(
    params: { from?: string; to?: string },
    tenant: TenantContext | null,
  ): Promise<{
    rows: TrialBalanceRow[];
    totals: { debit: number; credit: number; debitBalance: number; creditBalance: number };
  }> {
    if (!tenant?.organizationId) {
      throw new BadRequestException('Se requiere un tenant válido');
    }

    const { from, to } = params;

    const entryWhere: Prisma.JournalEntryWhereInput = {
      organizationId: tenant.organizationId,
      status: 'POSTED',
    };

    if (from || to) {
      entryWhere.date = {};
      if (from) entryWhere.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        entryWhere.date.lte = toDate;
      }
    }

    const lines = await this.prisma.journalLine.findMany({
      where: { entry: entryWhere },
      include: {
        account: { select: { id: true, code: true, name: true, accountType: true } },
      },
    });

    // Aggregate by account in a single pass
    const accountMap = new Map<number, TrialBalanceRow>();

    for (const line of lines) {
      const acctId = line.accountId;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (!accountMap.has(acctId)) {
        accountMap.set(acctId, {
          accountId: acctId,
          accountCode: line.account.code,
          accountName: line.account.name,
          accountType: line.account.accountType,
          debit: 0,
          credit: 0,
          debitBalance: 0,
          creditBalance: 0,
        });
      }

      const row = accountMap.get(acctId)!;
      row.debit += debit;
      row.credit += credit;
    }

    // Calculate balances per account
    let totalDebit = 0;
    let totalCredit = 0;
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    for (const row of accountMap.values()) {
      totalDebit += row.debit;
      totalCredit += row.credit;

      const net = row.debit - row.credit;
      if (net >= 0) {
        row.debitBalance = net;
        row.creditBalance = 0;
      } else {
        row.debitBalance = 0;
        row.creditBalance = Math.abs(net);
      }
      totalDebitBalance += row.debitBalance;
      totalCreditBalance += row.creditBalance;
    }

    const rows = Array.from(accountMap.values()).sort((a, b) =>
      a.accountCode.localeCompare(b.accountCode),
    );

    return {
      rows,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        debitBalance: totalDebitBalance,
        creditBalance: totalCreditBalance,
      },
    };
  }
}

export interface LedgerAccountData {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  movements: LedgerMovement[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface LedgerMovement {
  id: number;
  journalEntryId: number;
  date: string;
  description: string;
  correlativo: string;
  source: string;
  moneda: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}
