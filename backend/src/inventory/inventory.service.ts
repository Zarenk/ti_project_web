import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AuditAction, Prisma } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns-tz';
import { Buffer } from 'buffer';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  resolveCompanyId,
  resolveOrganizationId,
} from 'src/tenancy/organization.utils';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import {
  InventoryUncheckedCreateInputWithOrganization,
  InventoryHistoryUncheckedCreateInputWithOrganization,
  InventoryHistoryCreateManyInputWithOrganization,
  TransferUncheckedCreateInputWithOrganization,
  EntryUncheckedCreateInputWithOrganization,
} from 'src/tenancy/prisma-organization.types';
import { handlePrismaError } from 'src/common/errors/prisma-error.handler';

@Injectable()
export class InventoryService {
  [x: string]: any;
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private readonly accountingHook: AccountingHook,
    private readonly verticalConfig: VerticalConfigService,
  ) {}

  /**
   * Builds an organizationId WHERE clause that also includes records with
   * null organizationId (legacy records created before multi-tenant fix).
   */
  private buildOrgFilter(
    organizationId: number | null | undefined,
  ): Prisma.InventoryWhereInput {
    if (organizationId === undefined) return {};
    const orgId = organizationId ?? null;
    if (orgId !== null) {
      return {
        OR: [
          { organizationId: orgId },
          { organizationId: null },
        ],
      };
    }
    return { organizationId: null };
  }

  private async ensureInventoryFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.inventory === false) {
      throw new ForbiddenException(
        'El modulo de inventario no esta habilitado para esta empresa.',
      );
    }
  }

  private async assertCompanyMatchesOrganization(
    companyId: number,
    organizationId: number,
  ): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });

    if (!company || company.organizationId !== organizationId) {
      throw new BadRequestException(
        `La compania ${companyId} no pertenece a la organizacion ${organizationId}.`,
      );
    }
  }

  async getStoresWithProduct(
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const id = Number(productId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException(
        'El ID del producto debe ser un numero valido',
      );
    }

    const organizationFilter = organizationId ?? undefined;
    const companyFilter = companyId ?? undefined;
    const storeWhere: Record<string, unknown> = {};
    if (organizationFilter !== undefined) {
      storeWhere.organizationId = organizationFilter;
    }
    if (companyFilter !== undefined) {
      storeWhere.companyId = companyFilter;
    }

    return this.prisma.storeOnInventory.findMany({
      where: {
        inventory: {
          productId: id,
          ...(organizationFilter !== undefined
            ? { organizationId: organizationFilter }
            : {}),
        },
        ...(Object.keys(storeWhere).length > 0 ? { store: storeWhere } : {}),
      },
      include: { store: true },
    });
  }

  /**
   * Returns total stock per product for a batch of product IDs.
   * Single query instead of N individual calls.
   */
  async getBatchStock(
    productIds: number[],
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<Record<number, number>> {
    if (productIds.length === 0) return {};

    const organizationFilter = organizationId ?? undefined;
    const companyFilter = companyId ?? undefined;
    const storeWhere: Record<string, unknown> = {};
    if (organizationFilter !== undefined) {
      storeWhere.organizationId = organizationFilter;
    }
    if (companyFilter !== undefined) {
      storeWhere.companyId = companyFilter;
    }

    const rows = await this.prisma.storeOnInventory.findMany({
      where: {
        inventory: {
          productId: { in: productIds },
          ...(organizationFilter !== undefined
            ? { organizationId: organizationFilter }
            : {}),
        },
        ...(Object.keys(storeWhere).length > 0 ? { store: storeWhere } : {}),
      },
      select: {
        stock: true,
        inventory: { select: { productId: true } },
      },
    });

    const stockMap: Record<number, number> = {};
    for (const row of rows) {
      const pid = row.inventory.productId;
      stockMap[pid] = (stockMap[pid] ?? 0) + row.stock;
    }
    return stockMap;
  }

  parseExcel(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { raw: false });

    // Limpiar claves con espacios
    const cleanedData = rawData.map((row: any) => {
      const cleanedRow: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim(); // Elimina espacios al inicio/final en el encabezado
        const value = row[key];
        cleanedRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
      });
      return cleanedRow;
    });

    return cleanedData;
  }

  // Listar todas las entradas
  async findAllInventoryHistory(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const resolvedOrganizationId = organizationId ?? null;
    const resolvedCompanyId = companyId ?? null;
    const where: Prisma.InventoryHistoryWhereInput = {};

    await this.ensureInventoryFeatureEnabled(resolvedCompanyId);

    logOrganizationContext({
      service: InventoryService.name,
      operation: 'findAllInventoryHistory',
      organizationId: resolvedOrganizationId,
      companyId: resolvedCompanyId ?? undefined,
      metadata: { scope: 'inventoryHistory' },
    });

    if (organizationId !== undefined) {
      Object.assign(where, { organizationId: resolvedOrganizationId });
    }
    if (companyId !== undefined) {
      Object.assign(where, { companyId: resolvedCompanyId });
    }
    return this.prisma.inventoryHistory.findMany({
      where,
      include: {
        user: true, // Incluir información del usuario que realizó la acción
        inventory: {
          include: {
            product: true, // Incluir información del producto relacionado
            storeOnInventory: {
              include: {
                store: true, // Incluir información de la tienda asociada
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación en orden descendente
      },
    });
  }
  //

  // Obtener el historial de un inventario específico por ID
  async findAllHistoryByUser(
    userId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where: Prisma.InventoryHistoryWhereInput = { userId };

    const resolvedOrganizationId = organizationId ?? null;
    const resolvedCompanyId = companyId ?? null;

    await this.ensureInventoryFeatureEnabled(resolvedCompanyId);

    logOrganizationContext({
      service: InventoryService.name,
      operation: 'findAllHistoryByUser',
      organizationId: resolvedOrganizationId,
      companyId: resolvedCompanyId ?? undefined,
      metadata: { userId },
    });

    if (organizationId !== undefined) {
      Object.assign(where, { organizationId: resolvedOrganizationId });
    }
    if (companyId !== undefined) {
      Object.assign(where, { companyId: resolvedCompanyId });
    }
    return this.prisma.inventoryHistory.findMany({
      where, // Filtrar por el ID del usuario
      include: {
        user: true, // Incluir información del usuario
        inventory: {
          include: {
            product: true, // Incluir información del producto relacionado
            storeOnInventory: {
              include: {
                store: true, // Incluir información de la tienda asociada
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación en orden descendente
      },
    });
  }
  //

  // Obtener el precio de compra de un producto
  async getAllPurchasePrices(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const entryWhere: Prisma.EntryDetailWhereInput = {};
    const resolvedOrganizationId = organizationId ?? null;
    const resolvedCompanyId = companyId ?? null;

    await this.ensureInventoryFeatureEnabled(resolvedCompanyId);

    logOrganizationContext({
      service: InventoryService.name,
      operation: 'getAllPurchasePrices',
      organizationId: resolvedOrganizationId,
      companyId: resolvedCompanyId ?? undefined,
      metadata: { scope: 'purchasePrices' },
    });

    if (organizationId !== undefined || companyId !== undefined) {
      entryWhere.entry = {
        is: {
          ...(organizationId !== undefined
            ? { organizationId: resolvedOrganizationId }
            : {}),
          ...(companyId !== undefined
            ? { store: { companyId: resolvedCompanyId } }
            : {}),
        },
      };
    }
    // Obtener todos los detalles de entrada agrupados por producto
    const entryDetails = await this.prisma.entryDetail.findMany({
      where: entryWhere,
      select: {
        productId: true,
        price: true,
        priceInSoles: true,
        entry: {
          select: {
            tipoMoneda: true, // Obtener el tipo de moneda (USD o PEN)
          },
        },
      },
    });

    // Agrupar los precios por producto y calcular el mínimo y máximo en soles
    const groupedPrices = entryDetails.reduce((acc: any, entry) => {
      const productId = entry.productId;

      // Normalizar el precio en soles
      const priceInSoles =
        entry.entry.tipoMoneda === 'USD'
          ? entry.priceInSoles // Usar priceInSoles si la entrada está en dólares
          : entry.price; // Usar price si la entrada está en soles

      if (!acc[productId]) {
        acc[productId] = {
          productId,
          pricesInSoles: [],
        };
      }

      // Agregar el precio normalizado al array de precios
      if (priceInSoles) {
        acc[productId].pricesInSoles.push(priceInSoles);
      }

      return acc;
    }, {});

    // Calcular el precio mínimo y máximo para cada producto
    return Object.values(groupedPrices).map((group: any) => {
      const lowestPurchasePrice = Math.min(...group.pricesInSoles);
      const highestPurchasePrice = Math.max(...group.pricesInSoles);

      return {
        productId: group.productId,
        lowestPurchasePrice,
        highestPurchasePrice,
      };
    });
  }
  //

  // Crear una nueva entrada de inventario TRASLADO
  async transferProduct(transferDto: {
    sourceStoreId: number;
    destinationStoreId: number;
    productId: number;
    quantity: number;
    description?: string;
    userId: number; // ID del usuario que realiza la transferencia
    organizationId?: number | null;
    companyId?: number | null;
  }) {
    try {
      const {
        sourceStoreId,
        destinationStoreId,
        productId,
        quantity,
        description,
        userId,
        organizationId: inputOrganizationId,
        companyId: inputCompanyId,
      } = transferDto;
      const [sourceStore, destinationStore] = await Promise.all([
        this.prisma.store.findUnique({
          where: { id: sourceStoreId },
        }),
        this.prisma.store.findUnique({
          where: { id: destinationStoreId },
        }),
      ]);

      if (!sourceStore) {
        throw new NotFoundException(
          `La tienda con ID ${sourceStoreId} no existe.`,
        );
      }

      if (!destinationStore) {
        throw new NotFoundException(
          `La tienda con ID ${destinationStoreId} no existe.`,
        );
      }

      const organizationIdFromSource = resolveOrganizationId({
        provided: inputOrganizationId,
        fallbacks: [
          (sourceStore as { organizationId?: number | null }).organizationId ??
            null,
        ],
        mismatchError: 'La tienda de origen pertenece a otra organización.',
      });

      const organizationId = resolveOrganizationId({
        provided: organizationIdFromSource,
        fallbacks: [
          (destinationStore as { organizationId?: number | null })
            .organizationId ?? null,
        ],
        mismatchError: 'La tienda de destino pertenece a otra organizacion.',
      });

      const companyIdFromSource = resolveCompanyId({
        provided: inputCompanyId ?? null,
        fallbacks: [
          (sourceStore as { companyId?: number | null }).companyId ?? null,
        ],
        mismatchError: 'La tienda de origen pertenece a otra compania.',
      });

      const companyId = resolveCompanyId({
        provided: companyIdFromSource,
        fallbacks: [
          (destinationStore as { companyId?: number | null }).companyId ?? null,
        ],
        mismatchError: 'La tienda de destino pertenece a otra compania.',
      });

      if (companyId !== null) {
        if (organizationId === null) {
          throw new BadRequestException(
            'Debe indicar una organizacion valida para asociar la transferencia a una compania.',
          );
        }
        await this.ensureInventoryFeatureEnabled(companyId);
        await this.assertCompanyMatchesOrganization(companyId, organizationId);
      }

      logOrganizationContext({
        service: InventoryService.name,
        operation: 'transferProduct',
        organizationId,
        companyId: companyId ?? undefined,
        metadata: { sourceStoreId, destinationStoreId, productId, userId },
      });

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      });

      // Validar que la tienda de origen tenga suficiente stock
      const sourceStoreInventory = await this.prisma.storeOnInventory.findFirst({
        where: { storeId: sourceStoreId, inventory: { productId } },
      });

      if (!sourceStoreInventory || sourceStoreInventory.stock < quantity) {
        throw new BadRequestException('Stock insuficiente en la tienda de origen');
      }

      await this.prisma.$transaction(async (tx) => {
        // Actualizar el stock en la tienda de origen
        await tx.storeOnInventory.update({
          where: { id: sourceStoreInventory.id },
          data: { stock: sourceStoreInventory.stock - quantity },
        });

        // Actualizar el stock en la tienda de destino
        const destinationStoreInventory =
          await tx.storeOnInventory.findFirst({
            where: { storeId: destinationStoreId, inventory: { productId } },
          });

        let destinationInventoryId: number;

        if (destinationStoreInventory) {
          // Si ya existe el producto en la tienda de destino, actualizar el stock
          await tx.storeOnInventory.update({
            where: { id: destinationStoreInventory.id },
            data: { stock: destinationStoreInventory.stock + quantity },
          });
          destinationInventoryId = destinationStoreInventory.inventoryId;
        } else {
          // Verificar si existe un registro en la tabla Inventory para el producto
          let inventory = await tx.inventory.findFirst({
            where: { productId },
          });

          // Si no existe, crear un nuevo registro en Inventory
          if (!inventory) {
            const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization =
              {
                productId,
                storeId: destinationStoreId,
                organizationId,
              };

            inventory = await tx.inventory.create({
              data: inventoryCreateData,
            });
          }

          // Crear un nuevo registro en StoreOnInventory
          await tx.storeOnInventory.create({
            data: {
              storeId: destinationStoreId,
              inventoryId: inventory.id,
              stock: quantity,
            },
          });
          destinationInventoryId = inventory.id;
        }

        // Registrar el traslado
        const transferCreateData: TransferUncheckedCreateInputWithOrganization = {
          sourceStoreId,
          destinationStoreId,
          productId,
          quantity,
          description: description || null,
          organizationId,
        };

        const transferRecord = await tx.transfer.create({
          data: transferCreateData,
        });

        // ── Create transfer Entry + EntryDetail in destination store ──
        let internalProvider = await tx.provider.findFirst({
          where: {
            organizationId,
            documentNumber: 'TRASLADO-INTERNO',
          },
          select: { id: true },
        });
        if (!internalProvider) {
          internalProvider = await tx.provider.create({
            data: {
              name: 'Traslado Interno',
              description: 'Proveedor del sistema para entradas por traslado entre tiendas',
              documentNumber: 'TRASLADO-INTERNO',
              document: 'SISTEMA',
              organizationId,
            },
          });
        }

        const originalDetail = await tx.entryDetail.findFirst({
          where: { productId, entry: { storeId: sourceStoreId } },
          orderBy: { createdAt: 'desc' },
          select: { price: true, priceInSoles: true },
        });

        await tx.entry.create({
          data: {
            storeId: destinationStoreId,
            userId,
            providerId: internalProvider.id,
            date: new Date(),
            description: `TRASLADO — Transferencia desde ${sourceStore!.name}`,
            tipoMoneda: 'PEN',
            paymentMethod: 'CASH',
            paymentTerm: 'CASH',
            providerName: 'Traslado Interno',
            totalGross: (originalDetail?.price ?? 0) * quantity,
            igvRate: 0,
            organizationId,
            referenceId: `transfer-${transferRecord.id}`,
            details: {
              create: [{
                productId,
                quantity,
                price: originalDetail?.price ?? 0,
                priceInSoles: originalDetail?.priceInSoles ?? 0,
                inventoryId: destinationInventoryId,
              }],
            },
          },
        });

        // Registrar el evento en el historial de movimientos
        const historyEntries: InventoryHistoryCreateManyInputWithOrganization[] =
          [
            {
              inventoryId: sourceStoreInventory.inventoryId,
              action: 'transfer-out',
              stockChange: -quantity,
              previousStock: sourceStoreInventory.stock,
              newStock: sourceStoreInventory.stock - quantity,
              userId,
              organizationId,
              companyId: companyId ?? null,
            },
            {
              inventoryId: destinationInventoryId,
              action: 'transfer-in',
              stockChange: quantity,
              previousStock: destinationStoreInventory
                ? destinationStoreInventory.stock
                : 0,
              newStock: destinationStoreInventory
                ? destinationStoreInventory.stock + quantity
                : quantity,
              userId,
              organizationId,
              companyId: companyId ?? null,
            },
          ];

        await tx.inventoryHistory.createMany({
          data: historyEntries,
        });
      });

      const userForLog1 = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      await this.activityService.log({
        actorId: userId,
        actorEmail: userForLog1?.username ?? undefined,
        entityType: 'InventoryItem',
        entityId: productId.toString(),
        action: AuditAction.UPDATED,
        summary: `Transferencia de ${quantity}x ${product?.name ?? ''} de tienda ${sourceStoreId} a tienda ${destinationStoreId}`,
      });

      return { message: 'Traslado realizado con éxito' };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Transfer product between stores WITH series movement.
   * Used by shipping guide inter-store flow.
   * Returns the Transfer record ID for linking to ShippingGuide.
   */
  async transferProductWithSeries(transferDto: {
    sourceStoreId: number;
    destinationStoreId: number;
    productId: number;
    quantity: number;
    serials?: string[];
    description?: string;
    userId: number;
    organizationId?: number | null;
    companyId?: number | null;
    shippingGuideId?: number | null;
    tx?: any; // Optional Prisma transaction client
  }): Promise<number> {
    const {
      sourceStoreId,
      destinationStoreId,
      productId,
      quantity,
      serials,
      description,
      userId,
      organizationId: inputOrganizationId,
      companyId: inputCompanyId,
      shippingGuideId,
      tx: externalTx,
    } = transferDto;

    const runInTx = async (tx: any) => {
      // Validate source stock
      const sourceStoreInventory = await tx.storeOnInventory.findFirst({
        where: { storeId: sourceStoreId, inventory: { productId } },
      });

      if (!sourceStoreInventory || sourceStoreInventory.stock < quantity) {
        throw new BadRequestException(
          `Stock insuficiente en la tienda de origen para el producto ${productId}. Disponible: ${sourceStoreInventory?.stock ?? 0}, solicitado: ${quantity}`,
        );
      }

      // Validate series if provided
      if (serials && serials.length > 0) {
        if (serials.length !== quantity) {
          throw new BadRequestException(
            `La cantidad de series (${serials.length}) no coincide con la cantidad a transferir (${quantity}).`,
          );
        }

        const activeSeries = await tx.entryDetailSeries.findMany({
          where: {
            serial: { in: serials },
            organizationId: inputOrganizationId,
            status: 'active',
            storeId: sourceStoreId,
          },
          select: { serial: true },
        });

        const foundSerials = new Set(activeSeries.map((s: any) => s.serial));
        const missing = serials.filter((s) => !foundSerials.has(s));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Series no encontradas o no activas en tienda origen: ${missing.join(', ')}`,
          );
        }
      }

      // Decrement source stock
      await tx.storeOnInventory.update({
        where: { id: sourceStoreInventory.id },
        data: { stock: sourceStoreInventory.stock - quantity },
      });

      // Increment or create destination stock
      const destStoreInventory = await tx.storeOnInventory.findFirst({
        where: { storeId: destinationStoreId, inventory: { productId } },
      });

      let destinationInventoryId: number;

      if (destStoreInventory) {
        await tx.storeOnInventory.update({
          where: { id: destStoreInventory.id },
          data: { stock: destStoreInventory.stock + quantity },
        });
        destinationInventoryId = destStoreInventory.inventoryId;
      } else {
        let inventory = await tx.inventory.findFirst({
          where: { productId },
        });
        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId,
              storeId: destinationStoreId,
              organizationId: inputOrganizationId,
            },
          });
        }
        await tx.storeOnInventory.create({
          data: {
            storeId: destinationStoreId,
            inventoryId: inventory.id,
            stock: quantity,
          },
        });
        destinationInventoryId = inventory.id;
      }

      // Move series: update storeId from source to destination
      if (serials && serials.length > 0) {
        await tx.entryDetailSeries.updateMany({
          where: {
            serial: { in: serials },
            organizationId: inputOrganizationId,
            status: 'active',
            storeId: sourceStoreId,
          },
          data: { storeId: destinationStoreId },
        });
      }

      // Create Transfer record
      const transfer = await tx.transfer.create({
        data: {
          sourceStoreId,
          destinationStoreId,
          productId,
          quantity,
          serials: serials && serials.length > 0 ? serials : [],
          description: description || null,
          organizationId: inputOrganizationId,
          shippingGuideId: shippingGuideId || null,
        },
      });

      // ── Create transfer Entry + EntryDetail in destination store ──
      // Sales require an EntryDetail linked to the store where the sale happens.
      // Without this, transferred products cannot be sold in the destination.
      const sourceStore = await tx.store.findUnique({
        where: { id: sourceStoreId },
        select: { name: true },
      });

      // Get or create an internal "TRASLADO" provider for this organization
      let internalProvider = await tx.provider.findFirst({
        where: {
          organizationId: inputOrganizationId,
          documentNumber: 'TRASLADO-INTERNO',
        },
        select: { id: true },
      });
      if (!internalProvider) {
        internalProvider = await tx.provider.create({
          data: {
            name: 'Traslado Interno',
            description: 'Proveedor del sistema para entradas por traslado entre tiendas',
            documentNumber: 'TRASLADO-INTERNO',
            document: 'SISTEMA',
            organizationId: inputOrganizationId,
          },
        });
      }

      // Find cost price from the original EntryDetail in the source store
      const originalEntryDetail = await tx.entryDetail.findFirst({
        where: {
          productId,
          entry: { storeId: sourceStoreId },
        },
        orderBy: { createdAt: 'desc' },
        select: { price: true, priceInSoles: true },
      });
      const costPrice = originalEntryDetail?.price ?? 0;
      const costPriceInSoles = originalEntryDetail?.priceInSoles ?? 0;

      const transferEntry = await tx.entry.create({
        data: {
          storeId: destinationStoreId,
          userId,
          providerId: internalProvider.id,
          date: new Date(),
          description: `TRASLADO — Transferencia desde ${sourceStore?.name ?? `Tienda #${sourceStoreId}`}`,
          tipoMoneda: 'PEN',
          paymentMethod: 'CASH',
          paymentTerm: 'CASH',
          providerName: 'Traslado Interno',
          totalGross: costPrice * quantity,
          igvRate: 0,
          organizationId: inputOrganizationId,
          referenceId: `transfer-${transfer.id}`,
          details: {
            create: [{
              productId,
              quantity,
              price: costPrice,
              priceInSoles: costPriceInSoles,
              inventoryId: destinationInventoryId,
            }],
          },
        },
        include: { details: true },
      });

      // Link transferred series to the new EntryDetail in destination
      const newEntryDetail = transferEntry.details[0];
      if (newEntryDetail && serials && serials.length > 0) {
        await tx.entryDetailSeries.updateMany({
          where: {
            serial: { in: serials },
            organizationId: inputOrganizationId,
            storeId: destinationStoreId,
          },
          data: { entryDetailId: newEntryDetail.id },
        });
      }

      // Create inventory history
      await tx.inventoryHistory.createMany({
        data: [
          {
            inventoryId: sourceStoreInventory.inventoryId,
            action: 'transfer-out',
            stockChange: -quantity,
            previousStock: sourceStoreInventory.stock,
            newStock: sourceStoreInventory.stock - quantity,
            userId,
            organizationId: inputOrganizationId,
            companyId: inputCompanyId ?? null,
          },
          {
            inventoryId: destinationInventoryId,
            action: 'transfer-in',
            stockChange: quantity,
            previousStock: destStoreInventory ? destStoreInventory.stock : 0,
            newStock: destStoreInventory
              ? destStoreInventory.stock + quantity
              : quantity,
            userId,
            organizationId: inputOrganizationId,
            companyId: inputCompanyId ?? null,
          },
        ],
      });

      return transfer.id;
    };

    // Run inside external transaction if provided, otherwise create our own
    if (externalTx) {
      return runInTx(externalTx);
    }
    return this.prisma.$transaction(async (tx) => runInTx(tx));
  }

  /**
   * Reverse a single Transfer record: restore stock to source, remove from destination,
   * move series back to source store, and delete the transfer Entry created at destination.
   * Used when a shipping guide with inter-store transfers is voided/annulled.
   */
  async reverseTransfer(
    transferId: number,
    userId: number,
    reason?: string,
    externalTx?: any,
  ): Promise<void> {
    const runInTx = async (tx: any) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
      });
      if (!transfer) {
        this.logger.warn(`[reverseTransfer] Transfer ${transferId} not found, skipping`);
        return;
      }

      const {
        sourceStoreId,
        destinationStoreId,
        productId,
        quantity,
        serials,
        organizationId,
      } = transfer;

      // 1. Increment source stock (return stock)
      const sourceStoreInv = await tx.storeOnInventory.findFirst({
        where: { storeId: sourceStoreId, inventory: { productId } },
      });
      if (sourceStoreInv) {
        await tx.storeOnInventory.update({
          where: { id: sourceStoreInv.id },
          data: { stock: { increment: quantity } },
        });
      }

      // 2. Decrement destination stock
      const destStoreInv = await tx.storeOnInventory.findFirst({
        where: { storeId: destinationStoreId, inventory: { productId } },
      });
      if (destStoreInv) {
        await tx.storeOnInventory.update({
          where: { id: destStoreInv.id },
          data: { stock: { decrement: quantity } },
        });
      }

      // 3. Move series back to source store
      if (serials && serials.length > 0) {
        await tx.entryDetailSeries.updateMany({
          where: {
            serial: { in: serials },
            organizationId,
            storeId: destinationStoreId,
          },
          data: { storeId: sourceStoreId },
        });
      }

      // 4. Delete the transfer Entry created at destination (referenceId = "transfer-{id}")
      const transferEntry = await tx.entry.findFirst({
        where: {
          referenceId: `transfer-${transferId}`,
          storeId: destinationStoreId,
        },
        include: { details: true },
      });
      if (transferEntry) {
        // Re-link series back to their original EntryDetail (before transfer) if possible
        if (serials && serials.length > 0 && transferEntry.details.length > 0) {
          // Find the original EntryDetail from before the transfer
          const originalDetail = await tx.entryDetail.findFirst({
            where: {
              productId,
              entry: { storeId: sourceStoreId },
              id: { not: transferEntry.details[0].id },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (originalDetail) {
            await tx.entryDetailSeries.updateMany({
              where: {
                serial: { in: serials },
                organizationId,
                storeId: sourceStoreId,
              },
              data: { entryDetailId: originalDetail.id },
            });
          }
        }

        // Delete EntryDetail(s) then Entry
        await tx.entryDetail.deleteMany({
          where: { entryId: transferEntry.id },
        });
        await tx.entry.delete({ where: { id: transferEntry.id } });
      }

      // 5. Create inventory history for the reversal
      const historyData: any[] = [];
      if (sourceStoreInv) {
        historyData.push({
          inventoryId: sourceStoreInv.inventoryId,
          action: 'transfer-reversal-in',
          stockChange: quantity,
          previousStock: sourceStoreInv.stock,
          newStock: sourceStoreInv.stock + quantity,
          userId,
          organizationId,
          companyId: null,
        });
      }
      if (destStoreInv) {
        historyData.push({
          inventoryId: destStoreInv.inventoryId,
          action: 'transfer-reversal-out',
          stockChange: -quantity,
          previousStock: destStoreInv.stock,
          newStock: destStoreInv.stock - quantity,
          userId,
          organizationId,
          companyId: null,
        });
      }
      if (historyData.length > 0) {
        await tx.inventoryHistory.createMany({ data: historyData });
      }

      this.logger.log(
        `[reverseTransfer] Transfer ${transferId} reversed: ${quantity}× product ${productId} from store ${destinationStoreId} → ${sourceStoreId}` +
        (reason ? ` (reason: ${reason})` : ''),
      );
    };

    if (externalTx) {
      return runInTx(externalTx);
    }
    return this.prisma.$transaction(async (tx) => runInTx(tx));
  }

  // Obtener el stock de un producto en una tienda específica
  async getSeriesByProductAndStore(
    storeId: number,
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const resolvedCompanyId = companyId ?? null;

    await this.ensureInventoryFeatureEnabled(resolvedCompanyId);

    // Busca las series asociadas al producto en la tienda seleccionada.
    // Usa EntryDetailSeries.storeId (actualizado por transferencias) en vez
    // de entry.storeId (tienda donde se creó la entrada original).
    const series = await this.prisma.entryDetailSeries.findMany({
      where: {
        entryDetail: {
          productId,
        },
        storeId, // storeId directo en EntryDetailSeries (se actualiza en transferencias)
        status: 'active',
        ...(organizationId !== undefined
          ? { organizationId: organizationId ?? null }
          : {}),
      },
      select: {
        serial: true,
      },
    });

    return series.map((serie) => serie.serial);
  }

  // Obtener el stock de un producto en una tienda especÃ­fica
  async getStockByProductAndStore(
    storeId: number,
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureInventoryFeatureEnabled(companyId ?? null);

    const storeWhere: Prisma.StoreWhereInput = {};
    if (organizationId !== undefined) {
      storeWhere.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      storeWhere.companyId = companyId ?? null;
    }

    const inventory = await this.prisma.storeOnInventory.findFirst({
      where: {
        storeId,
        inventory: {
          productId,
          ...(organizationId !== undefined
            ? { organizationId: organizationId ?? null }
            : {}),
        },
        ...(Object.keys(storeWhere).length > 0 ? { store: storeWhere } : {}),
      },
      select: { stock: true },
    });

    return inventory?.stock ?? 0;
  }

  // Obtener el inventario con detalles de entradas y tiendas
  async getInventoryWithEntries(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    try {
      await this.ensureInventoryFeatureEnabled(companyId ?? null);
      const where: Prisma.InventoryWhereInput = {
        ...this.buildOrgFilter(organizationId),
      };

      if (companyId !== undefined) {
        where.storeOnInventory = {
          some: {
            store: {
              companyId: companyId ?? null,
            },
          },
        };
      }

      this.logger.debug(
        `getInventoryWithEntries: orgId=${organizationId}, companyId=${companyId}, where=${JSON.stringify(where)}`,
      );

      const inventories = await this.prisma.inventory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          entryDetail: {
            include: {
              entry: true,
              salesDetails: true,
              series: true,
            },
          },
          storeOnInventory: {
            include: {
              store: true,
            },
          },
        },
      });

      this.logger.debug(
        `getInventoryWithEntries: found ${inventories.length} inventory records from DB`,
      );

      if (companyId === undefined) {
        return inventories;
      }

      const targetCompanyId = companyId ?? null;
      const filtered = inventories
        .map((item) => {
          const filteredStoreOnInventory = item.storeOnInventory.filter(
            (storeInventory) =>
              (storeInventory.store?.companyId ?? null) === targetCompanyId,
          );
          const allowedStoreIds = new Set(
            filteredStoreOnInventory.map(
              (storeInventory) => storeInventory.storeId,
            ),
          );
          const filteredEntryDetails = item.entryDetail.filter(
            (detail) => detail.entry && allowedStoreIds.has(detail.entry.storeId),
          );

          return {
            ...item,
            storeOnInventory: filteredStoreOnInventory,
            entryDetail: filteredEntryDetails,
          };
        })
        .filter(
          (item) =>
            item.storeOnInventory.length > 0 || item.entryDetail.length > 0,
        );

      this.logger.debug(
        `getInventoryWithEntries: after companyId filter (${targetCompanyId}): ${filtered.length} records`,
      );

      return filtered;
    } catch (error) {
      this.logger.error('Error in getInventoryWithEntries:', error);
      handlePrismaError(error);
      return [];
    }
  }

  // Obtener el inventario con desglose por moneda y tienda
  async calculateInventoryWithCurrencyByStore(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    try {
      await this.ensureInventoryFeatureEnabled(companyId ?? null);
      const inventory = await this.getInventoryWithEntries(
        organizationId,
        companyId,
      );

      if (!inventory || !Array.isArray(inventory)) {
        this.logger.error('getInventoryWithEntries returned invalid data:', inventory);
        return [];
      }

      return inventory.map((item) => {
      // Agrupar los detalles de entrada por tienda
      const stockByStore = item.storeOnInventory.map((storeInventory) => {
        const stockByCurrency = item.entryDetail
          .filter((detail) => detail.entry && detail.entry.storeId === storeInventory.storeId)
          .reduce(
            (acc, detail) => {
              const sold = detail.salesDetails.reduce(
                (s, sd) => s + sd.quantity,
                0,
              );
              const remaining = detail.quantity - sold;
              if (detail.entry.tipoMoneda === 'USD') {
                acc.USD += remaining;
              } else if (detail.entry.tipoMoneda === 'PEN') {
                acc.PEN += remaining;
              }
              return acc;
            },
            { USD: 0, PEN: 0 },
          );

        return {
          storeId: storeInventory.storeId,
          storeName: storeInventory.store?.name ?? 'Tienda desconocida',
          stockByCurrency,
        };
      });

      return {
        ...item,
        stockByStore,
      };
    });
    } catch (error) {
      this.logger.error('Error in calculateInventoryWithCurrencyByStore:', error);
      handlePrismaError(error);
      return [];
    }
  }

  // Obtener el inventario con desglose por moneda
  async getStockDetailsByStoreAndCurrency(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const inventory = await this.getInventoryWithEntries(
      organizationId,
      companyId,
    );

    // Agrupar los detalles por producto.
    // Estrategia: usar stock REAL (StoreOnInventory) como fuente de verdad y
    // las entradas brutas (sin descontar ventas) solo para determinar el RATIO
    // PEN/USD. Esto evita errores cuando las ventas están concentradas en un
    // solo EntryDetail (remaining negativo en un detalle, positivo en otros).
    const groupedDetails = inventory.reduce((acc: any, item) => {
      const productId = item.productId;
      const productName = item.product.name;

      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName,
          totalByCurrency: { USD: 0, PEN: 0 },
          stockByStoreAndCurrency: {},
        };
      }

      // Por cada tienda, calcular el stock por moneda usando el ratio de
      // entradas brutas aplicado al stock real de StoreOnInventory.
      item.storeOnInventory.forEach((storeInventory) => {
        const storeId = storeInventory.storeId;
        const storeName = storeInventory.store?.name ?? 'Tienda desconocida';
        const actualStock = storeInventory.stock ?? 0;

        if (!acc[productId].stockByStoreAndCurrency[storeId]) {
          acc[productId].stockByStoreAndCurrency[storeId] = {
            storeName,
            USD: 0,
            PEN: 0,
          };
        }

        // Sumar entradas brutas por moneda para esta tienda (sin descontar ventas)
        let grossPEN = 0;
        let grossUSD = 0;
        item.entryDetail
          .filter((d) => d.entry && d.entry.storeId === storeId)
          .forEach((d) => {
            if (d.entry.tipoMoneda === 'PEN') grossPEN += d.quantity;
            else if (d.entry.tipoMoneda === 'USD') grossUSD += d.quantity;
          });

        const grossTotal = grossPEN + grossUSD;

        let penStock: number;
        let usdStock: number;
        if (grossTotal > 0) {
          const penRatio = grossPEN / grossTotal;
          penStock = Math.round(actualStock * penRatio);
          usdStock = actualStock - penStock;
        } else {
          // Sin entradas registradas: atribuir todo a PEN por defecto
          penStock = actualStock;
          usdStock = 0;
        }

        acc[productId].stockByStoreAndCurrency[storeId].PEN += penStock;
        acc[productId].stockByStoreAndCurrency[storeId].USD += usdStock;
        acc[productId].totalByCurrency.PEN += penStock;
        acc[productId].totalByCurrency.USD += usdStock;
      });

      return acc;
    }, {});

    // Convertir el objeto en un array
    return Object.values(groupedDetails);
  }

  // Obtener las entradas de un producto específico
  async getProductEntries(
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const entryFilter: Prisma.EntryWhereInput = {};
    if (organizationId !== undefined) {
      entryFilter.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      entryFilter.store = {
        companyId: companyId ?? null,
      };
    }

    const entryWhere: Prisma.EntryDetailWhereInput = {
      productId,
      ...(Object.keys(entryFilter).length > 0
        ? { entry: { is: entryFilter } }
        : {}),
    };
    // Obtener todas las entradas del producto
    const entries = await this.prisma.entryDetail.findMany({
      where: entryWhere,
      select: {
        createdAt: true, // Fecha de la entrada
        price: true, // Precio de compra
        priceInSoles: true, // Precio en soles (si aplica)
        entry: {
          select: {
            tipoMoneda: true, // Moneda (USD o PEN)
            store: {
              select: {
                name: true, // Nombre de la tienda
                companyId: true,
              },
            },
            provider: {
              select: {
                name: true, // Nombre del proveedor
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        quantity: true, // Verificar si la cantidad ya está incluida
        series: {
          select: {
            serial: true, // Números de serie asociados a la entrada
          },
        },
      },
    });

    // Formatear las entradas para devolver solo los datos necesarios
    return entries.map((entry) => ({
      createdAt: entry.createdAt,
      price:
        entry.entry.tipoMoneda === 'USD' ? entry.priceInSoles : entry.price, // Normalizar el precio a soles
      tipoMoneda: entry.entry.tipoMoneda,
      storeName: entry.entry.store?.name || 'Sin tienda',
      supplierName: entry.entry.provider?.name || 'Sin proveedor',
      quantity: entry.quantity, // Asegurarse de incluir la cantidad
      series: entry.series?.map((s) => s.serial) ?? [], // Extraer los números de serie
      responsibleId: entry.entry.user?.id ?? null,
      responsibleName:
        entry.entry.user?.username || entry.entry.user?.email || null,
    }));
  }

  // Obtener el producto por ID de StoreOnInventory y Inventory
  async getProductByInventoryId(
    inventoryId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        ...(organizationId !== undefined
          ? { organizationId: organizationId ?? null }
          : {}),
        ...(companyId !== undefined
          ? {
              storeOnInventory: {
                some: { store: { companyId: companyId ?? null } },
              },
            }
          : {}),
      },
      include: {
        product: true, // Incluye la relación con el producto
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `No se encontró el inventario con ID ${inventoryId}`,
      );
    }

    return {
      productId: inventory.product.id,
      productName: inventory.product.name,
    };
  }
  //

  // Obtener las salidas de un producto específico
  async getProductSales(
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const saleFilter: Prisma.SalesWhereInput = {};
    if (organizationId !== undefined) {
      saleFilter.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      saleFilter.store = { companyId: companyId ?? null };
    }

    const sales = await this.prisma.salesDetail.findMany({
      where: {
        productId,
        ...(Object.keys(saleFilter).length > 0
          ? { sale: { is: saleFilter } }
          : {}),
      },
      include: {
        sale: {
          include: {
            store: true, // Información de la tienda
            client: true, // Información del cliente
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Formatear las salidas para devolver solo los datos necesarios
    return sales.map((sale) => ({
      createdAt: sale.createdAt,
      quantity: sale.quantity,
      price: sale.price,
      series: sale.series,
      storeName: sale.sale.store?.name ?? 'Tienda desconocida',
      clientName: sale.sale.client?.name || 'Sin cliente',
      responsibleId: sale.sale.user?.id ?? null,
      responsibleName:
        sale.sale.user?.username || sale.sale.user?.email || null,
    }));
  }

  async getCategoriesFromInventory(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const inventoryFilter: Prisma.InventoryWhereInput = {
      ...this.buildOrgFilter(organizationId),
    };

    if (companyId !== undefined) {
      inventoryFilter.storeOnInventory = {
        some: { store: { companyId: companyId ?? null } },
      };
    }
    const productsWithCategories = await this.prisma.product.findMany({
      where: {
        inventory: {
          some: inventoryFilter, // Asegurarse de que el producto esté en el inventario
        },
      },
      select: {
        id: true, // ID del producto
        name: true, // Nombre del producto
        category: {
          select: {
            id: true, // ID de la categoría
            name: true, // Nombre de la categoría
          },
        },
      },
      distinct: ['categoryId'], // Usar categoryId para obtener categorías únicas
    });

    // Mapear los datos para devolver la estructura esperada por el frontend
    return productsWithCategories.map((product) => ({
      productId: product.id,
      product: {
        name: product.name,
        category: product.category ? product.category.name : 'Sin categoría', // Anidar la categoría dentro de "product"
      },
    }));
  }

  // Nuevo método para obtener el inventario total agrupado por nombre
  async getTotalInventoryByName(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureInventoryFeatureEnabled(companyId ?? null);
    const where: Prisma.InventoryWhereInput = {
      ...this.buildOrgFilter(organizationId),
    };

    if (companyId !== undefined) {
      where.storeOnInventory = {
        some: { store: { companyId: companyId ?? null } },
      };
    }
    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: true, // Incluye información del producto
        storeOnInventory: {
          include: { store: true },
        }, // Incluye información de las tiendas
      },
    });

    // Agrupar por nombre de producto y sumar el stock
    const groupedInventory = inventory.reduce((acc, item) => {
      const productName = item.product.name;
      const storeInventories =
        companyId === undefined
          ? item.storeOnInventory
          : item.storeOnInventory.filter(
              (storeInventory) =>
                (storeInventory.store?.companyId ?? null) ===
                (companyId ?? null),
            );

      if (storeInventories.length === 0) {
        return acc;
      }

      if (!acc[productName]) {
        acc[productName] = {
          name: productName,
          totalStock: 0,
        };
      }

      // Sumar el stock de todas las tiendas
      acc[productName].totalStock += storeInventories.reduce(
        (sum, store) => sum + store.stock,
        0,
      );

      return acc;
    }, {});

    // Convertir el objeto en un array
    return Object.values(groupedInventory);
  }

  async getProductsWithLowStockAcrossStores(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureInventoryFeatureEnabled(companyId ?? null);
    const where: Prisma.InventoryWhereInput = {
      ...this.buildOrgFilter(organizationId),
    };

    if (companyId !== undefined) {
      where.storeOnInventory = {
        some: { store: { companyId: companyId ?? null } },
      };
    }

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: {
        product: true,
        storeOnInventory: {
          include: { store: true },
        },
      },
    });

    // Para agrupar por productId y evitar duplicados
    const groupedByProduct = new Map<
      number,
      {
        productId: number;
        productName: string;
        totalStock: number;
      }
    >();

    for (const inventory of inventories) {
      const productId = inventory.product.id;
      const productName = inventory.product.name;
      const storeInventories =
        companyId === undefined
          ? inventory.storeOnInventory
          : inventory.storeOnInventory.filter(
              (storeInv) =>
                (storeInv.store?.companyId ?? null) === (companyId ?? null),
            );
      const totalStock = storeInventories.reduce(
        (sum, storeInv) => sum + storeInv.stock,
        0,
      );

      // Si el producto ya está en el Map, sumar el stock
      if (groupedByProduct.has(productId)) {
        const existing = groupedByProduct.get(productId)!;
        existing.totalStock += totalStock;
      } else {
        groupedByProduct.set(productId, {
          productId,
          productName,
          totalStock,
        });
      }
    }

    // Filtrar solo los productos con stock total 0
    return Array.from(groupedByProduct.values()).filter(
      (item) => item.totalStock <= 0,
    );
  }

  async getProductsByStore(
    storeId: number,
    categoryId?: number,
    search?: string,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureInventoryFeatureEnabled(companyId ?? null);
    const categoryFilter: Prisma.ProductWhereInput = categoryId
      ? { categoryId }
      : {};

    if (search) {
      categoryFilter.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const inventoryFilter: Prisma.InventoryWhereInput = {
      product: categoryFilter,
      ...this.buildOrgFilter(organizationId),
    };

    return this.prisma.storeOnInventory.findMany({
      where: {
        storeId,
        ...(organizationId !== undefined || companyId !== undefined
          ? {
              store: {
                ...(organizationId !== undefined
                  ? { organizationId: organizationId ?? null }
                  : {}),
                ...(companyId !== undefined
                  ? { companyId: companyId ?? null }
                  : {}),
              },
            }
          : {}),
        stock: {
          gt: 0,
        },
        inventory: inventoryFilter,
      },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        salesDetails: {
          orderBy: {
            sale: {
              createdAt: 'desc',
            },
          },
          take: 1,
          select: {
            sale: {
              select: {
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  async getAllProductsByStore(
    storeId: number,
    categoryId?: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureInventoryFeatureEnabled(companyId ?? null);
    const categoryFilter: Prisma.ProductWhereInput = categoryId
      ? { categoryId }
      : {};

    const inventoryFilter: Prisma.InventoryWhereInput = {
      product: categoryFilter,
      ...this.buildOrgFilter(organizationId),
    };

    return this.prisma.storeOnInventory.findMany({
      where: {
        storeId,
        ...(organizationId !== undefined || companyId !== undefined
          ? {
              store: {
                ...(organizationId !== undefined
                  ? { organizationId: organizationId ?? null }
                  : {}),
                ...(companyId !== undefined
                  ? { companyId: companyId ?? null }
                  : {}),
              },
            }
          : {}),
        inventory: inventoryFilter,
      },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        salesDetails: {
          orderBy: {
            sale: {
              createdAt: 'desc',
            },
          },
          take: 1,
          select: {
            sale: {
              select: {
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  async processExcelData(
    data: any[],
    storeId: number,
    userId: number,
    providerId: number | null,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
      }

      const storeOrganizationId = (store as { organizationId?: number | null })
        .organizationId;
      const storeCompanyId = (store as { companyId?: number | null }).companyId;
      const resolvedOrganizationId =
        organizationId ?? storeOrganizationId ?? null;
      const resolvedCompanyId = companyId ?? storeCompanyId ?? null;

      if (resolvedCompanyId !== null) {
        if (resolvedOrganizationId === null) {
          throw new BadRequestException(
            'Debe indicar una organizacion valida para asociar la importacion a una compania.',
          );
        }
        await this.ensureInventoryFeatureEnabled(resolvedCompanyId);
        await this.assertCompanyMatchesOrganization(
          resolvedCompanyId,
          resolvedOrganizationId,
        );
      }

      logOrganizationContext({
        service: InventoryService.name,
        operation: 'processExcelData',
        organizationId: resolvedOrganizationId,
        companyId: resolvedCompanyId ?? undefined,
        metadata: { storeId, userId },
      });

      const parsedUserId = Number(userId);
      if (!Number.isInteger(parsedUserId)) {
        throw new BadRequestException(
          'El usuario responsable es obligatorio para importar el Excel',
        );
      }
      const duplicatedSeriesGlobal: string[] = [];
      const duplicatedSeriesLocal: string[] = [];
      const seenInExcel = new Set<string>();

      // Crear proveedor genérico si no se proporcionó uno
      if (!providerId) {
        const existing = await this.prisma.provider.findFirst({
          where: { name: 'Sin Proveedor' },
        });
        providerId = existing
          ? existing.id
          : (
              await this.prisma.provider.create({
                data: {
                  name: 'Sin Proveedor',
                  adress: '',
                  description:
                    'Proveedor generado automáticamente al importar Excel.',
                },
              })
            ).id;
      }

      const defaultExchangeRate = await this.prisma.tipoCambio.findFirst({
        orderBy: { fecha: 'desc' },
      });

      for (const row of data) {
        const {
          nombre,
          categoria,
          descripcion,
          precioCompra,
          precioVenta,
          stock,
        } = row;

        const parsedStock = parseInt(stock);
        const parsedPrecioCompra = parseFloat(precioCompra);
        const parsedPrecioVenta =
          precioVenta !== undefined ? parseFloat(precioVenta) : null;

        if (
          !nombre ||
          !categoria ||
          isNaN(parsedPrecioCompra) ||
          isNaN(parsedStock)
        ) {
          throw new BadRequestException(`Datos inválidos en la fila: ${JSON.stringify(row)}`);
        }

        let product = await this.prisma.product.findFirst({
          where: { name: nombre },
        });

        let category = await this.prisma.category.findFirst({
          where: { name: categoria },
        });
        if (!category) {
          category = await this.prisma.category.create({
            data: { name: categoria },
          });
        }

        if (!product) {
          product = await this.prisma.product.create({
            data: {
              name: nombre,
              description: descripcion || null,
              price: parsedPrecioCompra,
              priceSell: parsedPrecioVenta,
              categoryId: category.id,
            },
          });
        }

        let inventory = await this.prisma.inventory.findFirst({
          where: { productId: product.id },
        });
        if (!inventory) {
          const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization =
            {
              productId: product.id,
              storeId,
              organizationId: resolvedOrganizationId,
            };

          inventory = await this.prisma.inventory.create({
            data: inventoryCreateData,
          });
        }

        const storeInventory = await this.prisma.storeOnInventory.findFirst({
          where: { inventoryId: inventory.id, storeId },
        });

        const action = storeInventory ? AuditAction.UPDATED : AuditAction.CREATED;

        if (storeInventory) {
          await this.prisma.storeOnInventory.update({
            where: { id: storeInventory.id },
            data: {
              stock: storeInventory.stock + parsedStock,
            },
          });
        } else {
          await this.prisma.storeOnInventory.create({
            data: {
              inventoryId: inventory.id,
              storeId,
              stock: parsedStock,
            },
          });
        }

        const historyCreateData: InventoryHistoryUncheckedCreateInputWithOrganization =
          {
            inventoryId: inventory.id,
            userId,
            action: 'import',
            description: `Ingreso masivo desde Excel`,
            stockChange: parsedStock,
            previousStock: storeInventory?.stock ?? 0,
            newStock: (storeInventory?.stock ?? 0) + parsedStock,
            organizationId: resolvedOrganizationId,
            companyId: resolvedCompanyId ?? null,
          };

        await this.prisma.inventoryHistory.create({
          data: historyCreateData,
        });

        await this.activityService.log({
          actorId: userId,
          entityType: 'InventoryItem',
          entityId: inventory.id.toString(),
          action,
          summary: `Importación de ${parsedStock}x ${product.name} en tienda ${storeId}`,
        });

        try {
          await this.accountingHook.postInventoryAdjustment({
            productId: product.id,
            adjustment: parsedStock * parsedPrecioCompra,
            counterAccount: 'inventory-adjustment',
            description: `Importación de ${parsedStock}x ${product.name} en tienda ${storeId}`,
          });
        } catch (error) {
          const trace = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `No se pudo notificar el ajuste contable del producto ${product.id} durante la importación masiva`,
            trace,
          );
        }

        let series: string[] = [];
        if (row.serie && typeof row.serie === 'string') {
          series = row.serie
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }

        const entryCreateData: EntryUncheckedCreateInputWithOrganization = {
          storeId,
          tipoMoneda: 'PEN',
          userId,
          description: 'import_excel',
          providerId,
          organizationId: resolvedOrganizationId,
          ...(defaultExchangeRate
            ? { tipoCambioId: defaultExchangeRate.id }
            : {}),
        };

        const entry = await this.prisma.entry.create({
          data: entryCreateData,
        });

        const entryDetail = await this.prisma.entryDetail.create({
          data: {
            entryId: entry.id,
            productId: product.id,
            quantity: parsedStock,
            price: parsedPrecioCompra,
            priceInSoles: parsedPrecioCompra,
            inventoryId: inventory.id,
          },
        });

        if (series.length > 0) {
          for (const serial of series) {
            if (seenInExcel.has(serial)) {
              duplicatedSeriesLocal.push(serial);
              continue;
            }

            seenInExcel.add(serial);

            const exists = await this.prisma.entryDetailSeries.findFirst({
              where: {
                serial,
                organizationId: resolvedOrganizationId ?? null,
              },
            });
            if (exists) {
              duplicatedSeriesGlobal.push(serial);
              continue;
            }

            await this.prisma.entryDetailSeries.create({
              data: {
                entryDetailId: entryDetail.id,
                serial,
                status: 'active',
                organizationId: resolvedOrganizationId ?? null,
              },
            });
          }
        }
      }

      return {
        message: 'Importación exitosa',
        duplicatedSeriesGlobal,
        duplicatedSeriesLocal,
      };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async generateInventoryExcel(
    storeId: number,
    categoryId?: number,
    storeName?: string,
    organizationName?: string,
  ): Promise<Buffer> {
    /* ── Color palette ── */
    const C = {
      navy: 'FF1B2A4A',
      navyLight: 'FF2D4A7A',
      teal: 'FF0891B2',
      tealLight: 'FFE0F7FA',
      white: 'FFFFFFFF',
      offWhite: 'FFF8FAFC',
      grayLight: 'FFF1F5F9',
      grayMed: 'FFE2E8F0',
      grayText: 'FF64748B',
      dark: 'FF1E293B',
      emerald: 'FF10B981',
      emeraldBg: 'FFECFDF5',
      amber: 'FFF59E0B',
      amberBg: 'FFFFFBEB',
      red: 'FFEF4444',
      redBg: 'FFFEF2F2',
      blueBg: 'FFEFF6FF',
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: C.grayMed } },
      bottom: { style: 'thin', color: { argb: C.grayMed } },
      left: { style: 'thin', color: { argb: C.grayMed } },
      right: { style: 'thin', color: { argb: C.grayMed } },
    };

    const currencyFmt = '#,##0.00';
    const pctFmt = '0.0"%"';

    const today = format(new Date(), 'dd/MM/yyyy HH:mm', {
      timeZone: 'America/Lima',
    });
    const todayShort = format(new Date(), 'dd MMM yyyy', {
      timeZone: 'America/Lima',
    });

    /* ── Data fetch ── */
    const categoryFilter = categoryId ? { categoryId } : {};

    const products = await this.prisma.storeOnInventory.findMany({
      where: {
        storeId,
        inventory: { product: categoryFilter },
      },
      include: {
        inventory: {
          include: {
            product: {
              include: { category: true, brand: true },
            },
          },
        },
      },
    });

    // Batch-fetch all active series for this store
    const allSeries = await this.prisma.entryDetailSeries.findMany({
      where: {
        entryDetail: { entry: { storeId } },
        status: 'active',
      },
      select: { serial: true, entryDetail: { select: { productId: true } } },
    });

    const seriesByProduct = new Map<number, string[]>();
    for (const s of allSeries) {
      const pid = s.entryDetail.productId;
      if (!seriesByProduct.has(pid)) seriesByProduct.set(pid, []);
      seriesByProduct.get(pid)!.push(s.serial);
    }

    /* ── Compute KPIs ── */
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalCostValue = products.reduce(
      (sum, p) => sum + p.stock * (p.inventory.product.price ?? 0),
      0,
    );
    const totalSellValue = products.reduce(
      (sum, p) => sum + p.stock * (p.inventory.product.priceSell ?? 0),
      0,
    );
    const zeroStockCount = products.filter((p) => p.stock === 0).length;
    const lowStockCount = products.filter(
      (p) => p.stock > 0 && p.stock <= 5,
    ).length;
    const withSeriesCount = products.filter(
      (p) =>
        (seriesByProduct.get(p.inventory.product.id) ?? []).length > 0,
    ).length;
    const avgMargin =
      totalProducts > 0
        ? products.reduce((sum, p) => {
            const cost = p.inventory.product.price ?? 0;
            const sell = p.inventory.product.priceSell ?? 0;
            return sum + (cost > 0 ? ((sell - cost) / cost) * 100 : 0);
          }, 0) / totalProducts
        : 0;

    // Group by category
    const groupedByCategory = new Map<
      string,
      typeof products
    >();
    for (const item of products) {
      const cat =
        item.inventory.product.category?.name || 'Sin categoría';
      if (!groupedByCategory.has(cat)) groupedByCategory.set(cat, []);
      groupedByCategory.get(cat)!.push(item);
    }
    const sortedCategories = Array.from(groupedByCategory.keys()).sort(
      (a, b) => a.localeCompare(b),
    );

    /* ── Total columns: 10 ── */
    const COL_COUNT = 10;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = organizationName ?? 'Sistema de Inventario';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Inventario', {
      properties: { defaultRowHeight: 18 },
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.6,
          bottom: 0.6,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // Column widths
    ws.columns = [
      { width: 5 },   // A: #
      { width: 32 },  // B: Producto
      { width: 18 },  // C: Marca
      { width: 16 },  // D: Código
      { width: 14 },  // E: P. Compra
      { width: 14 },  // F: P. Venta
      { width: 11 },  // G: Margen %
      { width: 9 },   // H: Stock
      { width: 16 },  // I: Valor Stock
      { width: 38 },  // J: Series
    ];

    let currentRow = 0;

    // ═══════════════════════════════════════
    // SECTION 1: HEADER BANNER
    // ═══════════════════════════════════════
    // Row 1: Navy banner with org name
    currentRow++;
    const bannerRow = ws.addRow([]);
    bannerRow.height = 36;
    ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
    const bannerCell = ws.getCell(currentRow, 1);
    bannerCell.value = (organizationName ?? 'INVENTARIO').toUpperCase();
    bannerCell.font = {
      name: 'Calibri',
      size: 18,
      bold: true,
      color: { argb: C.white },
    };
    bannerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: C.navy },
    };
    bannerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 2: Subtitle with store + date
    currentRow++;
    const subtitleRow = ws.addRow([]);
    subtitleRow.height = 24;
    ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
    const subtitleCell = ws.getCell(currentRow, 1);
    subtitleCell.value = `Reporte de Inventario — ${storeName ?? 'Tienda'} — ${todayShort}`;
    subtitleCell.font = {
      name: 'Calibri',
      size: 11,
      color: { argb: C.white },
    };
    subtitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: C.navyLight },
    };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 3: Thin teal accent line
    currentRow++;
    const accentRow = ws.addRow([]);
    accentRow.height = 4;
    for (let col = 1; col <= COL_COUNT; col++) {
      const cell = ws.getCell(currentRow, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: C.teal },
      };
    }

    // Row 4: Spacer
    currentRow++;
    ws.addRow([]).height = 8;

    // ═══════════════════════════════════════
    // SECTION 2: KPI DASHBOARD
    // ═══════════════════════════════════════
    const kpiLabelFont: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      size: 9,
      color: { argb: C.grayText },
    };
    const kpiValueFont: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: C.dark },
    };

    // Helper to build a KPI block (2 rows × 2 cols merged)
    const buildKpiBlock = (
      startRow: number,
      startCol: number,
      label: string,
      value: string,
      bgColor: string,
      accentColor: string,
    ) => {
      // Merge label row
      ws.mergeCells(startRow, startCol, startRow, startCol + 1);
      const labelCell = ws.getCell(startRow, startCol);
      labelCell.value = label;
      labelCell.font = kpiLabelFont;
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      labelCell.alignment = { horizontal: 'center', vertical: 'bottom' };
      labelCell.border = {
        top: { style: 'thin', color: { argb: accentColor } },
        left: { style: 'thin', color: { argb: accentColor } },
        right: { style: 'thin', color: { argb: accentColor } },
      };
      // Fill second merged cell border
      ws.getCell(startRow, startCol + 1).border = labelCell.border;

      // Merge value row
      ws.mergeCells(startRow + 1, startCol, startRow + 1, startCol + 1);
      const valCell = ws.getCell(startRow + 1, startCol);
      valCell.value = value;
      valCell.font = { ...kpiValueFont, color: { argb: accentColor } };
      valCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      valCell.alignment = { horizontal: 'center', vertical: 'top' };
      valCell.border = {
        bottom: { style: 'thin', color: { argb: accentColor } },
        left: { style: 'thin', color: { argb: accentColor } },
        right: { style: 'thin', color: { argb: accentColor } },
      };
      ws.getCell(startRow + 1, startCol + 1).border = valCell.border;
    };

    // KPI Row 1 (2 worksheet rows)
    currentRow++;
    ws.addRow([]).height = 20; // label row
    currentRow++;
    ws.addRow([]).height = 26; // value row

    const kpiRow1 = currentRow - 1;
    buildKpiBlock(kpiRow1, 1, 'TOTAL PRODUCTOS', totalProducts.toString(), C.blueBg, C.navyLight);
    buildKpiBlock(kpiRow1, 3, 'STOCK TOTAL', totalStock.toLocaleString('es-PE'), C.emeraldBg, C.emerald);
    buildKpiBlock(kpiRow1, 5, 'VALOR COSTO', `S/ ${totalCostValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, C.tealLight, C.teal);
    buildKpiBlock(kpiRow1, 7, 'VALOR VENTA', `S/ ${totalSellValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, C.tealLight, C.teal);
    buildKpiBlock(kpiRow1, 9, 'MARGEN PROM.', `${avgMargin.toFixed(1)}%`, C.emeraldBg, C.emerald);

    // KPI Row 2 (2 worksheet rows)
    currentRow++;
    ws.addRow([]).height = 20;
    currentRow++;
    ws.addRow([]).height = 26;

    const kpiRow2 = currentRow - 1;
    buildKpiBlock(kpiRow2, 1, 'CATEGORIAS', sortedCategories.length.toString(), C.offWhite, C.grayText);
    buildKpiBlock(kpiRow2, 3, 'SIN STOCK', zeroStockCount.toString(), zeroStockCount > 0 ? C.redBg : C.offWhite, zeroStockCount > 0 ? C.red : C.grayText);
    buildKpiBlock(kpiRow2, 5, 'STOCK BAJO (<=5)', lowStockCount.toString(), lowStockCount > 0 ? C.amberBg : C.offWhite, lowStockCount > 0 ? C.amber : C.grayText);
    buildKpiBlock(kpiRow2, 7, 'CON SERIES', withSeriesCount.toString(), C.offWhite, C.grayText);
    buildKpiBlock(kpiRow2, 9, 'GANANCIA EST.', `S/ ${(totalSellValue - totalCostValue).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, C.emeraldBg, C.emerald);

    // Spacer
    currentRow++;
    ws.addRow([]).height = 12;

    // ═══════════════════════════════════════
    // SECTION 3: DATA TABLE
    // ═══════════════════════════════════════
    if (products.length === 0) {
      currentRow++;
      ws.addRow([]);
      ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
      const emptyCell = ws.getCell(currentRow, 1);
      emptyCell.value = 'No hay productos en inventario para esta tienda.';
      emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: C.grayText } };
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      // Table header row (stored for autoFilter)
      const headerLabels = [
        '#',
        'Producto',
        'Marca',
        'Código',
        'P. Compra',
        'P. Venta',
        'Margen %',
        'Stock',
        'Valor Stock',
        'Series',
      ];
      currentRow++;
      const headerRow = ws.addRow(headerLabels);
      headerRow.height = 22;
      const tableHeaderStartRow = currentRow;

      headerRow.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: C.white },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: C.navy },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber >= 5 && colNumber <= 9 ? 'right' : 'left',
          wrapText: false,
        };
        cell.border = {
          bottom: { style: 'medium', color: { argb: C.teal } },
        };
      });

      let globalIdx = 0;

      for (const category of sortedCategories) {
        const items = groupedByCategory.get(category)!;
        items.sort((a, b) =>
          a.inventory.product.name.localeCompare(b.inventory.product.name),
        );

        // Category separator row
        currentRow++;
        const catRow = ws.addRow([]);
        catRow.height = 24;
        ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
        const catCell = ws.getCell(currentRow, 1);
        catCell.value = `  ${category.toUpperCase()}  (${items.length} producto${items.length !== 1 ? 's' : ''})`;
        catCell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: C.navy },
        };
        catCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: C.grayLight },
        };
        catCell.alignment = { vertical: 'middle' };
        catCell.border = {
          left: { style: 'medium', color: { argb: C.teal } },
          bottom: { style: 'thin', color: { argb: C.grayMed } },
        };

        // Category subtotals
        let catStock = 0;
        let catCostVal = 0;
        let catSellVal = 0;

        for (const item of items) {
          globalIdx++;
          const product = item.inventory.product;
          const cost = product.price ?? 0;
          const sell = product.priceSell ?? 0;
          const margin = cost > 0 ? ((sell - cost) / cost) * 100 : 0;
          const stockVal = item.stock * sell;
          const serials = seriesByProduct.get(product.id) ?? [];
          const seriesStr = serials.join(', ');

          catStock += item.stock;
          catCostVal += item.stock * cost;
          catSellVal += stockVal;

          const isEven = globalIdx % 2 === 0;
          const rowBg = isEven ? C.offWhite : C.white;

          currentRow++;
          const dataRow = ws.addRow([
            globalIdx,
            product.name,
            product.brand?.name ?? '—',
            product.barcode ?? '—',
            cost,
            sell,
            margin,
            item.stock,
            stockVal,
            seriesStr,
          ]);
          dataRow.height = 20;

          dataRow.eachCell((cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10, color: { argb: C.dark } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: rowBg },
            };
            cell.border = thinBorder;
            cell.alignment = {
              vertical: 'middle',
              horizontal: colNumber >= 5 && colNumber <= 9 ? 'right' : 'left',
              wrapText: colNumber === 10,
            };
          });

          // Number formats
          ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
          ws.getCell(currentRow, 1).font = { name: 'Calibri', size: 9, color: { argb: C.grayText } };
          ws.getCell(currentRow, 5).numFmt = currencyFmt;
          ws.getCell(currentRow, 6).numFmt = currencyFmt;
          ws.getCell(currentRow, 7).numFmt = pctFmt;
          ws.getCell(currentRow, 9).numFmt = currencyFmt;

          // Stock conditional formatting
          const stockCell = ws.getCell(currentRow, 8);
          stockCell.font = { name: 'Calibri', size: 10, bold: true };
          if (item.stock === 0) {
            stockCell.font.color = { argb: C.red };
            stockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.redBg } };
          } else if (item.stock <= 5) {
            stockCell.font.color = { argb: C.amber };
            stockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.amberBg } };
          } else {
            stockCell.font.color = { argb: C.emerald };
          }

          // Margin conditional formatting
          const marginCell = ws.getCell(currentRow, 7);
          if (margin < 10) {
            marginCell.font = { name: 'Calibri', size: 10, color: { argb: C.red } };
          } else if (margin < 25) {
            marginCell.font = { name: 'Calibri', size: 10, color: { argb: C.amber } };
          } else {
            marginCell.font = { name: 'Calibri', size: 10, color: { argb: C.emerald } };
          }

          // Series cell styling
          if (seriesStr) {
            const sCell = ws.getCell(currentRow, 10);
            sCell.font = {
              name: 'Consolas',
              size: 9,
              color: { argb: C.navyLight },
            };
          }
        }

        // Category subtotal row
        currentRow++;
        const subRow = ws.addRow([
          '',
          '',
          '',
          `Subtotal ${category}`,
          '',
          '',
          '',
          catStock,
          catSellVal,
          '',
        ]);
        subRow.height = 20;
        subRow.eachCell((cell, colNumber) => {
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: C.navy },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: C.grayLight },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: C.navy } },
            bottom: { style: 'double', color: { argb: C.navy } },
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber >= 5 ? 'right' : 'left',
          };
        });
        ws.getCell(currentRow, 9).numFmt = currencyFmt;
      }

      // ═══════════════════════════════════════
      // GRAND TOTAL ROW
      // ═══════════════════════════════════════
      currentRow++;
      ws.addRow([]).height = 4;
      currentRow++;
      const grandRow = ws.addRow([
        '',
        '',
        '',
        'TOTAL GENERAL',
        '',
        '',
        '',
        totalStock,
        totalSellValue,
        '',
      ]);
      grandRow.height = 26;
      grandRow.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Calibri',
          size: 12,
          bold: true,
          color: { argb: C.white },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: C.navy },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber >= 5 ? 'right' : 'left',
        };
      });
      ws.getCell(currentRow, 9).numFmt = currencyFmt;

      // ═══════════════════════════════════════
      // SECTION 4: FOOTER / LEGEND
      // ═══════════════════════════════════════
      currentRow++;
      ws.addRow([]).height = 16;

      // Stock legend
      currentRow++;
      const legendRow = ws.addRow([]);
      ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
      const legendCell = ws.getCell(currentRow, 1);
      legendCell.value =
        'Stock:  \u25CF Verde = Disponible (>5)    \u25CF Amarillo = Bajo (1-5)    \u25CF Rojo = Agotado (0)        Margen:  \u25CF Verde >= 25%    \u25CF Amarillo 10-25%    \u25CF Rojo < 10%';
      legendCell.font = { name: 'Calibri', size: 9, color: { argb: C.grayText } };
      legendCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Generation info
      currentRow++;
      const footerRow = ws.addRow([]);
      ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
      const footerCell = ws.getCell(currentRow, 1);
      footerCell.value = `Generado: ${today} | Tienda: ${storeName ?? 'N/A'} | ${categoryId ? 'Filtro de categoría aplicado' : 'Todas las categorías'} | ${totalProducts} productos`;
      footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: C.grayText } };
      footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Auto-filter on the table header
      ws.autoFilter = {
        from: { row: tableHeaderStartRow, column: 1 },
        to: { row: currentRow - 2, column: COL_COUNT },
      };

      // Freeze panes: freeze header rows + table header
      ws.views = [
        {
          state: 'frozen',
          ySplit: tableHeaderStartRow,
          activeCell: `A${tableHeaderStartRow + 1}`,
        },
      ];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
