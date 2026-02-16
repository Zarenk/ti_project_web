import { Body, Controller, HttpCode, Post, Logger, UseGuards, ForbiddenException } from '@nestjs/common';
import { PurchasePostedDto } from './dto/purchase-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JournalEntryService } from '../services/journal-entry.service';
import { PurchaseAccountingService } from '../services/purchase-account.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

const IGV_RATE = 0.18;

@Controller('accounting/hooks/purchase-posted')
// TODO: Re-enable guards after adding auth headers to AccountingHookService
// @UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class PurchasePostedController {
  private readonly logger = new Logger(PurchasePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntryService: JournalEntryService,
    private readonly mapper: PurchaseAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(
    @Body() data: PurchasePostedDto,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    try {
      this.logger.log(
        `Received purchase-posted event for purchase ${data.purchaseId}`,
      );

      // Obtener la compra sin filtros de tenant (el hook no tiene auth headers)
      const purchase = await this.prisma.entry.findUnique({
        where: { id: data.purchaseId },
        include: { details: true, invoice: true, provider: true },
      });

      if (!purchase) {
        this.logger.warn(`Purchase ${data.purchaseId} not found`);
        return { status: 'not_found' };
      }

      // Usar el organizationId de la compra para el tenant context
      // Si tenant existe pero no tiene organizationId, usar el de la compra
      const effectiveTenant: TenantContext = {
        organizationId: tenant?.organizationId ?? purchase.organizationId,
        companyId: tenant?.companyId ?? null, // Entry model doesn't have companyId
        organizationUnitId: tenant?.organizationUnitId ?? null,
        userId: tenant?.userId ?? null,
        isGlobalSuperAdmin: tenant?.isGlobalSuperAdmin ?? false,
        isOrganizationSuperAdmin: tenant?.isOrganizationSuperAdmin ?? false,
        isSuperAdmin: tenant?.isSuperAdmin ?? false,
        allowedOrganizationIds: tenant?.allowedOrganizationIds?.length
          ? tenant.allowedOrganizationIds
          : purchase.organizationId ? [purchase.organizationId] : [],
        allowedCompanyIds: tenant?.allowedCompanyIds ?? [],
        allowedOrganizationUnitIds: tenant?.allowedOrganizationUnitIds ?? [],
      };

      // Verificar si ya existe un journal entry para esta factura
      if (purchase.invoice) {
        const existing = await this.prisma.journalEntry.findFirst({
          where: {
            correlativo: purchase.invoice.nroCorrelativo,
            organizationId: effectiveTenant.organizationId ?? undefined,
          },
        });
        if (existing) {
          this.logger.log(`Duplicate journal entry for invoice ${purchase.invoice.serie}-${purchase.invoice.nroCorrelativo}`);
          return { status: 'duplicate' };
        }
      }

      const total = purchase.details.reduce(
        (sum: number, d: any) =>
          sum + (d.priceInSoles ?? d.price ?? 0) * d.quantity,
        0,
      );

      // Obtener detalles de productos para las líneas contables
      const productDetails = await this.prisma.entryDetail.findMany({
        where: { entryId: purchase.id },
        include: { product: true },
      });

      const products = productDetails.map(detail => ({
        quantity: detail.quantity,
        name: detail.product?.name || 'Producto',
        price: detail.priceInSoles ?? detail.price ?? 0,
        series: detail.series || undefined,
      }));

      const lines = this.mapper.buildEntryFromPurchase({
        total,
        provider: purchase.provider,
        isCredit:
          (purchase as any).paymentTerm === 'CREDIT' ||
          (purchase as any).paymentMethod === 'CREDIT',
        products,
      });

      const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
      const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
      if (totalDebit !== totalCredit) {
        this.logger.error(
          `Unbalanced entry generated for purchase ${data.purchaseId}: ${totalDebit} != ${totalCredit}`,
        );
        return { status: 'unbalanced' };
      }

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
      const paymentTerm = (purchase as any).paymentTerm || (purchase as any).paymentMethod;
      const paymentMethod = paymentTerm === 'CREDIT' ? 'Crédito' : 'Contado';
      const invoiceRef = purchase.invoice
        ? `${purchase.invoice.serie}-${purchase.invoice.nroCorrelativo}`
        : `${data.purchaseId}`;
      const providerName = purchase.provider?.name || 'Sin proveedor';

      const description = `Compra -${invoiceRef} | ${providerName} | ${paymentMethod}`;

      const entry = await this.journalEntryService.create(
        {
          date: new Date(data.timestamp),
          description,
          source: 'PURCHASE',
          moneda: 'PEN',
          tipoCambio: undefined,
          lines: journalLines,
        },
        effectiveTenant,
      );

      this.logger.log(
        `✅ Journal entry ${entry.id} created for purchase ${data.purchaseId} with status ${entry.status}`,
      );
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error('Failed to process purchase-posted hook', err as any);
      throw err;
    }
  }
}
