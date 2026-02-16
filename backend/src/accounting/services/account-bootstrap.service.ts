import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

interface AccountSeed {
  code: string;
  name: string;
  level: number;
  isPosting: boolean;
  parentCode: string | null;
  accountType: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
}

/**
 * Plan Contable General Empresarial (PCGE) - Cuentas mínimas
 * requeridas para el registro automático de ventas y compras.
 */
const DEFAULT_PCGE_ACCOUNTS: AccountSeed[] = [
  // Clase 1: Efectivo
  { code: '10', name: 'Efectivo y equivalentes de efectivo', level: 2, isPosting: false, parentCode: null, accountType: 'ACTIVO' },
  { code: '101', name: 'Caja', level: 3, isPosting: false, parentCode: '10', accountType: 'ACTIVO' },
  { code: '1011', name: 'Caja - Moneda Nacional', level: 4, isPosting: true, parentCode: '101', accountType: 'ACTIVO' },
  { code: '104', name: 'Cuentas corrientes en instituciones financieras', level: 3, isPosting: false, parentCode: '10', accountType: 'ACTIVO' },
  { code: '1041', name: 'Cuentas corrientes operativas', level: 4, isPosting: true, parentCode: '104', accountType: 'ACTIVO' },
  // Clase 2: Existencias
  { code: '20', name: 'Mercaderias', level: 2, isPosting: false, parentCode: null, accountType: 'ACTIVO' },
  { code: '201', name: 'Mercaderias manufacturadas', level: 3, isPosting: false, parentCode: '20', accountType: 'ACTIVO' },
  { code: '2011', name: 'Mercaderias manufacturadas - Costo', level: 4, isPosting: true, parentCode: '201', accountType: 'ACTIVO' },
  // Clase 4: Tributos
  { code: '40', name: 'Tributos, contraprestaciones y aportes', level: 2, isPosting: false, parentCode: null, accountType: 'PASIVO' },
  { code: '401', name: 'Gobierno central', level: 3, isPosting: false, parentCode: '40', accountType: 'PASIVO' },
  { code: '4011', name: 'IGV - Cuenta propia', level: 4, isPosting: true, parentCode: '401', accountType: 'PASIVO' },
  // Clase 4: Cuentas por pagar
  { code: '42', name: 'Cuentas por pagar comerciales - Terceros', level: 2, isPosting: false, parentCode: null, accountType: 'PASIVO' },
  { code: '421', name: 'Facturas, boletas y otros comprobantes por pagar', level: 3, isPosting: false, parentCode: '42', accountType: 'PASIVO' },
  { code: '4211', name: 'No emitidas', level: 4, isPosting: true, parentCode: '421', accountType: 'PASIVO' },
  // Clase 6: Gastos
  { code: '60', name: 'Compras', level: 2, isPosting: false, parentCode: null, accountType: 'GASTO' },
  { code: '601', name: 'Mercaderias', level: 3, isPosting: false, parentCode: '60', accountType: 'GASTO' },
  { code: '6011', name: 'Mercaderias manufacturadas', level: 4, isPosting: true, parentCode: '601', accountType: 'GASTO' },
  { code: '69', name: 'Costo de ventas', level: 2, isPosting: false, parentCode: null, accountType: 'GASTO' },
  { code: '691', name: 'Mercaderias', level: 3, isPosting: false, parentCode: '69', accountType: 'GASTO' },
  { code: '6911', name: 'Mercaderias manufacturadas', level: 4, isPosting: true, parentCode: '691', accountType: 'GASTO' },
  // Clase 7: Ingresos
  { code: '70', name: 'Ventas de mercaderias', level: 2, isPosting: false, parentCode: null, accountType: 'INGRESO' },
  { code: '701', name: 'Mercaderias', level: 3, isPosting: false, parentCode: '70', accountType: 'INGRESO' },
  { code: '7011', name: 'Mercaderias manufacturadas', level: 4, isPosting: true, parentCode: '701', accountType: 'INGRESO' },
];

@Injectable()
export class AccountBootstrapService {
  private readonly logger = new Logger(AccountBootstrapService.name);
  /** Cache of org IDs that already have accounts bootstrapped */
  private readonly bootstrappedOrgs = new Set<number>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures the default PCGE accounts and Journal exist for an organization.
   * Safe to call multiple times — uses in-memory cache + DB check.
   */
  async ensureDefaults(organizationId: number): Promise<void> {
    if (this.bootstrappedOrgs.has(organizationId)) {
      return;
    }

    await this.ensureJournal();
    await this.ensureAccounts(organizationId);
    this.bootstrappedOrgs.add(organizationId);
  }

  private async ensureJournal(): Promise<void> {
    const existing = await this.prisma.journal.findFirst({ where: { id: 1 } });
    if (existing) return;

    await this.prisma.journal.create({
      data: { id: 1, code: 'DIARIO', name: 'Libro Diario' },
    });
    this.logger.log('Created default Journal (Libro Diario)');
  }

  private async ensureAccounts(organizationId: number): Promise<void> {
    // Quick check: if posting accounts already exist, skip
    const postingCount = await this.prisma.account.count({
      where: { organizationId, isPosting: true },
    });

    if (postingCount >= 8) {
      return;
    }

    this.logger.log(`Bootstrapping PCGE accounts for organization ${organizationId}`);

    const codeToId = new Map<string, number>();

    // Load existing accounts for this org
    const existing = await this.prisma.account.findMany({
      where: { organizationId },
      select: { id: true, code: true },
    });
    for (const acc of existing) {
      codeToId.set(acc.code, acc.id);
    }

    let created = 0;
    for (const seed of DEFAULT_PCGE_ACCOUNTS) {
      if (codeToId.has(seed.code)) continue;

      const parentId = seed.parentCode ? codeToId.get(seed.parentCode) ?? null : null;

      const account = await this.prisma.account.create({
        data: {
          code: seed.code,
          name: seed.name,
          parentId,
          isPosting: seed.isPosting,
          level: seed.level,
          accountType: seed.accountType as any,
          organizationId,
        },
      });

      codeToId.set(seed.code, account.id);
      created++;
    }

    if (created > 0) {
      this.logger.log(`Created ${created} PCGE accounts for organization ${organizationId}`);
    }
  }
}
