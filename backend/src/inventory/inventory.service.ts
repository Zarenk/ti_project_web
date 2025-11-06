import {
  BadRequestException,
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
import {
  InventoryUncheckedCreateInputWithOrganization,
  InventoryHistoryUncheckedCreateInputWithOrganization,
  InventoryHistoryCreateManyInputWithOrganization,
  TransferUncheckedCreateInputWithOrganization,
  EntryUncheckedCreateInputWithOrganization,
} from 'src/tenancy/prisma-organization.types';

@Injectable()
export class InventoryService {
  [x: string]: any;
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private readonly accountingHook: AccountingHook,
  ) {}

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
      throw new Error('Stock insuficiente en la tienda de origen');
    }

    // Actualizar el stock en la tienda de origen
    await this.prisma.storeOnInventory.update({
      where: { id: sourceStoreInventory.id },
      data: { stock: sourceStoreInventory.stock - quantity },
    });

    // Actualizar el stock en la tienda de destino
    const destinationStoreInventory =
      await this.prisma.storeOnInventory.findFirst({
        where: { storeId: destinationStoreId, inventory: { productId } },
      });

    if (destinationStoreInventory) {
      // Si ya existe el producto en la tienda de destino, actualizar el stock
      await this.prisma.storeOnInventory.update({
        where: { id: destinationStoreInventory.id },
        data: { stock: destinationStoreInventory.stock + quantity },
      });
    } else {
      // Verificar si existe un registro en la tabla Inventory para el producto
      let inventory = await this.prisma.inventory.findFirst({
        where: { productId },
      });

      // Si no existe, crear un nuevo registro en Inventory
      if (!inventory) {
        const inventoryCreateData: InventoryUncheckedCreateInputWithOrganization =
          {
            productId,
            storeId: destinationStoreId, // Agregar el storeId requerido
            organizationId,
          };

        inventory = await this.prisma.inventory.create({
          data: inventoryCreateData,
        });
      }

      // Crear un nuevo registro en StoreOnInventory
      await this.prisma.storeOnInventory.create({
        data: {
          storeId: destinationStoreId,
          inventoryId: inventory.id, // Proporcionar directamente el ID del inventario
          stock: quantity,
        },
      });
    }
    // Registrar el traslado
    try {
      const transferCreateData: TransferUncheckedCreateInputWithOrganization = {
        sourceStoreId,
        destinationStoreId,
        productId,
        quantity,
        description: description || null,
        organizationId,
      };

      await this.prisma.transfer.create({
        data: transferCreateData,
      });

      // Registrar el evento en el historial de movimientos
      const historyEntries: InventoryHistoryCreateManyInputWithOrganization[] =
        [
          {
            inventoryId: sourceStoreInventory.inventoryId,
            action: 'transfer-out', // Acción de salida
            stockChange: -quantity,
            previousStock: sourceStoreInventory.stock,
            newStock: sourceStoreInventory.stock - quantity,
            userId, // Usuario que realizó la acción
            organizationId,
            companyId: companyId ?? null,
          },
          {
            inventoryId: destinationStoreInventory
              ? destinationStoreInventory.inventoryId
              : ((
                  await this.prisma.inventory.findFirst({
                    where: { productId },
                  })
                )?.id ??
                (() => {
                  throw new Error(
                    `No se encontró un inventoryId para el producto ${productId}`,
                  );
                })()),
            action: 'transfer-in', // Acción de entrada
            stockChange: quantity,
            previousStock: destinationStoreInventory
              ? destinationStoreInventory.stock
              : 0,
            newStock: destinationStoreInventory
              ? destinationStoreInventory.stock + quantity
              : quantity,
            userId, // Usuario que realizó la acción
            organizationId,
            companyId: companyId ?? null,
          },
        ];

      await this.prisma.inventoryHistory.createMany({
        data: historyEntries,
      });
    } catch (error) {
      console.error('Error al registrar el traslado:', error);
      throw new Error(
        'No se pudo registrar el traslado en la tabla de transferencias',
      );
    }

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
  }
  //

  // Obtener el stock de un producto en una tienda específica
  async getSeriesByProductAndStore(
    storeId: number,
    productId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const resolvedCompanyId = companyId ?? null;
    // Busca las series asociadas al producto en la tienda seleccionada
    const series = await this.prisma.entryDetailSeries.findMany({
      where: {
        entryDetail: {
          productId,
          entry: {
            storeId,
            ...(organizationId !== undefined
              ? { organizationId: organizationId ?? null }
              : {}),
            ...(companyId !== undefined
              ? { store: { companyId: resolvedCompanyId } }
              : {}),
          },
        },
        status: 'active', // Filtrar solo series activas
      },
      select: {
        serial: true, // Devuelve solo los números de serie
      },
    });

    return series.map((serie) => serie.serial); // Devuelve un array de números de serie
  }

  // Obtener el inventario con detalles de entradas y tiendas
  async getInventoryWithEntries(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where: Prisma.InventoryWhereInput = {};

    if (organizationId !== undefined) {
      where.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      where.storeOnInventory = {
        some: {
          store: {
            companyId: companyId ?? null,
          },
        },
      };
    }

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: {
            category: true, // Incluir información de la categoría del producto
          },
        },
        entryDetails: {
          include: {
            entry: true, // Incluye información de la entrada
            salesDetails: true, // Necesario para calcular stock restante
            series: true, // Incluir series disponibles
          },
        },
        storeOnInventory: {
          include: {
            store: true,
          },
        },
      },
    });

    if (companyId === undefined) {
      return inventories;
    }

    const targetCompanyId = companyId ?? null;
    return inventories
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
        const filteredEntryDetails = item.entryDetails.filter(
          (detail) => detail.entry && allowedStoreIds.has(detail.entry.storeId),
        );

        return {
          ...item,
          storeOnInventory: filteredStoreOnInventory,
          entryDetails: filteredEntryDetails,
        };
      })
      .filter(
        (item) =>
          item.storeOnInventory.length > 0 || item.entryDetails.length > 0,
      );
  }

  // Obtener el inventario con desglose por moneda y tienda
  async calculateInventoryWithCurrencyByStore(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const inventory = await this.getInventoryWithEntries(
      organizationId,
      companyId,
    );

    return inventory.map((item) => {
      // Agrupar los detalles de entrada por tienda
      const stockByStore = item.storeOnInventory.map((storeInventory) => {
        const stockByCurrency = item.entryDetails
          .filter((detail) => detail.entry.storeId === storeInventory.storeId)
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
          storeName: storeInventory.store.name,
          stockByCurrency,
        };
      });

      return {
        ...item,
        stockByStore,
      };
    });
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

    // Agrupar los detalles por producto
    const groupedDetails = inventory.reduce((acc: any, item) => {
      const productId = item.productId;
      const productName = item.product.name;

      // Si el producto no existe en el acumulador, inicializarlo
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName,
          totalByCurrency: { USD: 0, PEN: 0 },
          stockByStoreAndCurrency: {},
        };
      }

      // Acumular las cantidades totales por moneda
      item.entryDetails.forEach((detail) => {
        const sold = detail.salesDetails.reduce((s, sd) => s + sd.quantity, 0);
        const remaining = detail.quantity - sold;
        const currency = detail.entry.tipoMoneda;
        if (currency) {
          acc[productId].totalByCurrency[currency] += remaining;
        }
      });

      // Acumular las cantidades por tienda
      item.storeOnInventory.forEach((storeInventory) => {
        const storeId = storeInventory.storeId;
        const storeName = storeInventory.store.name;

        if (!acc[productId].stockByStoreAndCurrency[storeId]) {
          acc[productId].stockByStoreAndCurrency[storeId] = {
            storeName,
            USD: 0,
            PEN: 0,
          };
        }

        // Filtrar los detalles de entrada para esta tienda
        const entryDetailsForStore = item.entryDetails.filter(
          (detail) => detail.entry.storeId === storeId,
        );

        // Sumar las cantidades por moneda para esta tienda
        entryDetailsForStore.forEach((detail) => {
          const sold = detail.salesDetails.reduce(
            (s, sd) => s + sd.quantity,
            0,
          );
          const remaining = detail.quantity - sold;
          const currency = detail.entry.tipoMoneda;
          if (currency) {
            acc[productId].stockByStoreAndCurrency[storeId][currency] +=
              remaining;
          }
        });
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
        entry.entry.user?.username ||
        entry.entry.user?.email ||
        null,
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
      storeName: sale.sale.store.name,
      clientName: sale.sale.client?.name || 'Sin cliente',
      responsibleId: sale.sale.user?.id ?? null,
      responsibleName:
        sale.sale.user?.username ||
        sale.sale.user?.email ||
        null,
    }));
  }

  async getCategoriesFromInventory(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const inventoryFilter: Prisma.InventoryWhereInput = {};

    if (organizationId !== undefined) {
      inventoryFilter.organizationId = organizationId ?? null;
    }
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
    const where: Prisma.InventoryWhereInput = {};

    if (organizationId !== undefined) {
      where.organizationId = organizationId ?? null;
    }
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
    const where: Prisma.InventoryWhereInput = {};

    if (organizationId !== undefined) {
      where.organizationId = organizationId ?? null;
    }
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
    };

    if (organizationId !== undefined) {
      inventoryFilter.organizationId = organizationId ?? null;
    }

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
          gt: 0, // Solo productos con stock > 0
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
    const categoryFilter: Prisma.ProductWhereInput = categoryId
      ? { categoryId }
      : {};

    const inventoryFilter: Prisma.InventoryWhereInput = {
      product: categoryFilter,
    };

    if (organizationId !== undefined) {
      inventoryFilter.organizationId = organizationId ?? null;
    }

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
      throw new Error(
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
        throw new Error(`Datos inválidos en la fila: ${JSON.stringify(row)}`);
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
  }

  async generateInventoryExcel(
    storeId: number,
    categoryId?: number,
    storeName?: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    const today = format(new Date(), 'dd/MM/yyyy', {
      timeZone: 'America/Lima',
    });

    worksheet.addRow([
      `Inventario generado para la tienda: ${storeName ?? 'Desconocida'}`,
    ]);
    worksheet.addRow([`Fecha de generación: ${today}`]);
    worksheet.addRow([]);

    worksheet.columns = [
      { header: 'Producto', key: 'name', width: 30 },
      { header: 'Categoría', key: 'category', width: 25 },
      { header: 'Precio Compra', key: 'price', width: 15 },
      { header: 'Precio Venta', key: 'priceSell', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Fecha Ingreso', key: 'createdAt', width: 20 },
      { header: 'Series', key: 'series', width: 40 }, // ✅ NUEVA COLUMNA
    ];

    const categoryFilter = categoryId ? { categoryId } : {};

    const products = await this.prisma.storeOnInventory.findMany({
      where: {
        storeId,
        inventory: {
          product: categoryFilter,
        },
      },
      include: {
        inventory: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (products.length === 0) {
      worksheet.addRow({ name: 'Sin productos disponibles para exportar' });
    } else {
      products.sort((a, b) => {
        const catA = a.inventory.product.category?.name || '';
        const catB = b.inventory.product.category?.name || '';
        const categoryCompare = catA.localeCompare(catB);
        if (categoryCompare !== 0) return categoryCompare;
        return a.inventory.product.name.localeCompare(b.inventory.product.name);
      });

      const groupedByCategory = new Map<string, typeof products>();

      products.forEach((item) => {
        const category =
          item.inventory.product.category?.name || 'Sin categoría';
        if (!groupedByCategory.has(category)) {
          groupedByCategory.set(category, []);
        }
        groupedByCategory.get(category)!.push(item);
      });

      const sortedCategories = Array.from(groupedByCategory.keys()).sort(
        (a, b) => a.localeCompare(b),
      );

      for (const category of sortedCategories) {
        const items = groupedByCategory.get(category)!;

        const row = worksheet.addRow([`=== Categoría: ${category} ===`]);
        row.font = { bold: true };
        worksheet.addRow([]);

        for (const item of items.sort((a, b) =>
          a.inventory.product.name.localeCompare(b.inventory.product.name),
        )) {
          const product = item.inventory.product;

          // 🔍 Obtener series activas para ese producto y tienda
          const series = await this.prisma.entryDetailSeries.findMany({
            where: {
              entryDetail: {
                productId: product.id,
                entry: {
                  storeId,
                },
              },
              status: 'active',
            },
            select: { serial: true },
          });

          const seriesString = series.map((s) => s.serial).join(', ');

          const newRow = worksheet.addRow({
            name: product.name,
            category,
            price: product.price,
            priceSell: product.priceSell,
            stock: item.stock,
            createdAt: format(new Date(product.createdAt), 'dd/MM/yyyy', {
              timeZone: 'America/Lima',
            }),
            series: seriesString,
          });

          // ✅ Resaltar la celda de la columna "series" con fondo amarillo claro
          const seriesCell = newRow.getCell('series');
          seriesCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCC00' }, // Color amarillo claro (hex: #FFCC00)
          };
          seriesCell.font = { bold: true };
        }

        worksheet.addRow([]);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
