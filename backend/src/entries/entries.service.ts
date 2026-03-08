import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  AuditAction,
  EntryPaymentMethod,
  PaymentTerm,
} from '@prisma/client';
import { EntryStatus } from './entry-status';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  buildOrganizationFilter,
  resolveOrganizationId,
} from 'src/tenancy/organization.utils';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import {
  InventoryUncheckedCreateInputWithOrganization,
  InventoryHistoryCreateInputWithOrganization,
} from 'src/tenancy/prisma-organization.types';
import { handlePrismaError } from 'src/common/errors/prisma-error.handler';
import { SubscriptionGuardService } from 'src/subscriptions/subscription-guard.service';

@Injectable()
export class EntriesService {
  [x: string]: any;
  private readonly logger = new Logger(EntriesService.name);
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
    private activityService: ActivityService,
    private accountingHook: AccountingHook,
    private accountingService: AccountingService,
    private readonly tenantContext: TenantContextService,
    private readonly verticalConfig: VerticalConfigService,
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  private async ensureEntriesFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.inventory === false) {
      throw new ForbiddenException(
        'El modulo de entradas/compras no esta habilitado para esta empresa.',
      );
    }
  }

  // Crear una nueva entrada con detalles
  async createEntry(
    data: {
      storeId: number;
      userId: number;
      providerId: number;
      date: Date;
      description?: string;
      tipoMoneda?: string;
      tipoCambioId?: number;
      paymentMethod?: EntryPaymentMethod;
      paymentTerm?: PaymentTerm;
      serie?: string;
      correlativo?: string;
      providerName?: string;
      totalGross?: number;
      igvRate?: number;
      organizationId?: number | null;
      referenceId?: string;
      details: {
        productId: number;
        name?: string;
        quantity: number;
        price: number;
        priceInSoles: number;
        series?: string[];
      }[];
      invoice?: {
        serie: string;
        nroCorrelativo: string;
        tipoComprobante: string;
        tipoMoneda: string;
        total: number;
        fechaEmision: Date;
      };
      guide?: {
        serie?: string;
        correlativo?: string;
        fechaEmision?: string;
        fechaEntregaTransportista?: string;
        motivoTraslado?: string;
        puntoPartida?: string;
        puntoLlegada?: string;
        destinatario?: string;
        pesoBrutoUnidad?: string;
        pesoBrutoTotal?: string;
        transportista?: string;
      };
    },
    organizationIdFromContext?: number | null,
  ) {
    try {
      // Validate entries feature is enabled
      const storeForValidation = await this.prisma.store.findUnique({
        where: { id: data.storeId },
        select: { companyId: true, organizationId: true },
      });
      await this.ensureEntriesFeatureEnabled(storeForValidation?.companyId);

      // Service-level subscription guard (double protection beyond HTTP guard)
      const orgIdForGuard = organizationIdFromContext ?? data.organizationId ?? storeForValidation?.organizationId;
      if (orgIdForGuard != null) {
        await this.subscriptionGuard.ensureCanOperate(
          orgIdForGuard,
          'entries_write',
          'RESTRICTED',
        );
      }

      if (data.referenceId) {
        try {
          const existingEntry = await this.prisma.entry.findFirst({
            where: {
              referenceId: data.referenceId,
              ...(organizationIdFromContext != null
                ? { store: { organizationId: organizationIdFromContext } }
                : {}),
            },
            include: { details: true },
          });
          if (existingEntry) {
            return existingEntry;
          }
        } catch (checkErr) {
          console.error('Prisma check for existing entry by referenceId failed:', checkErr);
          // If the check fails (e.g., schema mismatch), continue with creation
        }
      }
      // Normalizar y validar para evitar errores de Prisma por tipos inesperados
      const normalizedDetails = (data.details ?? []).map((d: any) => ({
        productId: Number(d.productId),
        name: d.name,
        quantity: d.quantity != null ? Number(d.quantity) : 0,
        price: d.price != null ? Number(d.price) : 0,
        priceInSoles:
          d.priceInSoles == null || d.priceInSoles === ''
            ? null
            : Number(d.priceInSoles),
        series: Array.isArray(d.series)
          ? d.series.map((s: any) => String(s))
          : undefined,
      }));

      const normalizedDate = data.date
        ? new Date(data.date as any)
        : new Date();

      if (
        data.paymentMethod &&
        !(['CASH', 'CREDIT'] as string[]).includes(String(data.paymentMethod))
      ) {
        throw new BadRequestException(
          'paymentMethod inválido. Use CASH o CREDIT',
        );
      }

      // Aceptar alias "comprobante" desde el frontend
      const invoicePayload: any = data.invoice
        ? {
            serie: (data.invoice as any).serie,
            nroCorrelativo: (data.invoice as any).nroCorrelativo,
            tipoComprobante:
              (data.invoice as any).tipoComprobante ??
              (data.invoice as any).comprobante ??
              undefined,
            tipoMoneda: (data.invoice as any).tipoMoneda,
            total: (data.invoice as any).total,
            fechaEmision: (data.invoice as any).fechaEmision
              ? new Date((data.invoice as any).fechaEmision)
              : undefined,
          }
        : undefined;
      // Declarar fuera de la transacción para usarlo después (actividad/auditoría)
      const verifiedProducts: {
        productId: number;
        name: string;
        quantity: number;
        price: number;
        priceInSoles: number;
        series?: string[];
      }[] = [];

      const totalGross =
        data.totalGross ??
        normalizedDetails.reduce(
          (sum, item) =>
            sum +
            (Number(item.priceInSoles) || 0) * (Number(item.quantity) || 0),
          0,
        );
      const igvRate = data.igvRate ?? 0.18;
      // Normalizar término de pago (CASH/CREDIT) aceptando alias desde el frontend
      const paymentTerm = (data as any).paymentTerm
        ? String((data as any).paymentTerm).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH'
        : data.paymentMethod &&
            String(data.paymentMethod).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH';
      const totalNet = +(totalGross / (1 + igvRate)).toFixed(2);
      const totalIgv = +(totalGross - totalNet).toFixed(2);

      let resolvedOrganizationId: number | null = null;

      const entry = await this.prisma.$transaction(async (prisma) => {
        // Verificar que la tienda exista
        const store = await prisma.store.findUnique({
          where: { id: data.storeId },
        });
        if (!store) {
          throw new NotFoundException(
            `La tienda con ID ${data.storeId} no existe.`,
          );
        }

        const storeOrganizationId =
          (store as { organizationId?: number | null }).organizationId ?? null;
        const organizationId = resolveOrganizationId({
          provided: data.organizationId,
          fallbacks: [
            organizationIdFromContext === undefined
              ? undefined
              : organizationIdFromContext,
            storeOrganizationId,
          ],
          mismatchError: `La tienda con ID ${data.storeId} pertenece a otra organización.`,
        });
        resolvedOrganizationId = organizationId;

        // Verificar que el proveedor exista
        const provider = await prisma.provider.findUnique({
          where: { id: data.providerId },
        });
        if (!provider) {
          throw new NotFoundException(
            `El proveedor con ID ${data.providerId} no existe.`,
          );
        }

        // Verificar que el usuario exista
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
        });
        if (!user) {
          throw new NotFoundException(
            `El usuario con ID ${data.userId} no existe.`,
          );
        }

        // Verificar que los productos existan (batch: 1 query en vez de N)
        const productIds = normalizedDetails
          .map((d) => d.productId)
          .filter((id): id is number => typeof id === 'number');

        for (const detail of normalizedDetails) {
          if (!detail.productId) {
            throw new BadRequestException(
              'El campo "productId" es obligatorio en los detalles.',
            );
          }
        }

        const foundProducts = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        });
        const productMap = new Map(foundProducts.map((p) => [p.id, p]));

        for (const detail of normalizedDetails) {
          const product = productMap.get(detail.productId);
          if (!product) {
            throw new NotFoundException(
              `El producto con ID ${detail.productId} no existe.`,
            );
          }

          verifiedProducts.push({
            productId: product.id,
            name: product.name,
            quantity: detail.quantity,
            price: detail.price,
            priceInSoles: detail.priceInSoles ?? 0,
            series: (detail as any)?.series ?? undefined,
          });
        }

        // Crear la entrada y los detalles
        // Construir el payload dinámicamente para evitar pasar campos que el cliente Prisma
        // no reconozca (por ejemplo si el cliente no está regenerado tras cambios en schema)
        const createPayload: any = {
          storeId: data.storeId,
          userId: data.userId,
          providerId: data.providerId,
          date: normalizedDate,
          description: data.description,
          tipoMoneda: data.tipoMoneda ?? 'PEN',
          tipoCambioId: data.tipoCambioId,
          paymentMethod: data.paymentMethod,
          paymentTerm: paymentTerm as any,
          serie: data.serie,
          correlativo: data.correlativo,
          providerName: data.providerName,
          totalGross,
          igvRate,
          organizationId,
          referenceId: data.referenceId ?? null,
          details: {
            create: verifiedProducts.map((product) => ({
              productId: product.productId,
              quantity: Number(product.quantity) || 0,
              price: Number(product.price) || 0,
              priceInSoles:
                (product as any).priceInSoles == null ||
                (product as any).priceInSoles === ''
                  ? null
                  : Number((product as any).priceInSoles),
            })),
          },
        };

        // Añadir datos de guia solo si vienen en el payload del frontend y no son undefined
        if (data.guide) {
          const guide = data.guide as any;
          if (guide.serie !== undefined) createPayload.guiaSerie = guide.serie ?? null;
          if (guide.correlativo !== undefined)
            createPayload.guiaCorrelativo = guide.correlativo ?? null;
          if (guide.fechaEmision !== undefined)
            createPayload.guiaFechaEmision = guide.fechaEmision ?? null;
          if (guide.fechaEntregaTransportista !== undefined)
            createPayload.guiaFechaEntregaTransportista =
              guide.fechaEntregaTransportista ?? null;
          if (guide.motivoTraslado !== undefined)
            createPayload.guiaMotivoTraslado = guide.motivoTraslado ?? null;
          if (guide.puntoPartida !== undefined)
            createPayload.guiaPuntoPartida = guide.puntoPartida ?? null;
          if (guide.puntoLlegada !== undefined)
            createPayload.guiaPuntoLlegada = guide.puntoLlegada ?? null;
          if (guide.destinatario !== undefined)
            createPayload.guiaDestinatario = guide.destinatario ?? null;
          if (guide.pesoBrutoUnidad !== undefined)
            createPayload.guiaPesoBrutoUnidad = guide.pesoBrutoUnidad ?? null;
          if (guide.pesoBrutoTotal !== undefined)
            createPayload.guiaPesoBrutoTotal = guide.pesoBrutoTotal ?? null;
          if (guide.transportista !== undefined)
            createPayload.guiaTransportista = guide.transportista ?? null;
        }

        const entry = await prisma.entry.create({
          data: createPayload as any,
          include: { details: true },
        });

        // Crear el comprobante si se proporcionan datos
        if (invoicePayload) {
          await prisma.invoice.create({
            data: {
              entryId: entry.id,
              serie: invoicePayload.serie,
              nroCorrelativo: invoicePayload.nroCorrelativo,
              tipoComprobante: invoicePayload.tipoComprobante,
              tipoMoneda: invoicePayload.tipoMoneda,
              total: invoicePayload.total,
              fechaEmision: invoicePayload.fechaEmision,
            },
          });
        }

        // Asociar series a los detalles de entrada
        for (const detail of entry.details) {
          const detailData = normalizedDetails.find(
            (d) => d.productId === detail.productId,
          );
          if (detailData?.series && detailData.series.length > 0) {
            // Filtrar valores únicos de 'serial' para evitar duplicados
            const uniqueSeries = Array.from(new Set(detailData.series));
            try {
              await prisma.entryDetailSeries.createMany({
                data: uniqueSeries.map((serial) => ({
                  entryDetailId: detail.id,
                  serial: String(serial),
                  organizationId,
                  storeId: data.storeId || null,
                })),
                skipDuplicates: true, // Ignorar duplicados en la base de datos
              });
            } catch (error) {
              console.error('Error al insertar series:', error);
              throw new Error(
                'No se pudo insertar las series. Verifica que no estén duplicadas.',
              );
            }
          }
        }

        // Actualizar el stock de los productos en el inventario
        // Batch fetch: inventories y storeOnInventory existentes (2 queries en vez de 2N)
        const existingInventories = await prisma.inventory.findMany({
          where: { productId: { in: productIds }, storeId: data.storeId },
        });
        const inventoryByProduct = new Map(
          existingInventories.map((inv) => [inv.productId, inv]),
        );

        const existingInvIds = existingInventories.map((inv) => inv.id);
        const existingStoreInvs =
          existingInvIds.length > 0
            ? await prisma.storeOnInventory.findMany({
                where: {
                  storeId: data.storeId,
                  inventoryId: { in: existingInvIds },
                },
              })
            : [];
        const storeInvByInventoryId = new Map(
          existingStoreInvs.map((si) => [si.inventoryId, si]),
        );

        for (const detail of verifiedProducts) {
          // Usar cache del batch fetch; crear solo si no existe
          let inventory = inventoryByProduct.get(detail.productId);
          if (!inventory) {
            const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization =
              {
                productId: detail.productId,
                storeId: data.storeId,
                organizationId,
              };
            inventory = await prisma.inventory.create({
              data: inventoryCreateData,
            });
            inventoryByProduct.set(detail.productId, inventory);
          }

          // Actualizar el campo inventoryId en los EntryDetail ya creados
          const entryDetail = entry.details.find(
            (d) => d.productId === detail.productId,
          );
          if (entryDetail) {
            await prisma.entryDetail.update({
              where: { id: entryDetail.id },
              data: { inventoryId: inventory.id },
            });
          }

          const storeInventory = storeInvByInventoryId.get(inventory.id);

          if (!storeInventory) {
            await prisma.storeOnInventory.create({
              data: {
                storeId: data.storeId,
                inventoryId: inventory.id,
                stock: detail.quantity || 0,
              },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization =
              {
                inventory: { connect: { id: inventory.id } },
                user: { connect: { id: data.userId } },
                action: 'update',
                stockChange: detail.quantity || 0,
                previousStock: 0,
                newStock: detail.quantity || 0,
                organizationId,
              };
            await prisma.inventoryHistory.create({
              data: historyCreateData,
            });
          } else {
            await prisma.storeOnInventory.update({
              where: { id: storeInventory.id },
              data: { stock: { increment: detail.quantity || 0 } },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization =
              {
                inventory: { connect: { id: inventory.id } },
                user: { connect: { id: data.userId } },
                action: 'update',
                stockChange: detail.quantity || 0,
                previousStock: storeInventory.stock,
                newStock: storeInventory.stock + (detail.quantity || 0),
                organizationId,
              };
            await prisma.inventoryHistory.create({
              data: historyCreateData,
            });
          }
        }
        return entry;
      });

      const tenantContext = this.tenantContext?.getContext?.() ?? null;
      await this.accountingService.createJournalForInventoryEntry(
        entry.id,
        tenantContext,
      );

      logOrganizationContext({
        service: EntriesService.name,
        operation: 'createEntry',
        organizationId: resolvedOrganizationId,
        metadata: {
          entryId: entry.id,
          storeId: data.storeId,
          providerId: data.providerId,
          userId: data.userId,
        },
      });

      const summary = verifiedProducts
        .map((d) => `${d.quantity}x ${d.name}`)
        .join(', ');
      await this.activityService.log({
        actorId: data.userId,
        entityType: 'InventoryItem',
        entityId: entry.id.toString(),
        action: AuditAction.CREATED,
        summary: `Entrada creada con productos: ${summary}`,
        diff: {
          entryId: entry.id,
          storeId: data.storeId,
          providerId: data.providerId,
          date: (data.date as any)
            ? new Date(data.date as any).toISOString()
            : null,
          description: data.description,
          currency: data.tipoMoneda,
          paymentTerm,
          totalGross,
          totalNet,
          totalIgv,
          igvRate,
          details: verifiedProducts,
          invoice: data.invoice ?? null,
        } as any,
        organizationId: resolvedOrganizationId ?? null,
        companyId: storeForValidation?.companyId ?? null,
      });
      try {
        await this.accountingHook.postPurchase(entry.id);
      } catch (err) {
        // Accounting hook failures shouldn't block operation
      }
      return { ...entry, totalNet, totalIgv } as any;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }
  //

  // Listar todas las entradas
  async findAllEntries(organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      // Validate entries feature is enabled
      await this.ensureEntriesFeatureEnabled(resolvedCompanyId);

      logOrganizationContext({
        service: EntriesService.name,
        operation: 'findAllEntries',
        organizationId: resolvedOrganizationId,
        metadata: { scope: 'list' },
      });

      const where = buildOrganizationFilter(
        resolvedOrganizationId,
      ) as Prisma.EntryWhereInput;

      if (resolvedCompanyId !== null) {
        where.store = {
          companyId: resolvedCompanyId,
        } as Prisma.StoreWhereInput;
      }

      const entries = await this.prisma.entry.findMany({
        where,
        take: 500,
        orderBy: { createdAt: 'desc' },
        include: {
          details: { include: { product: { include: { category: true } }, series: true } },
          provider: true,
          user: true,
          store: true,
        },
      });
      // Transformar los datos para incluir las series en cada detalle
      const transformedEntries = entries.map((entry) => ({
        ...entry,
        details: entry.details.map((detail) => ({
          ...detail,
          product_name: detail.product.name, // Asegúrate de incluir el nombre del producto
          series: detail.series.map((s) => s.serial), // Extraer solo los números de serie
        })),
      }));

      return transformedEntries;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }
  // Buscar documentos PDF de entradas con filtros y paginación
  async findEntryDocuments(params: {
    organizationId?: number | null;
    search?: string;
    type?: 'invoice' | 'guide' | 'all';
    providerId?: number;
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        params.organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
      const skip = (page - 1) * pageSize;

      const where: Prisma.EntryWhereInput = {
        ...(buildOrganizationFilter(resolvedOrganizationId) as Prisma.EntryWhereInput),
        ...(resolvedCompanyId !== null
          ? { store: { companyId: resolvedCompanyId } as Prisma.StoreWhereInput }
          : {}),
      };

      // Only entries that have at least one PDF
      const docType = params.type ?? 'all';
      if (docType === 'invoice') {
        where.pdfUrl = { not: null };
      } else if (docType === 'guide') {
        where.guiaUrl = { not: null };
      } else {
        where.OR = [{ pdfUrl: { not: null } }, { guiaUrl: { not: null } }];
      }

      if (params.providerId) where.providerId = params.providerId;
      if (params.storeId) where.storeId = params.storeId;

      if (params.dateFrom || params.dateTo) {
        where.date = {};
        if (params.dateFrom) {
          (where.date as Prisma.DateTimeFilter).gte = new Date(params.dateFrom);
        }
        if (params.dateTo) {
          const to = new Date(params.dateTo);
          to.setHours(23, 59, 59, 999);
          (where.date as Prisma.DateTimeFilter).lte = to;
        }
      }

      if (params.search) {
        const searchTerm = params.search;
        where.AND = [
          ...(Array.isArray((where as any).AND) ? (where as any).AND : []),
          {
            OR: [
              { provider: { name: { contains: searchTerm, mode: 'insensitive' } } },
              { invoice: { serie: { contains: searchTerm, mode: 'insensitive' } } },
              { invoice: { nroCorrelativo: { contains: searchTerm, mode: 'insensitive' } } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.entry.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            createdAt: true,
            pdfUrl: true,
            guiaUrl: true,
            tipoMoneda: true,
            description: true,
            provider: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } },
            invoice: {
              select: {
                serie: true,
                nroCorrelativo: true,
                tipoComprobante: true,
                total: true,
                fechaEmision: true,
              },
            },
          },
        }),
        this.prisma.entry.count({ where }),
      ]);

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }

  // Obtener una entrada específica por ID
  async findEntryById(id: number, organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      logOrganizationContext({
        service: EntriesService.name,
        operation: 'findEntryById',
        organizationId: resolvedOrganizationId,
        metadata: { entryId: id },
      });

      const where: Prisma.EntryWhereInput = {
        id,
        ...(buildOrganizationFilter(
          resolvedOrganizationId,
        ) as Prisma.EntryWhereInput),
      };

      if (resolvedCompanyId !== null) {
        where.store = {
          companyId: resolvedCompanyId,
        } as Prisma.StoreWhereInput;
      }

      const entry = await this.prisma.entry.findFirst({
        where,
        include: {
          details: { include: { product: true, series: true } },
          provider: true,
          user: true,
          store: true,
        },
      });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${id} no existe.`);
      }

      // Transformar los datos para incluir las series en cada detalle
      const transformedEntry = {
        ...entry,
        details: entry.details.map((detail) => ({
          ...detail,
          product_name: detail.product.name, // Asegúrate de incluir el nombre del producto
          series: detail.series.map((s) => s.serial), // Extraer solo los números de serie
        })),
      };

      return transformedEntry;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }
  //

  //ELIMINAR ENTRADA
  async deleteEntry(id: number, organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      // Validate entries feature is enabled
      await this.ensureEntriesFeatureEnabled(resolvedCompanyId);

      const organizationFilter = buildOrganizationFilter(
        resolvedOrganizationId,
      ) as Prisma.EntryWhereInput;

      const where: Prisma.EntryWhereInput = { id, ...organizationFilter };
      if (resolvedCompanyId !== null) {
        where.store = {
          companyId: resolvedCompanyId,
        } as Prisma.StoreWhereInput;
      }

      const entry = await this.prisma.entry.findFirst({
        where,
        include: { details: { include: { series: true, product: true } } },
      });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${id} no existe.`);
      }

      // Guard: CANCELED entries cannot be deleted
      if ((entry as any).status === EntryStatus.CANCELED) {
        throw new ConflictException(
          'No se puede eliminar una entrada anulada.',
        );
      }

      // Guard: DRAFT entries skip stock validation (no stock impact)
      const isDraft = (entry as any).status === EntryStatus.DRAFT;

      const orgId = (entry as any).organizationId ?? null;
      const entryDetailIds = entry.details.map((d) => d.id);

      // Validar que no existan ventas que referencien esta entrada (skip for DRAFT)
      if (!isDraft && entryDetailIds.length > 0) {
        const salesCount = await this.prisma.salesDetail.count({
          where: { entryDetailId: { in: entryDetailIds } },
        });
        if (salesCount > 0) {
          throw new ConflictException(
            `No se puede eliminar la entrada porque tiene ${salesCount} producto(s) asociado(s) a ventas registradas. Primero debe anular las ventas correspondientes.`,
          );
        }
      }

      // Validar que el stock no quede negativo al revertir (skip for DRAFT — no stock impact)
      if (!isDraft) {
        for (const detail of entry.details) {
          const storeInventory = await this.prisma.storeOnInventory.findFirst({
            where: {
              storeId: entry.storeId,
              inventory: { productId: detail.productId },
            },
          });

          if (storeInventory && storeInventory.stock < detail.quantity) {
            throw new ConflictException(
              `No se puede eliminar la entrada porque el producto "${detail.product.name}" tiene stock actual (${storeInventory.stock}) menor a la cantidad ingresada (${detail.quantity}). Es posible que se hayan realizado ventas u otros movimientos con ese inventario.`,
            );
          }
        }
      }

      logOrganizationContext({
        service: EntriesService.name,
        operation: 'deleteEntry',
        organizationId: orgId,
        metadata: {
          entryId: entry.id,
          storeId: entry.storeId,
          userId: entry.userId,
        },
      });

      // Ejecutar toda la eliminacion dentro de una transaccion
      const deletedEntry = await this.prisma.$transaction(async (tx) => {
        // Eliminar series asociadas (real series only exist for POSTED entries)
        if (!isDraft) {
          for (const detail of entry.details) {
            await tx.entryDetailSeries.deleteMany({
              where: { entryDetailId: detail.id },
            });
          }
        }

        // Revertir stock y registrar historial (skip for DRAFT — no stock was applied)
        if (!isDraft) {
          for (const detail of entry.details) {
            const storeInventory = await tx.storeOnInventory.findFirst({
              where: {
                storeId: entry.storeId,
                inventory: { productId: detail.productId },
              },
            });

            if (!storeInventory) {
              throw new NotFoundException(
                `No se encontró el inventario para el producto con ID ${detail.productId} en la tienda con ID ${entry.storeId}.`,
              );
            }

            await tx.storeOnInventory.update({
              where: { id: storeInventory.id },
              data: { stock: { decrement: detail.quantity } },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization =
              {
                inventory: { connect: { id: storeInventory.inventoryId } },
                user: { connect: { id: entry.userId } },
                action: 'delete',
                stockChange: -detail.quantity,
                previousStock: storeInventory.stock,
                newStock: storeInventory.stock - detail.quantity,
                organizationId: orgId,
              };

            await tx.inventoryHistory.create({
              data: historyCreateData,
            });
          }
        }

        // Desvincular guias de remision (relacion opcional)
        await tx.shippingGuide.updateMany({
          where: { entryId: entry.id },
          data: { entryId: null },
        });

        // Eliminar la entrada (cascade: Invoice, EntryDetail)
        return tx.entry.delete({ where: { id: entry.id } });
      });

      // Registrar actividad fuera de la transaccion (no critico)
      const summary = entry.details
        .map((d) => `${d.quantity}x ${d.product.name}`)
        .join(', ');
      try {
        await this.activityService.log({
          actorId: entry.userId,
          entityType: 'InventoryItem',
          entityId: entry.id.toString(),
          action: AuditAction.DELETED,
          summary: `Entrada #${entry.id} eliminada afectando: ${summary}`,
          organizationId: orgId ?? null,
          companyId: resolvedCompanyId ?? null,
        });
      } catch (logError) {
        console.warn('No se pudo registrar la actividad de eliminacion:', logError);
      }

      return deletedEntry;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }

  // ELIMINAR ENTRADAS
  async deleteEntries(ids: number[], organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException(
          'No se proporcionaron IDs válidos para eliminar.',
        );
      }

      const where: Prisma.EntryWhereInput = {
        id: { in: ids },
        ...(buildOrganizationFilter(
          resolvedOrganizationId,
        ) as Prisma.EntryWhereInput),
      };
      if (resolvedCompanyId !== null) {
        where.store = {
          companyId: resolvedCompanyId,
        } as Prisma.StoreWhereInput;
      }

      const entries = await this.prisma.entry.findMany({
        where,
        include: { details: { include: { series: true, product: true } } },
      });

      if (entries.length === 0) {
        throw new NotFoundException(
          'No se encontraron entradas con los IDs proporcionados.',
        );
      }

      // Separate draft and posted entries — canceled entries cannot be deleted
      const canceledEntries = entries.filter((e) => (e as any).status === EntryStatus.CANCELED);
      if (canceledEntries.length > 0) {
        throw new ConflictException(
          `No se pueden eliminar entradas anuladas (IDs: ${canceledEntries.map((e) => e.id).join(', ')}).`,
        );
      }
      const draftEntries = entries.filter((e) => (e as any).status === EntryStatus.DRAFT);
      const postedEntries = entries.filter((e) => (e as any).status !== EntryStatus.DRAFT);

      // Validar que ninguna entrada POSTED tenga ventas asociadas
      const allDetailIds = postedEntries.flatMap((e) => e.details.map((d) => d.id));
      if (allDetailIds.length > 0) {
        const salesWithEntries = await this.prisma.salesDetail.findMany({
          where: { entryDetailId: { in: allDetailIds } },
          select: {
            entryDetailId: true,
            entryDetail: { select: { entryId: true } },
          },
          take: 20,
        });

        if (salesWithEntries.length > 0) {
          const blockedEntryIds = [
            ...new Set(
              salesWithEntries.map((s) => s.entryDetail.entryId),
            ),
          ];
          throw new ConflictException(
            `No se pueden eliminar las entradas porque ${blockedEntryIds.length} entrada(s) (IDs: ${blockedEntryIds.join(', ')}) tienen productos asociados a ventas registradas. Primero debe anular las ventas correspondientes.`,
          );
        }
      }

      // Validar que el stock no quede negativo al revertir (solo POSTED)
      for (const entry of postedEntries) {
        for (const detail of entry.details) {
          const storeInventory = await this.prisma.storeOnInventory.findFirst({
            where: {
              storeId: entry.storeId,
              inventory: { productId: detail.productId },
            },
          });

          if (storeInventory && storeInventory.stock < detail.quantity) {
            throw new ConflictException(
              `No se puede eliminar la entrada #${entry.id} porque el producto "${detail.product.name}" tiene stock actual (${storeInventory.stock}) menor a la cantidad ingresada (${detail.quantity}). Es posible que se hayan realizado ventas u otros movimientos con ese inventario.`,
            );
          }
        }
      }

      // Ejecutar toda la eliminacion dentro de una transaccion
      const result = await this.prisma.$transaction(async (tx) => {
        for (const entry of postedEntries) {
          const entryOrgId =
            (entry as { organizationId?: number | null }).organizationId ??
            null;

          logOrganizationContext({
            service: EntriesService.name,
            operation: 'deleteEntries.entry',
            organizationId: entryOrgId,
            metadata: {
              entryId: entry.id,
              storeId: entry.storeId,
              userId: entry.userId,
              companyId: resolvedCompanyId ?? undefined,
            },
          });

          // Eliminar series
          for (const detail of entry.details) {
            await tx.entryDetailSeries.deleteMany({
              where: { entryDetailId: detail.id },
            });
          }

          // Revertir stock y registrar historial
          for (const detail of entry.details) {
            const storeInventory = await tx.storeOnInventory.findFirst({
              where: {
                storeId: entry.storeId,
                inventory: { productId: detail.productId },
              },
            });

            if (!storeInventory) {
              throw new NotFoundException(
                `No se encontró el inventario para el producto con ID ${detail.productId} en la tienda con ID ${entry.storeId}.`,
              );
            }

            await tx.storeOnInventory.update({
              where: { id: storeInventory.id },
              data: { stock: { decrement: detail.quantity } },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization =
              {
                inventory: { connect: { id: storeInventory.inventoryId } },
                user: { connect: { id: entry.userId } },
                action: 'delete',
                stockChange: -detail.quantity,
                previousStock: storeInventory.stock,
                newStock: storeInventory.stock - detail.quantity,
                organizationId: entryOrgId,
              };

            await tx.inventoryHistory.create({
              data: historyCreateData,
            });
          }

          // Desvincular guias de remision (relacion opcional)
          await tx.shippingGuide.updateMany({
            where: { entryId: entry.id },
            data: { entryId: null },
          });
        }

        // Eliminar todas las entradas
        const deleted = await tx.entry.deleteMany({
          where: { id: { in: entries.map((e) => e.id) } },
        });

        return deleted;
      });

      // Registrar actividad fuera de la transaccion (no critico)
      for (const entry of entries) {
        const summary = entry.details
          .map((d) => `${d.quantity}x ${d.product.name}`)
          .join(', ');
        try {
          await this.activityService.log({
            actorId: entry.userId,
            entityType: 'InventoryItem',
            entityId: entry.id.toString(),
            action: AuditAction.DELETED,
            summary: `Entrada #${entry.id} eliminada afectando: ${summary}`,
            organizationId: resolvedOrganizationId ?? null,
            companyId: resolvedCompanyId ?? null,
          });
        } catch (logError) {
          console.warn('No se pudo registrar la actividad de eliminacion:', logError);
        }
      }

      return {
        message: `${result.count} entrada(s) eliminada(s) correctamente.`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }

  // Obtener todas las entradas de una tienda específica
  async findAllByStore(storeId: number, organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      // Validate entries feature is enabled
      await this.ensureEntriesFeatureEnabled(resolvedCompanyId);

      const store = await this.prisma.store.findFirst({
        where: {
          id: storeId,
          ...(buildOrganizationFilter(
            resolvedOrganizationId,
          ) as Prisma.StoreWhereInput),
          ...(resolvedCompanyId !== null
            ? { companyId: resolvedCompanyId }
            : {}),
        },
      });
      if (!store) {
        throw new NotFoundException(
          'Tienda no encontrada en esta organización.',
        );
      }

      return this.prisma.entry.findMany({
        where: {
          storeId,
          ...(buildOrganizationFilter(
            resolvedOrganizationId,
          ) as Prisma.EntryWhereInput),
          ...(resolvedCompanyId !== null
            ? { store: { companyId: resolvedCompanyId } }
            : {}),
        },
        include: { details: true, provider: true, user: true },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }
  async findRecentEntries(limit: number, organizationId?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedOrganizationId =
        organizationId ?? ctx.organizationId ?? null;
      const resolvedCompanyId = ctx.companyId ?? null;

      const inventoryFilter = buildOrganizationFilter(
        resolvedOrganizationId,
      ) as Prisma.InventoryWhereInput;

      const details = await this.prisma.entryDetail.findMany({
        where: {
          inventory: {
            ...inventoryFilter,
            ...(resolvedCompanyId !== null
              ? {
                  storeOnInventory: {
                    some: { store: { companyId: resolvedCompanyId } },
                  },
                }
              : {}),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 3,
        include: {
          product: {
            include: { category: true, brand: { select: { name: true } } },
          },
          inventory: { include: { storeOnInventory: true } },
        },
      });

      const result: any[] = [];
      const seen = new Set<number>();
      for (const d of details) {
        if (seen.has(d.product.id)) continue;
        const stock =
          d.inventory?.storeOnInventory?.reduce((s, i) => s + i.stock, 0) ?? 0;
        if (stock > 0) {
          result.push({
            id: d.product.id,
            name: d.product.name,
            description: d.product.description ?? '',
            price: d.product.priceSell ?? d.product.price,
            brand: d.product.brand ?? 'Sin marca',
            category: d.product.category?.name ?? 'Sin categoría',
            images: d.product.images ?? [],
            stock,
          });
          seen.add(d.product.id);
          if (result.length >= limit) break;
        }
      }
      return result;
    } catch (error) {
      console.error('Error fetching recent entries:', error);
      throw new Error('Failed to fetch recent entries');
    }
  }
  // Actualizar una entrada con un PDF
  async updateEntryPdf(entryId: number, pdfUrl: string) {
    try {
      // Validar que entryId sea un número válido
      if (!entryId || isNaN(entryId) || !Number.isInteger(entryId)) {
        throw new BadRequestException(
          `ID de entrada inválido: ${entryId}. Debe ser un número entero válido.`
        );
      }

      const entry = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: { store: { select: { companyId: true } } },
      });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }

      // Validate entries feature is enabled
      await this.ensureEntriesFeatureEnabled(entry.store?.companyId);

      return this.prisma.entry.update({
        where: { id: entryId },
        data: { pdfUrl },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }

  // Actualizar una entrada con un PDF_GUIA
  async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
    try {
      // Validar que entryId sea un número válido
      if (!entryId || isNaN(entryId) || !Number.isInteger(entryId)) {
        throw new BadRequestException(
          `ID de entrada inválido: ${entryId}. Debe ser un número entero válido.`
        );
      }

      const entry = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: { store: { select: { companyId: true } } },
      });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }

      // Validate entries feature is enabled
      await this.ensureEntriesFeatureEnabled(entry.store?.companyId);

      return this.prisma.entry.update({
        where: { id: entryId },
        data: { guiaUrl },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      handlePrismaError(error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // DRAFT SYSTEM: createDraft → updateDraft → postDraft  |  cancelEntry
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Creates an entry in DRAFT state. No stock, inventory, series, or
   * accounting impact. Series are stored as JSON in EntryDetail.draftSeries.
   */
  async createDraft(
    data: Parameters<EntriesService['createEntry']>[0],
    organizationIdFromContext?: number | null,
  ) {
    try {
      const storeForValidation = await this.prisma.store.findUnique({
        where: { id: data.storeId },
        select: { companyId: true, organizationId: true },
      });
      await this.ensureEntriesFeatureEnabled(storeForValidation?.companyId);

      // Normalize details
      const normalizedDetails = (data.details ?? []).map((d: any) => ({
        productId: Number(d.productId),
        name: d.name,
        quantity: d.quantity != null ? Number(d.quantity) : 0,
        price: d.price != null ? Number(d.price) : 0,
        priceInSoles:
          d.priceInSoles == null || d.priceInSoles === ''
            ? null
            : Number(d.priceInSoles),
        series: Array.isArray(d.series)
          ? d.series.map((s: any) => String(s))
          : undefined,
      }));

      const normalizedDate = data.date ? new Date(data.date as any) : new Date();

      const invoicePayload: any = data.invoice
        ? {
            serie: (data.invoice as any).serie,
            nroCorrelativo: (data.invoice as any).nroCorrelativo,
            tipoComprobante:
              (data.invoice as any).tipoComprobante ??
              (data.invoice as any).comprobante ??
              undefined,
            tipoMoneda: (data.invoice as any).tipoMoneda,
            total: (data.invoice as any).total,
            fechaEmision: (data.invoice as any).fechaEmision
              ? new Date((data.invoice as any).fechaEmision)
              : undefined,
          }
        : undefined;

      const totalGross =
        data.totalGross ??
        normalizedDetails.reduce(
          (sum, item) =>
            sum + (Number(item.priceInSoles) || 0) * (Number(item.quantity) || 0),
          0,
        );
      const igvRate = data.igvRate ?? 0.18;
      const paymentTerm = (data as any).paymentTerm
        ? String((data as any).paymentTerm).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH'
        : data.paymentMethod &&
            String(data.paymentMethod).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH';

      const entry = await this.prisma.$transaction(async (prisma) => {
        const store = await prisma.store.findUnique({
          where: { id: data.storeId },
        });
        if (!store) {
          throw new NotFoundException(`La tienda con ID ${data.storeId} no existe.`);
        }

        const storeOrganizationId =
          (store as { organizationId?: number | null }).organizationId ?? null;
        const organizationId = resolveOrganizationId({
          provided: data.organizationId,
          fallbacks: [
            organizationIdFromContext === undefined
              ? undefined
              : organizationIdFromContext,
            storeOrganizationId,
          ],
          mismatchError: `La tienda con ID ${data.storeId} pertenece a otra organización.`,
        });

        // Validate provider, user, products
        const provider = await prisma.provider.findUnique({
          where: { id: data.providerId },
        });
        if (!provider) {
          throw new NotFoundException(`El proveedor con ID ${data.providerId} no existe.`);
        }

        const user = await prisma.user.findUnique({
          where: { id: data.userId },
        });
        if (!user) {
          throw new NotFoundException(`El usuario con ID ${data.userId} no existe.`);
        }

        const productIds = normalizedDetails
          .map((d) => d.productId)
          .filter((id): id is number => typeof id === 'number');

        const foundProducts = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        });
        const productMap = new Map(foundProducts.map((p) => [p.id, p]));

        const verifiedProducts: typeof normalizedDetails = [];
        for (const detail of normalizedDetails) {
          if (!detail.productId) {
            throw new BadRequestException('El campo "productId" es obligatorio en los detalles.');
          }
          const product = productMap.get(detail.productId);
          if (!product) {
            throw new NotFoundException(`El producto con ID ${detail.productId} no existe.`);
          }
          verifiedProducts.push({
            ...detail,
            name: product.name,
          });
        }

        // Build create payload
        const createPayload: any = {
          storeId: data.storeId,
          userId: data.userId,
          providerId: data.providerId,
          date: normalizedDate,
          description: data.description,
          tipoMoneda: data.tipoMoneda ?? 'PEN',
          tipoCambioId: data.tipoCambioId,
          paymentMethod: data.paymentMethod,
          paymentTerm: paymentTerm as any,
          serie: data.serie,
          correlativo: data.correlativo,
          providerName: data.providerName,
          totalGross,
          igvRate,
          organizationId,
          referenceId: data.referenceId ?? null,
          status: EntryStatus.DRAFT,
          details: {
            create: verifiedProducts.map((product) => ({
              productId: product.productId,
              quantity: Number(product.quantity) || 0,
              price: Number(product.price) || 0,
              priceInSoles:
                product.priceInSoles == null || product.priceInSoles === ('' as any)
                  ? null
                  : Number(product.priceInSoles),
              // Store series as JSON — no real EntryDetailSeries created
              draftSeries: product.series && product.series.length > 0
                ? product.series
                : undefined,
            })),
          },
        };

        // Guide data
        if (data.guide) {
          const guide = data.guide as any;
          if (guide.serie !== undefined) createPayload.guiaSerie = guide.serie ?? null;
          if (guide.correlativo !== undefined) createPayload.guiaCorrelativo = guide.correlativo ?? null;
          if (guide.fechaEmision !== undefined) createPayload.guiaFechaEmision = guide.fechaEmision ?? null;
          if (guide.fechaEntregaTransportista !== undefined)
            createPayload.guiaFechaEntregaTransportista = guide.fechaEntregaTransportista ?? null;
          if (guide.motivoTraslado !== undefined) createPayload.guiaMotivoTraslado = guide.motivoTraslado ?? null;
          if (guide.puntoPartida !== undefined) createPayload.guiaPuntoPartida = guide.puntoPartida ?? null;
          if (guide.puntoLlegada !== undefined) createPayload.guiaPuntoLlegada = guide.puntoLlegada ?? null;
          if (guide.destinatario !== undefined) createPayload.guiaDestinatario = guide.destinatario ?? null;
          if (guide.pesoBrutoUnidad !== undefined) createPayload.guiaPesoBrutoUnidad = guide.pesoBrutoUnidad ?? null;
          if (guide.pesoBrutoTotal !== undefined) createPayload.guiaPesoBrutoTotal = guide.pesoBrutoTotal ?? null;
          if (guide.transportista !== undefined) createPayload.guiaTransportista = guide.transportista ?? null;
        }

        const created = await prisma.entry.create({
          data: createPayload as any,
          include: { details: true },
        });

        // Invoice (just record, no fiscal impact)
        if (invoicePayload) {
          await prisma.invoice.create({
            data: {
              entryId: created.id,
              serie: invoicePayload.serie,
              nroCorrelativo: invoicePayload.nroCorrelativo,
              tipoComprobante: invoicePayload.tipoComprobante,
              tipoMoneda: invoicePayload.tipoMoneda,
              total: invoicePayload.total,
              fechaEmision: invoicePayload.fechaEmision,
            },
          });
        }

        return created;
      });

      this.logger.log(`Draft entry #${entry.id} created`);
      return entry;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }

  /**
   * Updates a DRAFT entry — replaces details and invoice.
   * Only works on entries with status === DRAFT.
   */
  async updateDraft(
    entryId: number,
    data: Parameters<EntriesService['createEntry']>[0],
    organizationIdFromContext?: number | null,
  ) {
    try {
      const existing = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: { details: true, invoice: true },
      });

      if (!existing) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }
      if ((existing as any).status !== EntryStatus.DRAFT) {
        throw new ConflictException(
          'Solo se pueden editar entradas en estado Borrador.',
        );
      }

      const storeForValidation = await this.prisma.store.findUnique({
        where: { id: data.storeId },
        select: { companyId: true, organizationId: true },
      });
      await this.ensureEntriesFeatureEnabled(storeForValidation?.companyId);

      // Normalize
      const normalizedDetails = (data.details ?? []).map((d: any) => ({
        productId: Number(d.productId),
        quantity: d.quantity != null ? Number(d.quantity) : 0,
        price: d.price != null ? Number(d.price) : 0,
        priceInSoles:
          d.priceInSoles == null || d.priceInSoles === ''
            ? null
            : Number(d.priceInSoles),
        series: Array.isArray(d.series)
          ? d.series.map((s: any) => String(s))
          : undefined,
      }));

      const normalizedDate = data.date ? new Date(data.date as any) : new Date();

      const invoicePayload: any = data.invoice
        ? {
            serie: (data.invoice as any).serie,
            nroCorrelativo: (data.invoice as any).nroCorrelativo,
            tipoComprobante:
              (data.invoice as any).tipoComprobante ??
              (data.invoice as any).comprobante ??
              undefined,
            tipoMoneda: (data.invoice as any).tipoMoneda,
            total: (data.invoice as any).total,
            fechaEmision: (data.invoice as any).fechaEmision
              ? new Date((data.invoice as any).fechaEmision)
              : undefined,
          }
        : undefined;

      const totalGross =
        data.totalGross ??
        normalizedDetails.reduce(
          (sum, item) =>
            sum + (Number(item.priceInSoles) || 0) * (Number(item.quantity) || 0),
          0,
        );
      const igvRate = data.igvRate ?? 0.18;
      const paymentTerm = (data as any).paymentTerm
        ? String((data as any).paymentTerm).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH'
        : data.paymentMethod &&
            String(data.paymentMethod).toUpperCase() === 'CREDIT'
          ? 'CREDIT'
          : 'CASH';

      const updated = await this.prisma.$transaction(async (prisma) => {
        // Validate products
        const productIds = normalizedDetails
          .map((d) => d.productId)
          .filter((id): id is number => typeof id === 'number');
        const foundProducts = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        });
        const productMap = new Map(foundProducts.map((p) => [p.id, p]));
        for (const detail of normalizedDetails) {
          if (!productMap.has(detail.productId)) {
            throw new NotFoundException(`El producto con ID ${detail.productId} no existe.`);
          }
        }

        // Delete old details (cascade deletes series if any existed)
        await prisma.entryDetail.deleteMany({
          where: { entryId },
        });

        // Delete old invoice
        if (existing.invoice) {
          await prisma.invoice.delete({
            where: { id: existing.invoice.id },
          });
        }

        // Re-create details with draftSeries
        for (const detail of normalizedDetails) {
          await prisma.entryDetail.create({
            data: {
              entryId,
              productId: detail.productId,
              quantity: Number(detail.quantity) || 0,
              price: Number(detail.price) || 0,
              priceInSoles:
                detail.priceInSoles == null ? null : Number(detail.priceInSoles),
              draftSeries:
                detail.series && detail.series.length > 0
                  ? detail.series
                  : undefined,
            },
          });
        }

        // Re-create invoice if provided
        if (invoicePayload) {
          await prisma.invoice.create({
            data: {
              entryId,
              serie: invoicePayload.serie,
              nroCorrelativo: invoicePayload.nroCorrelativo,
              tipoComprobante: invoicePayload.tipoComprobante,
              tipoMoneda: invoicePayload.tipoMoneda,
              total: invoicePayload.total,
              fechaEmision: invoicePayload.fechaEmision,
            },
          });
        }

        // Update header fields
        const updatePayload: any = {
          storeId: data.storeId,
          userId: data.userId,
          providerId: data.providerId,
          date: normalizedDate,
          description: data.description,
          tipoMoneda: data.tipoMoneda ?? 'PEN',
          tipoCambioId: data.tipoCambioId,
          paymentMethod: data.paymentMethod,
          paymentTerm: paymentTerm as any,
          serie: data.serie,
          correlativo: data.correlativo,
          providerName: data.providerName,
          totalGross,
          igvRate,
        };

        if (data.guide) {
          const guide = data.guide as any;
          if (guide.serie !== undefined) updatePayload.guiaSerie = guide.serie ?? null;
          if (guide.correlativo !== undefined) updatePayload.guiaCorrelativo = guide.correlativo ?? null;
          if (guide.fechaEmision !== undefined) updatePayload.guiaFechaEmision = guide.fechaEmision ?? null;
          if (guide.fechaEntregaTransportista !== undefined)
            updatePayload.guiaFechaEntregaTransportista = guide.fechaEntregaTransportista ?? null;
          if (guide.motivoTraslado !== undefined) updatePayload.guiaMotivoTraslado = guide.motivoTraslado ?? null;
          if (guide.puntoPartida !== undefined) updatePayload.guiaPuntoPartida = guide.puntoPartida ?? null;
          if (guide.puntoLlegada !== undefined) updatePayload.guiaPuntoLlegada = guide.puntoLlegada ?? null;
          if (guide.destinatario !== undefined) updatePayload.guiaDestinatario = guide.destinatario ?? null;
          if (guide.pesoBrutoUnidad !== undefined) updatePayload.guiaPesoBrutoUnidad = guide.pesoBrutoUnidad ?? null;
          if (guide.pesoBrutoTotal !== undefined) updatePayload.guiaPesoBrutoTotal = guide.pesoBrutoTotal ?? null;
          if (guide.transportista !== undefined) updatePayload.guiaTransportista = guide.transportista ?? null;
        }

        return prisma.entry.update({
          where: { id: entryId },
          data: updatePayload,
          include: { details: true },
        });
      });

      this.logger.log(`Draft entry #${entryId} updated`);
      return updated;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }

  /**
   * Confirms a DRAFT entry → POSTED.
   * Applies: stock increments, series creation, inventory history, accounting.
   * This is the point of no return.
   */
  async postDraft(entryId: number, organizationIdFromContext?: number | null) {
    try {
      const existing = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: {
          details: { include: { product: true } },
          store: { select: { companyId: true, organizationId: true, name: true } },
        },
      });

      if (!existing) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }
      if ((existing as any).status !== EntryStatus.DRAFT) {
        throw new ConflictException(
          'Solo se pueden confirmar entradas en estado Borrador.',
        );
      }

      await this.ensureEntriesFeatureEnabled(existing.store?.companyId);

      // Subscription guard
      const orgIdForGuard =
        organizationIdFromContext ??
        (existing as any).organizationId ??
        existing.store?.organizationId;
      if (orgIdForGuard != null) {
        await this.subscriptionGuard.ensureCanOperate(
          orgIdForGuard,
          'entries_write',
          'RESTRICTED',
        );
      }

      const organizationId = (existing as any).organizationId ?? null;

      const entry = await this.prisma.$transaction(async (prisma) => {
        // 1. Create real EntryDetailSeries from draftSeries JSON
        for (const detail of existing.details) {
          const draftSeries = (detail as any).draftSeries as string[] | null;
          if (draftSeries && Array.isArray(draftSeries) && draftSeries.length > 0) {
            const uniqueSeries = Array.from(new Set(draftSeries));
            await prisma.entryDetailSeries.createMany({
              data: uniqueSeries.map((serial) => ({
                entryDetailId: detail.id,
                serial: String(serial),
                organizationId,
                storeId: existing.storeId,
              })),
              skipDuplicates: true,
            });
          }
          // Clear draftSeries field
          await prisma.entryDetail.update({
            where: { id: detail.id },
            data: { draftSeries: Prisma.JsonNull },
          });
        }

        // 2. Apply stock (same logic as createEntry lines 420-514)
        const productIds = existing.details
          .map((d) => d.productId)
          .filter((id): id is number => typeof id === 'number');

        const existingInventories = await prisma.inventory.findMany({
          where: { productId: { in: productIds }, storeId: existing.storeId },
        });
        const inventoryByProduct = new Map(
          existingInventories.map((inv) => [inv.productId, inv]),
        );

        const existingInvIds = existingInventories.map((inv) => inv.id);
        const existingStoreInvs =
          existingInvIds.length > 0
            ? await prisma.storeOnInventory.findMany({
                where: {
                  storeId: existing.storeId,
                  inventoryId: { in: existingInvIds },
                },
              })
            : [];
        const storeInvByInventoryId = new Map(
          existingStoreInvs.map((si) => [si.inventoryId, si]),
        );

        for (const detail of existing.details) {
          let inventory = inventoryByProduct.get(detail.productId);
          if (!inventory) {
            const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization = {
              productId: detail.productId,
              storeId: existing.storeId,
              organizationId,
            };
            inventory = await prisma.inventory.create({ data: inventoryCreateData });
            inventoryByProduct.set(detail.productId, inventory);
          }

          // Link inventoryId
          await prisma.entryDetail.update({
            where: { id: detail.id },
            data: { inventoryId: inventory.id },
          });

          const storeInventory = storeInvByInventoryId.get(inventory.id);

          if (!storeInventory) {
            await prisma.storeOnInventory.create({
              data: {
                storeId: existing.storeId,
                inventoryId: inventory.id,
                stock: detail.quantity || 0,
              },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
              inventory: { connect: { id: inventory.id } },
              user: { connect: { id: existing.userId } },
              action: 'update',
              stockChange: detail.quantity || 0,
              previousStock: 0,
              newStock: detail.quantity || 0,
              organizationId,
            };
            await prisma.inventoryHistory.create({ data: historyCreateData });
          } else {
            await prisma.storeOnInventory.update({
              where: { id: storeInventory.id },
              data: { stock: { increment: detail.quantity || 0 } },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
              inventory: { connect: { id: inventory.id } },
              user: { connect: { id: existing.userId } },
              action: 'update',
              stockChange: detail.quantity || 0,
              previousStock: storeInventory.stock,
              newStock: storeInventory.stock + (detail.quantity || 0),
              organizationId,
            };
            await prisma.inventoryHistory.create({ data: historyCreateData });
          }
        }

        // 3. Update status to POSTED
        return prisma.entry.update({
          where: { id: entryId },
          data: {
            status: EntryStatus.POSTED,
            postedAt: new Date(),
          },
          include: { details: true },
        });
      });

      // Post-transaction: accounting (non-blocking)
      const tenantContext = this.tenantContext?.getContext?.() ?? null;
      await this.accountingService.createJournalForInventoryEntry(
        entry.id,
        tenantContext,
      );

      // Activity log
      const summary = existing.details
        .map((d) => `${d.quantity}x ${d.product.name}`)
        .join(', ');
      await this.activityService.log({
        actorId: existing.userId,
        entityType: 'InventoryItem',
        entityId: entry.id.toString(),
        action: AuditAction.CREATED,
        summary: `Entrada #${entry.id} confirmada con productos: ${summary}`,
        organizationId: organizationId ?? null,
        companyId: existing.store?.companyId ?? null,
      });

      try {
        await this.accountingHook.postPurchase(entry.id);
      } catch (err) {
        // Accounting hook failures shouldn't block operation
      }

      this.logger.log(`Draft entry #${entryId} posted`);
      return entry;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }

  /**
   * Cancels a POSTED entry by marking it as CANCELED and reversing stock.
   * Creates audit trail. Does NOT create a reversal entry document (simplified).
   */
  async cancelEntry(entryId: number, organizationIdFromContext?: number | null) {
    try {
      const ctx = this.tenantContext.getContext();
      const resolvedCompanyId = ctx.companyId ?? null;

      const existing = await this.prisma.entry.findUnique({
        where: { id: entryId },
        include: {
          details: { include: { series: true, product: true } },
          store: { select: { companyId: true, organizationId: true } },
        },
      });

      if (!existing) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }
      if ((existing as any).status !== EntryStatus.POSTED) {
        throw new ConflictException(
          'Solo se pueden anular entradas en estado Registrado.',
        );
      }

      const organizationId = (existing as any).organizationId ?? null;
      const entryDetailIds = existing.details.map((d) => d.id);

      // Validate no sales reference this entry
      if (entryDetailIds.length > 0) {
        const salesCount = await this.prisma.salesDetail.count({
          where: { entryDetailId: { in: entryDetailIds } },
        });
        if (salesCount > 0) {
          throw new ConflictException(
            `No se puede anular la entrada porque tiene ${salesCount} producto(s) asociado(s) a ventas registradas. Primero debe anular las ventas correspondientes.`,
          );
        }
      }

      // Validate stock won't go negative
      for (const detail of existing.details) {
        const storeInventory = await this.prisma.storeOnInventory.findFirst({
          where: {
            storeId: existing.storeId,
            inventory: { productId: detail.productId },
          },
        });

        if (storeInventory && storeInventory.stock < detail.quantity) {
          throw new ConflictException(
            `No se puede anular la entrada porque el producto "${detail.product.name}" tiene stock actual (${storeInventory.stock}) menor a la cantidad ingresada (${detail.quantity}).`,
          );
        }
      }

      // Execute cancellation in transaction
      const canceled = await this.prisma.$transaction(async (tx) => {
        // Revert stock
        for (const detail of existing.details) {
          const storeInventory = await tx.storeOnInventory.findFirst({
            where: {
              storeId: existing.storeId,
              inventory: { productId: detail.productId },
            },
          });

          if (storeInventory) {
            await tx.storeOnInventory.update({
              where: { id: storeInventory.id },
              data: { stock: { decrement: detail.quantity } },
            });

            const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
              inventory: { connect: { id: storeInventory.inventoryId } },
              user: { connect: { id: existing.userId } },
              action: 'cancel',
              stockChange: -detail.quantity,
              previousStock: storeInventory.stock,
              newStock: storeInventory.stock - detail.quantity,
              organizationId,
            };
            await tx.inventoryHistory.create({ data: historyCreateData });
          }
        }

        // Deactivate series
        for (const detail of existing.details) {
          if (detail.series.length > 0) {
            await tx.entryDetailSeries.updateMany({
              where: { entryDetailId: detail.id },
              data: { status: 'canceled' },
            });
          }
        }

        // Mark entry as CANCELED
        return tx.entry.update({
          where: { id: entryId },
          data: {
            status: EntryStatus.CANCELED,
            canceledAt: new Date(),
          },
          include: { details: true },
        });
      });

      // Activity log (non-blocking)
      const summary = existing.details
        .map((d) => `${d.quantity}x ${d.product.name}`)
        .join(', ');
      try {
        await this.activityService.log({
          actorId: existing.userId,
          entityType: 'InventoryItem',
          entityId: entryId.toString(),
          action: AuditAction.DELETED,
          summary: `Entrada #${entryId} anulada. Productos: ${summary}`,
          organizationId: organizationId ?? null,
          companyId: resolvedCompanyId ?? null,
        });
      } catch (logError) {
        this.logger.warn('No se pudo registrar la actividad de anulacion:', logError);
      }

      this.logger.log(`Entry #${entryId} canceled`);
      return canceled;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }
}
