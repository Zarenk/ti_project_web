import { Body, Controller, HttpCode, Post, Logger, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { SalePostedDto } from './dto/sale-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JournalEntryService } from '../services/journal-entry.service';
import { SaleAccountingService } from '../services/sale-accounting.service';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

@Controller('accounting/hooks/sale-posted')
// TODO: Re-enable guards after adding auth headers to AccountingHookService
// @UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SalePostedController {
  private readonly logger = new Logger(SalePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntryService: JournalEntryService,
    private readonly mapper: SaleAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(
    @Body() data: SalePostedDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    try {
      this.logger.log(`Received sale-posted event for sale ${data.saleId}`);
      this.logger.debug(`Sale data: ${JSON.stringify(data)}`);

      // Obtener la venta sin filtros de tenant (el hook no tiene auth headers)
      const sale = await this.prisma.sales.findUnique({
        where: { id: data.saleId },
        include: {
          salesDetails: {
            include: { entryDetail: { include: { product: true } } },
          },
          payments: { include: { paymentMethod: true } },
          invoices: true,
        },
      });

      if (!sale) {
        this.logger.warn(`Sale ${data.saleId} not found`);
        return { status: 'not_found' };
      }

      this.logger.debug(`Sale found: id=${sale.id}, total=${sale.total}, organizationId=${sale.organizationId}`);
      this.logger.debug(`Sale has ${sale.salesDetails?.length || 0} details, ${sale.payments?.length || 0} payments, ${sale.invoices ? 1 : 0} invoices`);

      // Usar el organizationId de la venta para el tenant context
      // Si tenant existe pero no tiene organizationId, usar el de la venta
      const effectiveTenant: TenantContext = {
        organizationId: tenant?.organizationId ?? sale.organizationId,
        companyId: tenant?.companyId ?? sale.companyId,
        organizationUnitId: tenant?.organizationUnitId ?? null,
        userId: tenant?.userId ?? null,
        isGlobalSuperAdmin: tenant?.isGlobalSuperAdmin ?? false,
        isOrganizationSuperAdmin: tenant?.isOrganizationSuperAdmin ?? false,
        isSuperAdmin: tenant?.isSuperAdmin ?? false,
        allowedOrganizationIds: tenant?.allowedOrganizationIds?.length
          ? tenant.allowedOrganizationIds
          : sale.organizationId ? [sale.organizationId] : [],
        allowedCompanyIds: tenant?.allowedCompanyIds?.length
          ? tenant.allowedCompanyIds
          : sale.companyId ? [sale.companyId] : [],
        allowedOrganizationUnitIds: tenant?.allowedOrganizationUnitIds ?? [],
      };

      this.logger.debug(`Effective tenant: orgId=${effectiveTenant.organizationId}, companyId=${effectiveTenant.companyId}`);

      const invoice = sale.invoices?.[0];
      if (invoice) {
        // Verificar si ya existe un journal entry para esta factura
        const existing = await this.prisma.journalEntry.findFirst({
          where: {
            correlativo: invoice.nroCorrelativo,
            organizationId: effectiveTenant.organizationId ?? undefined,
          },
        });
        if (existing) {
          this.logger.log(`Duplicate journal entry for invoice ${invoice.serie}-${invoice.nroCorrelativo}`);
          return { status: 'duplicate' };
        }
      }

      this.logger.debug(`About to build accounting lines from sale`);
      const lines = this.mapper.buildEntryFromSale(sale);
      this.logger.log(`Generated ${lines.length} accounting lines for sale ${data.saleId}`);
      this.logger.debug(`Lines: ${JSON.stringify(lines.map(l => ({account: l.account, debit: l.debit, credit: l.credit})))}`);

      // Resolver accountIds desde códigos de cuenta
      const accountCodes = [...new Set(lines.map(l => l.account))];
      this.logger.log(`Looking up account codes: ${accountCodes.join(', ')}`);

      const accounts = await this.prisma.account.findMany({
        where: {
          code: { in: accountCodes },
          organizationId: effectiveTenant.organizationId ?? undefined,
        },
        select: { id: true, code: true },
      });

      this.logger.log(`Found ${accounts.length} accounts in database`);

      const accountCodeToIdMap = new Map(accounts.map(a => [a.code, a.id]));

      // Validar que todas las cuentas existan
      const missingAccounts = accountCodes.filter(code => !accountCodeToIdMap.has(code));
      if (missingAccounts.length > 0) {
        this.logger.error(`Missing account codes: ${missingAccounts.join(', ')} for organization ${effectiveTenant.organizationId}`);
        throw new Error(`Cuentas contables no encontradas: ${missingAccounts.join(', ')}`);
      }

      // Crear journal entry usando JournalEntryService
      const journalLines = lines.map(({ account, description, debit, credit }) => ({
        accountId: accountCodeToIdMap.get(account)!,
        description,
        debit: Number(debit),
        credit: Number(credit),
      }));

      this.logger.log(`Creating journal entry with ${journalLines.length} lines`);

      // Construir descripción simplificada (detalle va en las líneas)
      const paymentMethod = sale.payments?.[0]?.paymentMethod?.name || 'N/A';
      const invoiceRef = invoice
        ? `${invoice.serie}-${invoice.nroCorrelativo}`
        : `${data.saleId}`;

      // Información del cliente
      const client = await this.prisma.clients.findUnique({
        where: { id: sale.clientId },
        select: { name: true },
      });
      const clientName = client?.name || 'Cliente general';

      const description = `Venta -${invoiceRef} | ${clientName} | ${paymentMethod}`;

      const entry = await this.journalEntryService.create(
        {
          date: new Date(data.timestamp),
          description,
          source: 'SALE',
          moneda: invoice?.tipoMoneda || 'PEN',
          tipoCambio: undefined,
          lines: journalLines,
        },
        effectiveTenant,
      );

      this.logger.log(`✅ Journal entry ${entry.id} created for sale ${data.saleId} with status ${entry.status}`);
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      const error = err as any;
      this.logger.error(`Failed to process sale-posted hook for sale ${data.saleId}`);
      this.logger.error(`Error type: ${error.constructor?.name}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      throw err;
    }
  }
}
