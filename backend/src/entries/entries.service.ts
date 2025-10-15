import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { Prisma, AuditAction, EntryPaymentMethod, PaymentTerm } from '@prisma/client';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { resolveOrganizationId } from 'src/tenancy/organization.utils';
import {
  InventoryUncheckedCreateInputWithOrganization,
  InventoryHistoryCreateInputWithOrganization,
} from 'src/tenancy/prisma-organization.types';

@Injectable()
export class EntriesService {
  [x: string]: any;
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
    private activityService: ActivityService,
    private accountingHook: AccountingHook,
    private accountingService: AccountingService,
  ) {}

  private handlePrismaError(error: any): never {
    console.error('Prisma error:', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(error.meta?.cause ?? 'No data found');
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      // Errores de validación de tipos/enum -> 400 con detalle
      throw new BadRequestException(error.message);
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError &&
      error.errorCode === 'P1000'
    ) {
      throw new UnauthorizedException('Database authentication failed');
    }
    throw new InternalServerErrorException('Unexpected database error');
  }

  // Crear una nueva entrada con detalles
  async createEntry(data: {
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
    details: { productId: number; name: string; quantity: number; price: number; priceInSoles: number; series?: string[]; }[];
    invoice?: { serie: string; nroCorrelativo: string; tipoComprobante: string; tipoMoneda: string; total: number; fechaEmision: Date; };
  }) {

  try{
    console.log("Datos recibidos en createEntry:", data);
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

    const normalizedDate = data.date ? new Date(data.date as any) : new Date();

    if (
      data.paymentMethod &&
      !(['CASH', 'CREDIT'] as string[]).includes(String(data.paymentMethod))
    ) {
      throw new BadRequestException('paymentMethod inválido. Use CASH o CREDIT');
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
        (sum, item) => sum + (Number(item.priceInSoles) || 0) * (Number(item.quantity) || 0),
        0,
      );
    const igvRate = data.igvRate ?? 0.18;
    // Normalizar término de pago (CASH/CREDIT) aceptando alias desde el frontend
    const paymentTerm = (data as any).paymentTerm
      ? String((data as any).paymentTerm).toUpperCase() === 'CREDIT'
        ? 'CREDIT'
        : 'CASH'
      : (data.paymentMethod && String(data.paymentMethod).toUpperCase() === 'CREDIT')
      ? 'CREDIT'
      : 'CASH';
    const totalNet = +(totalGross / (1 + igvRate)).toFixed(2);
    const totalIgv = +(totalGross - totalNet).toFixed(2);

    let resolvedOrganizationId: number | null = null;

    const entry = await this.prisma.$transaction(async (prisma) => {
      // Verificar que la tienda exista
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) {
        throw new NotFoundException(`La tienda con ID ${data.storeId} no existe.`);
      }

      const storeOrganizationId =
        (store as { organizationId?: number | null }).organizationId ?? null;
      const organizationId = resolveOrganizationId({
        provided: data.organizationId,
        fallbacks: [storeOrganizationId],
        mismatchError: `La tienda con ID ${data.storeId} pertenece a otra organización.`,
      });
      resolvedOrganizationId = organizationId;

      // Verificar que el proveedor exista
      const provider = await prisma.provider.findUnique({
        where: { id: data.providerId },
      });
      if (!provider) {
        throw new NotFoundException(`El proveedor con ID ${data.providerId} no existe.`);
      }

      // Verificar que el usuario exista
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) {
        throw new NotFoundException(`El usuario con ID ${data.userId} no existe.`);
      }

      // Verificar que los productos existan
      for (const detail of normalizedDetails) {

        if (!detail.productId) {
          throw new BadRequestException('El campo "productId" es obligatorio en los detalles.');
        }

        let product = await prisma.product.findUnique({
          where: { id: detail.productId },
        });
        if (!product) {
          throw new NotFoundException(`El producto con ID ${detail.productId} no existe.`);
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
      const entry = await prisma.entry.create({
        data: {
          storeId: data.storeId,
          userId: data.userId,
          providerId: data.providerId,
          date: normalizedDate,
          description: data.description,
          tipoMoneda: data.tipoMoneda,
          tipoCambioId: data.tipoCambioId,
          paymentMethod: data.paymentMethod,
          paymentTerm: paymentTerm as any,
          serie: data.serie,
          correlativo: data.correlativo,
          providerName: data.providerName,
          totalGross,
          igvRate,
          organizationId,
          details: {
            create: verifiedProducts.map((product) => ({
              productId: product.productId,
              quantity: Number(product.quantity) || 0,
              price: Number(product.price) || 0,
              priceInSoles:
                (product as any).priceInSoles == null || (product as any).priceInSoles === ''
                  ? null
                  : Number((product as any).priceInSoles),
            })),
          },
        } as any,
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
        const detailData = normalizedDetails.find((d) => d.productId === detail.productId);
        if (detailData?.series && detailData.series.length > 0) {
          // Filtrar valores únicos de 'serial' para evitar duplicados
          const uniqueSeries = Array.from(new Set(detailData.series));
          try {
          await prisma.entryDetailSeries.createMany({
            data: uniqueSeries.map((serial) => ({
              entryDetailId: detail.id,
              serial: String(serial),
            })),
            skipDuplicates: true, // Ignorar duplicados en la base de datos
          });
          } catch (error) {
            console.error("Error al insertar series:", error);
            throw new Error("No se pudo insertar las series. Verifica que no estén duplicadas.");
          }
        }
      }

      // Actualizar el stock de los productos en el inventario
      for (const detail of verifiedProducts) {
        // Verificar si el producto ya existe en Inventory
        let inventory = await prisma.inventory.findFirst({
          where: { productId: detail.productId, storeId: data.storeId, },
        });

        // Si no existe, crear el registro en Inventory
        if (!inventory) {
          const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization = {
            productId: detail.productId,
            storeId: data.storeId, // Incluye storeId al crear el registro
            organizationId,
          };

          inventory = await prisma.inventory.create({
            data: inventoryCreateData,
          });
        }

        // Actualizar el campo inventoryId en los EntryDetail ya creados
        const entryDetail = entry.details.find((d) => d.productId === detail.productId);
        if (entryDetail) {
          await prisma.entryDetail.update({
            where: { id: entryDetail.id },
            data: { inventoryId: inventory.id }, // Asociar el EntryDetail con el Inventory
          });
        }

        // Verificar si ya existe un registro en StoreOnInventory
        const storeInventory = await prisma.storeOnInventory.findFirst({
          where: {
            storeId: data.storeId,
            inventoryId: inventory.id,
          },
        });

        if (!storeInventory) {
          // Si no existe, crear un nuevo registro en StoreOnInventory
          await prisma.storeOnInventory.create({
            data: {
              storeId: data.storeId,
              inventoryId: inventory.id,
              stock: detail.quantity || 0, // Inicializa el stock con la cantidad de la entrada
            },
          });

          // Registrar el cambio en el historial
          const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
            inventory: { connect: { id: inventory.id } },
            user: { connect: { id: data.userId } },
            action: 'update',
            stockChange: detail.quantity || 0,
            previousStock: 0,
            newStock: detail.quantity || 0,
            organizationId,
          };
          
          // Registrar el cambio en el historial
          await prisma.inventoryHistory.create({
            data: historyCreateData,
          });
        } else {
          // Si existe, actualizar el stock
          await prisma.storeOnInventory.update({
            where: { id: storeInventory.id },
            data: { stock: { increment: detail.quantity || 0 } },
          });

          // Registrar el cambio en el historial
          const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
            inventory: { connect: { id: inventory.id } },
            user: { connect: { id: data.userId } },
            action: 'update',
            stockChange: detail.quantity || 0,
            previousStock: storeInventory.stock,
            newStock: storeInventory.stock + (detail.quantity || 0),
            organizationId,
          };

          // Registrar el cambio en el historial
          await prisma.inventoryHistory.create({
            data: historyCreateData,
          });
        }
      }
      console.log("Entrada creada:", entry);
      return entry;
    });

    await this.accountingService.createJournalForInventoryEntry(entry.id);

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
        date: (data.date as any) ? new Date(data.date as any).toISOString() : null,
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
    });
    try {
      await this.accountingHook.postPurchase(entry.id);
    } catch (err) {
      // Accounting hook failures shouldn't block operation
    }
    return { ...entry, totalNet, totalIgv } as any;

    }catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  } 
  //

  // Listar todas las entradas
  async findAllEntries() {
    try {
      const entries = await this.prisma.entry.findMany({
        include: { details: { include: { product: true, series: true, }, }, provider: true, user: true, store: true },
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
      this.handlePrismaError(error);
    }
  }
  //

  // Obtener una entrada específica por ID
  async findEntryById(id: number) {
    try {
      const entry = await this.prisma.entry.findUnique({
        where: { id },
        include: { details: { include: { product: true, series: true, }, }, provider: true, user: true, store: true },
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
      this.handlePrismaError(error);
    }
  }
  //

  //ELIMINAR ENTRADA
  async deleteEntry(id: number) {
    try {
      const entry = await this.prisma.entry.findUnique({
        where: { id },
        include: { details: { include: { series: true, product: true } } },
      });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${id} no existe.`);
      }

      const organizationId =
        (entry as { organizationId?: number | null }).organizationId ?? null;

      logOrganizationContext({
        service: EntriesService.name,
        operation: 'deleteEntry',
        organizationId,
        metadata: {
          entryId: entry.id,
          storeId: entry.storeId,
          userId: entry.userId,
        },
      }); 

      // Eliminar series asociadas
      for (const detail of entry.details) {
        await this.prisma.entryDetailSeries.deleteMany({
          where: { entryDetailId: detail.id },
        });
      }

      for (const detail of entry.details) {
        // Verificar si el producto existe en el inventario de la tienda
        const storeInventory = await this.prisma.storeOnInventory.findFirst({
          where: {
            storeId: entry.storeId,
            inventory: { productId: detail.productId },
          },
        });

        if (!storeInventory) {
          throw new NotFoundException(
            `No se encontró el inventario para el producto con ID ${detail.productId} en la tienda con ID ${entry.storeId}.`
          );
        }

        // Actualizar el stock en StoreOnInventory
        await this.prisma.storeOnInventory.update({
          where: { id: storeInventory.id },
          data: { stock: { decrement: detail.quantity } },
        });

        // Registrar el cambio en el historial
        const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
          inventory: { connect: { id: storeInventory.inventoryId } },
          user: { connect: { id: entry.userId } },
          action: 'delete',
          stockChange: -detail.quantity,
          previousStock: storeInventory.stock,
          newStock: storeInventory.stock - detail.quantity,
          organizationId,
        };

        // Registrar el cambio en el historial
        await this.prisma.inventoryHistory.create({
          data: historyCreateData,
        });
      }

      // Eliminar la entrada
      const summary = entry.details
        .map((d) => `${d.quantity}x ${d.product.name}`)
        .join(', ');
      await this.activityService.log({
        actorId: entry.userId,
        entityType: 'InventoryItem',
        entityId: entry.id.toString(),
        action: AuditAction.UPDATED,
        summary: `Entrada eliminada afectando: ${summary}`,
      });
      return this.prisma.entry.delete({ where: { id } });
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        this.handlePrismaError(error);
      }
    }

  // ELIMINAR ENTRADAS
  async deleteEntries(ids: number[]) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException('No se proporcionaron IDs válidos para eliminar.');
      }

      // Obtener las entradas con sus detalles
      const entries = await this.prisma.entry.findMany({
        where: { id: { in: ids } },
        include: { details: { include: { series: true, product: true } } },
      });

      if (entries.length === 0) {
        throw new NotFoundException('No se encontraron entradas con los IDs proporcionados.');
      }

      // Actualizar el inventario restando las cantidades de los productos
      for (const entry of entries) {
        const organizationId =
          (entry as { organizationId?: number | null }).organizationId ?? null;

        logOrganizationContext({
          service: EntriesService.name,
          operation: 'deleteEntries.entry',
          organizationId,
          metadata: {
            entryId: entry.id,
            storeId: entry.storeId,
            userId: entry.userId,
          },
        });
        // Eliminar series asociadas
        for (const detail of entry.details) {
          await this.prisma.entryDetailSeries.deleteMany({
            where: { entryDetailId: detail.id },
          });
        }

        for (const detail of entry.details) {
          // Verificar si el producto existe en el inventario de la tienda
          const storeInventory = await this.prisma.storeOnInventory.findFirst({
            where: {
              storeId: entry.storeId,
              inventory: { productId: detail.productId },
            },
          });

          if (!storeInventory) {
            throw new NotFoundException(
              `No se encontró el inventario para el producto con ID ${detail.productId} en la tienda con ID ${entry.storeId}.`
            );
          }

          // Actualizar el stock en StoreOnInventory
          await this.prisma.storeOnInventory.update({
            where: { id: storeInventory.id },
            data: { stock: { decrement: detail.quantity } },
          });
          // Registrar el cambio en el historial
          const historyCreateData: InventoryHistoryCreateInputWithOrganization = {
            inventory: { connect: { id: storeInventory.inventoryId } },
            user: { connect: { id: entry.userId } },
            action: 'delete',
            stockChange: -detail.quantity,
            previousStock: storeInventory.stock,
            newStock: storeInventory.stock - detail.quantity,
            organizationId,
          };

          await this.prisma.inventoryHistory.create({
            data: historyCreateData,
          });
        }

        const summary = entry.details
          .map((d) => `${d.quantity}x ${d.product.name}`)
          .join(', ');
        await this.activityService.log({
          actorId: entry.userId,
          entityType: 'InventoryItem',
          entityId: entry.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Entrada eliminada afectando: ${summary}`,
        });
        
      }

      // Eliminar las entradas
      const deletedEntries = await this.prisma.entry.deleteMany({
        where: { id: { in: ids } },
      });

      return {
        message: `${deletedEntries.count} entrada(s) eliminada(s) correctamente.`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  // Obtener todas las entradas de una tienda específica
  async findAllByStore(storeId: number) {
    try {
      // Verificar que la tienda exista
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      if (!store) {
        throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
      }

    return this.prisma.entry.findMany({
        where: { storeId },
        include: { details: true, provider: true, user: true },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }
  //

  async findRecentEntries(limit: number) {
    try {
      const details = await this.prisma.entryDetail.findMany({
        where: { inventoryId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: limit * 3,
        include: {
          product: {
            include: { category: true, brand: { select: { name: true } } },
          },
          inventory: { include: { storeOnInventory: true } },
        },
      });

      const result: any[] = []
      const seen = new Set<number>()
      for (const d of details) {
        if (seen.has(d.product.id)) continue
        const stock =
          d.inventory?.storeOnInventory?.reduce((s, i) => s + i.stock, 0) ?? 0
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
          })
          seen.add(d.product.id)
          if (result.length >= limit) break
        }
      }
      return result
    } catch (error) {
      console.error('Error fetching recent entries:', error)
      throw new Error('Failed to fetch recent entries')
    }
  }

  // Actualizar una entrada con un PDF
  async updateEntryPdf(entryId: number, pdfUrl: string) {
    try {
      const entry = await this.prisma.entry.findUnique({ where: { id: entryId } });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }

      return this.prisma.entry.update({
        where: { id: entryId },
        data: { pdfUrl },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  // Actualizar una entrada con un PDF_GUIA
  async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
    try {
      const entry = await this.prisma.entry.findUnique({ where: { id: entryId } });

      if (!entry) {
        throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
      }

      return this.prisma.entry.update({
        where: { id: entryId },
        data: { guiaUrl },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }
}
