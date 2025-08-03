import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';

@Injectable()
export class EntriesService {
  [x: string]: any;
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
  ) {}

  // Crear una nueva entrada con detalles
  async createEntry(data: {
    storeId: number;
    userId: number;
    providerId: number;
    date: Date;
    description?: string;
    tipoMoneda?: string;
    tipoCambioId?: number;
    details: { productId: number; name: string; quantity: number; price: number; priceInSoles: number; series?: string[]; }[];
    invoice?: { serie: string; nroCorrelativo: string; tipoComprobante: string; tipoMoneda: string; total: number; fechaEmision: Date; };
  }) {

  try{
    console.log("Datos recibidos en createEntry:", data);
    return await this.prisma.$transaction(async (prisma) => {
      // Verificar que la tienda exista
      const store = await prisma.store.findUnique({ where: { id: data.storeId } });
      if (!store) {
        throw new NotFoundException(`La tienda con ID ${data.storeId} no existe.`);
      }

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
      const verifiedProducts: { productId: number; quantity: number; price: number, priceInSoles: number }[] = [];
      for (const detail of data.details) {

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
          quantity: detail.quantity,
          price: detail.price,
          priceInSoles: detail.priceInSoles,
        });
      }

      // Crear la entrada y los detalles
      const entry = await prisma.entry.create({
        data: {
          storeId: data.storeId,
          userId: data.userId,
          providerId: data.providerId,
          date: data.date,
          description: data.description,
          tipoMoneda: data.tipoMoneda,
          tipoCambioId: data.tipoCambioId,
          details: {
            create: verifiedProducts.map((product) => ({
              productId: product.productId,
              quantity: product.quantity,
              price: product.price,
              priceInSoles: product.priceInSoles,
            })),
          },
        },
        include: { details: true },
      });

      // Crear el comprobante si se proporcionan datos
      if (data.invoice) {
        await prisma.invoice.create({
          data: {
            entryId: entry.id,
            serie: data.invoice.serie,
            nroCorrelativo: data.invoice.nroCorrelativo,
            tipoComprobante: data.invoice.tipoComprobante,
            tipoMoneda: data.invoice.tipoMoneda,
            total: data.invoice.total,
            fechaEmision: data.invoice.fechaEmision,
          },
        });
      }

      // Asociar series a los detalles de entrada
      for (const detail of entry.details) {
        const detailData = data.details.find((d) => d.productId === detail.productId);
        if (detailData?.series && detailData.series.length > 0) {
          // Filtrar valores únicos de 'serial' para evitar duplicados
          const uniqueSeries = Array.from(new Set(detailData.series));
          try {
          await prisma.entryDetailSeries.createMany({
            data: uniqueSeries.map((serial) => ({
              entryDetailId: detail.id,
              serial,
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
          inventory = await prisma.inventory.create({
            data: {
              productId: detail.productId,
              storeId: data.storeId, // Incluye storeId al crear el registro
            },
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
          await prisma.inventoryHistory.create({
            data: {
              inventoryId: inventory.id,
              action: "update",
              stockChange: detail.quantity || 0,
              previousStock: 0,
              newStock: detail.quantity || 0,
              userId: data.userId, // Registrar el usuario que realizó el cambio
            },
          });
        } else {
          // Si existe, actualizar el stock
          await prisma.storeOnInventory.update({
            where: { id: storeInventory.id },
            data: { stock: { increment: detail.quantity || 0 } },
          });

          // Registrar el cambio en el historial
          await prisma.inventoryHistory.create({
            data: {
              inventoryId: inventory.id,
              action: "update",
              stockChange: detail.quantity || 0,
              previousStock: storeInventory.stock,
              newStock: storeInventory.stock + (detail.quantity || 0),
              userId: data.userId, // Registrar el usuario que realizó el cambio
            },
          });
        }
      }
      console.log("Entrada creada:", entry);
      return entry;
    });
    }catch (error: any) {
      console.error("Error en la transacción:", error);
      throw new BadRequestException("Ocurrió un error al procesar la entrada.");
    }
  } 
  //

  // Listar todas las entradas
  async findAllEntries() {
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
  }
  //

  // Obtener una entrada específica por ID
  async findEntryById(id: number) {
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
  }
  //

  //ELIMINAR ENTRADA
  async deleteEntry(id: number) {
    const entry = await this.prisma.entry.findUnique({
      where: { id },
      include: { details: {include: {series:true}} },
    });
  
    if (!entry) {
      throw new NotFoundException(`La entrada con ID ${id} no existe.`);
    }

    // Eliminar series asociadas
    for (const detail of entry.details) {
      await this.prisma.entryDetailSeries.deleteMany({
        where: { entryDetailId: detail.id },
      });
    }
  
    // Actualizar el inventario restando las cantidades de los productos
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
    await this.prisma.inventoryHistory.create({
      data: {
        inventoryId: storeInventory.inventoryId,
        action: "delete",
        stockChange: -detail.quantity,
        previousStock: storeInventory.stock,
        newStock: storeInventory.stock - detail.quantity,
        userId: entry.userId, // Registrar el usuario que realizó el cambio
      },
    });
  }
  
    // Eliminar la entrada
    return this.prisma.entry.delete({ where: { id } });
  }
  //

  // ELIMINAR ENTRADAS
  async deleteEntries(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No se proporcionaron IDs válidos para eliminar.');
    }

    // Obtener las entradas con sus detalles
    const entries = await this.prisma.entry.findMany({
      where: { id: { in: ids } },
      include: { details: {include:{series: true}} },
    });

    if (entries.length === 0) {
      throw new NotFoundException('No se encontraron entradas con los IDs proporcionados.');
    }

    // Actualizar el inventario restando las cantidades de los productos
    for (const entry of entries) {

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
        await this.prisma.inventoryHistory.create({
          data: {
            inventoryId: storeInventory.inventoryId,
            action: "delete",
            stockChange: -detail.quantity,
            previousStock: storeInventory.stock,
            newStock: storeInventory.stock - detail.quantity,
            userId: entry.userId, // Registrar el usuario que realizó el cambio
          },
        });
      }
    }

    // Eliminar las entradas
    const deletedEntries = await this.prisma.entry.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      message: `${deletedEntries.count} entrada(s) eliminada(s) correctamente.`,
    };
  }
  //

  // Obtener todas las entradas de una tienda específica
  async findAllByStore(storeId: number) {
    // Verificar que la tienda exista
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
    }

    return this.prisma.entry.findMany({
      where: { storeId },
      include: { details: true, provider: true, user: true },
    });
  }
  //

  async findRecentEntries(limit: number) {
    try {
      const details = await this.prisma.entryDetail.findMany({
        where: { inventoryId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: limit * 3,
        include: {
          product: { include: { category: true } },
          inventory: { include: { storeOnInventory: true } },
        },
      })

      const result: any[] = []
      for (const d of details) {
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
    const entry = await this.prisma.entry.findUnique({ where: { id: entryId } });
  
    if (!entry) {
      throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
    }
  
    return this.prisma.entry.update({
      where: { id: entryId },
      data: { pdfUrl },
    });
  }

  // Actualizar una entrada con un PDF_GUIA
  async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
    const entry = await this.prisma.entry.findUnique({ where: { id: entryId } });
  
    if (!entry) {
      throw new NotFoundException(`La entrada con ID ${entryId} no existe.`);
    }
  
    return this.prisma.entry.update({
      where: { id: entryId },
      data: { guiaUrl },
    });
  }
}
