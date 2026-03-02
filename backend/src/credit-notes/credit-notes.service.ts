import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SunatService } from 'src/sunat/sunat.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { SalesService } from 'src/sales/sales.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sunatService: SunatService,
    private readonly accountingHook: AccountingHook,
    private readonly salesService: SalesService,
  ) {}

  async create(dto: CreateCreditNoteDto, tenant: any) {
    const organizationId = tenant?.organizationId ?? null;
    const companyId = tenant?.companyId ?? null;
    const userId = tenant?.userId ?? null;

    if (!organizationId || !companyId) {
      throw new BadRequestException('Contexto de empresa requerido.');
    }

    // 1. Fetch original sale with all related data
    const sale = await this.prisma.sales.findFirst({
      where: { id: dto.saleId, organizationId, companyId },
      include: {
        invoices: true,
        salesDetails: {
          include: {
            entryDetail: {
              include: { product: { select: { name: true } } },
            },
          },
        },
        client: {
          select: {
            name: true,
            typeNumber: true,
            type: true,
          },
        },
        sunatTransmissions: {
          where: { status: 'ACCEPTED' },
          take: 1,
        },
        creditNotes: { select: { id: true, status: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada.');
    }

    // 2. Validate: has SUNAT-accepted transmission
    if (sale.sunatTransmissions.length === 0) {
      throw new BadRequestException(
        'La venta no tiene una transmision SUNAT aceptada. Solo se pueden emitir notas de credito para ventas aceptadas por SUNAT.',
      );
    }

    // 3. Validate: has invoice
    const invoice = sale.invoices;
    if (!invoice) {
      throw new BadRequestException(
        'La venta no tiene un comprobante asociado.',
      );
    }

    // 4. Prevent duplicate credit notes
    const existingCN = sale.creditNotes.find(
      (cn) => cn.status !== 'REJECTED',
    );
    if (existingCN) {
      throw new ConflictException(
        'Esta venta ya tiene una nota de credito emitida.',
      );
    }

    // 5. Allocate serie/correlativo for credit note
    // SUNAT requires NC serie prefix to match original document type:
    //   NC against Factura → F-prefix (FC01)
    //   NC against Boleta  → B-prefix (BC01)
    const isFactura = invoice.tipoComprobante === 'FACTURA';
    const sequenceType = isFactura ? 'NC_FACTURA' : 'NC_BOLETA';

    const { serie, correlativo } = await this.prisma.$transaction(
      async (tx) => {
        let sequence = await tx.companyDocumentSequence.findUnique({
          where: {
            companyId_documentType: { companyId, documentType: sequenceType },
          },
        });

        if (!sequence) {
          const fallbackSerie = isFactura ? 'FC01' : 'BC01';
          sequence = await tx.companyDocumentSequence.create({
            data: {
              companyId,
              documentType: sequenceType,
              serie: fallbackSerie,
              nextCorrelative: 1,
              correlativeLength: 3,
            },
          });
        }

        const updated = await tx.companyDocumentSequence.update({
          where: { id: sequence.id },
          data: { nextCorrelative: { increment: 1 } },
          select: {
            nextCorrelative: true,
            serie: true,
            correlativeLength: true,
          },
        });

        const issuedNumber = updated.nextCorrelative - 1;
        const padding =
          updated.correlativeLength ?? sequence.correlativeLength ?? 3;

        return {
          serie: updated.serie,
          correlativo: String(issuedNumber).padStart(padding, '0'),
        };
      },
    );

    // 6. Create CreditNote record
    const codigoMotivo = dto.codigoMotivo ?? '01';
    const subtotal = +(sale.total - (sale.igvTotal ?? 0)).toFixed(2);
    const igv = +(sale.igvTotal ?? 0).toFixed(2);

    // Resolve emission date: use provided date or default to now
    const emisionDate = dto.fechaEmision
      ? new Date(dto.fechaEmision)
      : new Date();

    const creditNote = await this.prisma.creditNote.create({
      data: {
        organizationId,
        companyId,
        originalSaleId: sale.id,
        originalInvoiceId: invoice.id,
        serie,
        correlativo,
        motivo: dto.motivo,
        codigoMotivo,
        subtotal,
        igv,
        total: sale.total,
        status: 'DRAFT',
        fechaEmision: emisionDate,
        createdById: userId,
      },
    });

    // 7. Fetch company for emisor data
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        sunatRuc: true,
        taxId: true,
        sunatBusinessName: true,
        name: true,
        sunatAddress: true,
        sunatPhone: true,
      },
    });

    const ruc = company?.sunatRuc ?? company?.taxId ?? '';
    const tipoOriginal =
      invoice.tipoComprobante === 'FACTURA' ? '01' : '03';

    // 8. Build documentData for SUNAT
    const documentData = {
      serie,
      correlativo,
      fechaEmision: emisionDate.toISOString(),
      tipoMoneda: invoice.tipoMoneda ?? 'PEN',
      emisor: {
        ruc,
        razonSocial: company?.sunatBusinessName ?? company?.name ?? '',
        direccion: company?.sunatAddress ?? '',
      },
      cliente: {
        tipoDocumento: sale.client?.type ?? '1',
        numeroDocumento: sale.client?.typeNumber ?? '00000000',
        razonSocial: sale.client?.name ?? 'CLIENTE',
      },
      items: sale.salesDetails.map((d) => ({
        descripcion: d.entryDetail?.product?.name ?? 'Producto',
        cantidad: d.quantity,
        precioUnitario: d.price,
        total: (d.quantity ?? 0) * (d.price ?? 0),
        unitCode: 'NIU',
      })),
      subtotal,
      igv,
      total: sale.total,
      documentoModificado: {
        serie: invoice.serie,
        correlativo: invoice.nroCorrelativo,
        tipo: tipoOriginal,
        motivo: dto.motivo,
      },
      creditNoteTypeCode: codigoMotivo,
    };

    // 9. Send to SUNAT
    let transmissionResult: any = null;
    let finalStatus = 'TRANSMITTED';

    try {
      transmissionResult = await this.sunatService.sendDocument({
        companyId,
        documentType: 'creditNote',
        documentData,
        creditNoteId: creditNote.id,
      });

      // Determine status from result
      if (transmissionResult?.cdrCode === '0') {
        finalStatus = 'ACCEPTED';
      } else if (transmissionResult?.cdrCode === '99') {
        finalStatus = 'REJECTED';
      }
    } catch (err) {
      this.logger.error(
        `SUNAT transmission failed for credit note ${creditNote.id}`,
        err instanceof Error ? err.message : err,
      );
      finalStatus = 'TRANSMITTED';
    }

    // 10. Update credit note status
    const updated = await this.prisma.creditNote.update({
      where: { id: creditNote.id },
      data: { status: finalStatus },
    });

    // 11. Trigger accounting hook (fire-and-forget)
    this.accountingHook.postCreditNote(creditNote.id).catch((err) => {
      this.logger.warn(
        `Accounting hook failed for credit note ${creditNote.id}: ${err instanceof Error ? err.message : err}`,
      );
    });

    // 12. Auto-annul original sale if NC was ACCEPTED
    if (finalStatus === 'ACCEPTED') {
      try {
        await this.salesService.annulSale(
          sale.id,
          userId,
          organizationId,
          companyId,
        );
        this.logger.log(
          `Auto-annulled sale ${sale.id} after credit note ${creditNote.id} accepted`,
        );
      } catch (err) {
        this.logger.warn(
          `Auto-annul failed for sale ${sale.id} after CN ${creditNote.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return {
      ...updated,
      sunatResult: transmissionResult
        ? {
            status: transmissionResult.status,
            cdrCode: transmissionResult.cdrCode,
            cdrDescription: transmissionResult.cdrDescription,
          }
        : null,
    };
  }

  async findAll(tenant: any) {
    const organizationId = tenant?.organizationId ?? null;
    const companyId = tenant?.companyId ?? null;

    if (!organizationId) return [];

    const where: any = { organizationId };
    if (companyId) where.companyId = companyId;

    return this.prisma.creditNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        originalSale: {
          select: { id: true, total: true, createdAt: true },
        },
        originalInvoice: {
          select: {
            serie: true,
            nroCorrelativo: true,
            tipoComprobante: true,
          },
        },
      },
    });
  }

  async findOne(id: number, tenant: any) {
    const organizationId = tenant?.organizationId ?? null;

    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
      include: {
        originalSale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            client: { select: { name: true } },
          },
        },
        originalInvoice: {
          select: {
            serie: true,
            nroCorrelativo: true,
            tipoComprobante: true,
          },
        },
        createdBy: { select: { username: true } },
      },
    });

    if (!creditNote) {
      throw new NotFoundException('Nota de credito no encontrada.');
    }

    return creditNote;
  }
}
