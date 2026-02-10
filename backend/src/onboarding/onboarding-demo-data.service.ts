import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SaleSource, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DemoIndustry = 'retail' | 'services' | 'manufacturing' | 'other';

interface DemoProduct {
  name: string;
  description: string;
  price: number;
  images?: string[];
}

interface DemoClient {
  name: string;
  email?: string;
  phone?: string;
}

interface DemoDataset {
  categoryName: string;
  categoryDescription: string;
  products: DemoProduct[];
  clients: DemoClient[];
}

interface ProductSeedRecord {
  productId: number;
  name: string;
  price: number;
  inventoryId: number;
  storeOnInventoryId: number;
  initialStock: number;
}

@Injectable()
export class OnboardingDemoDataService {
  private readonly logger = new Logger(OnboardingDemoDataService.name);
  private readonly demoSalePrefix = 'demo-sale';

  private readonly datasets: Record<DemoIndustry, DemoDataset> = {
    retail: {
      categoryName: 'Demo Retail',
      categoryDescription: 'Artículos de ejemplo para retail.',
      products: [
        {
          name: 'Laptop Demo Ultrabook',
          description: 'Equipo ligero con procesador i5 y 8GB de RAM.',
          price: 4200,
          images: ['/demo/laptop.png'],
        },
        {
          name: 'Monitor Demo 27"',
          description: 'Monitor IPS 27 pulgadas Full HD.',
          price: 980,
          images: ['/demo/monitor.png'],
        },
        {
          name: 'Headset Demo Inalámbrico',
          description: 'Audífonos bluetooth con cancelación de ruido.',
          price: 520,
        },
      ],
      clients: [
        {
          name: 'Inversiones Demo SAC',
          email: 'compras@demo-sac.com',
          phone: '999123456',
        },
        {
          name: 'Retail Partners Demo',
          email: 'retail@partners.com',
          phone: '999654321',
        },
      ],
    },
    services: {
      categoryName: 'Demo Servicios',
      categoryDescription: 'Equipamiento para empresas de servicios.',
      products: [
        {
          name: 'Servidor Demo 2U',
          description: 'Servidor rack 2U con redundancia básica.',
          price: 6800,
        },
        {
          name: 'Router Demo Empresarial',
          description: 'Router VPN con soporte multi-sede.',
          price: 1450,
        },
      ],
      clients: [
        { name: 'Consultora Demo', email: 'contacto@consultorademo.com' },
        { name: 'Servicios Integrados Demo', email: 'ventas@sidemo.com' },
      ],
    },
    manufacturing: {
      categoryName: 'Demo Manufactura',
      categoryDescription: 'Herramientas y suministros base.',
      products: [
        {
          name: 'Kit Demo Herramientas',
          description: 'Kit mixto con herramientas eléctricas.',
          price: 1850,
        },
        {
          name: 'Componentes Demo Industriales',
          description: 'Pack de componentes para máquinas CNC.',
          price: 2300,
        },
      ],
      clients: [
        { name: 'MaqPeru Demo', email: 'compras@maqperu.demo' },
        { name: 'Metales Demo SAC', email: 'ventas@metales-demo.com' },
      ],
    },
    other: {
      categoryName: 'Demo General',
      categoryDescription: 'Catálogo genérico de demostración.',
      products: [
        {
          name: 'Producto Demo A',
          description: 'Ejemplo genérico A.',
          price: 300,
        },
        {
          name: 'Producto Demo B',
          description: 'Ejemplo genérico B.',
          price: 650,
        },
      ],
      clients: [{ name: 'Cliente Demo', email: 'demo@example.com' }],
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async seedDemoData(
    organizationId: number,
    rawIndustry?: string,
  ): Promise<{
    products: number;
    clients: number;
    industry: DemoIndustry;
    sales: number;
  }> {
    const industry = this.normalizeIndustry(rawIndustry);
    const dataset = this.datasets[industry];
    const company = await this.prisma.company.findFirst({
      where: { organizationId },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const companyId = company?.id ?? null;
    const store = await this.ensureDemoStore(organizationId, companyId);
    const actorUserId = await this.findDemoActorUserId(organizationId);

    const category = await this.prisma.category.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: dataset.categoryName,
        },
      },
      update: {
        description: dataset.categoryDescription,
        isDemo: true,
      },
      create: {
        name: dataset.categoryName,
        description: dataset.categoryDescription,
        organizationId,
        companyId,
        status: 'ACTIVE',
        isDemo: true,
      },
    });

    let productsCreated = 0;
    const productRecords: ProductSeedRecord[] = [];
    for (const [index, product] of dataset.products.entries()) {
      try {
        const created = await this.prisma.product.create({
          data: {
            name: `${product.name} Demo ${index + 1}`,
            description: product.description,
            price: product.price,
            priceSell: product.price,
            status: 'ACTIVE',
            images: product.images ?? [],
            organizationId,
            companyId,
            categoryId: category.id,
            isDemo: true,
          },
        });
        productsCreated += 1;

        const inventoryInfo = await this.ensureInventoryRecord(
          created.id,
          store.id,
          organizationId,
          20 + index * 5,
        );
        productRecords.push({
          productId: created.id,
          name: created.name,
          price: created.priceSell ?? created.price,
          inventoryId: inventoryInfo.inventoryId,
          storeOnInventoryId: inventoryInfo.storeOnInventoryId,
          initialStock: inventoryInfo.stock,
        });

        if (actorUserId) {
          await this.createInventoryHistory({
            inventoryId: inventoryInfo.inventoryId,
            userId: actorUserId,
            organizationId,
            companyId,
            change: inventoryInfo.stock,
            previousStock: 0,
            newStock: inventoryInfo.stock,
            description: 'Stock demo inicial',
            action: 'demo-seed',
          });
        }
      } catch (error) {
        if (!this.isUniqueConstraint(error)) {
          throw error;
        }
        this.logger.debug(
          `Producto demo omitido por duplicado (${product.name}) para la organización ${organizationId}`,
        );
      }
    }

    let clientsCreated = 0;
    const clientIds: number[] = [];
    for (const [index, client] of dataset.clients.entries()) {
      const username = this.buildSlug(
        `demo-client-${industry}-${organizationId}-${index}`,
      );
      const email = client.email ?? `${username}@demo.local`;
      try {
        const user = await this.prisma.user.create({
          data: {
            email,
            username,
            password: 'demo',
            role: UserRole.CLIENT,
            status: 'ACTIVO',
            organizationId,
            isDemo: true,
          },
        });
        const createdClient = await this.prisma.client.create({
          data: {
            userId: user.id,
            name: client.name,
            type: 'RUC',
            typeNumber: this.buildDemoRuc(organizationId, index),
            phone: client.phone ?? null,
            email,
            status: 'ACTIVO',
            organizationId,
            companyId,
            isDemo: true,
          },
        });
        clientIds.push(createdClient.id);
        clientsCreated += 1;
      } catch (error) {
        if (!this.isUniqueConstraint(error)) {
          throw error;
        }
        this.logger.debug(
          `Cliente demo omitido por duplicado (${client.name}) para la organización ${organizationId}`,
        );
      }
    }

    const salesCreated = await this.seedDemoSales({
      organizationId,
      companyId,
      storeId: store.id,
      actorUserId,
      clients: clientIds,
      productRecords,
    });

    return {
      products: productsCreated,
      clients: clientsCreated,
      industry,
      sales: salesCreated,
    };
  }

  async clearDemoData(organizationId: number): Promise<void> {
    const demoClients = await this.prisma.client.findMany({
      where: { organizationId, isDemo: true },
      select: { userId: true },
    });
    const demoUserIds = demoClients
      .map((client) => client.userId)
      .filter(Boolean);
    const salePrefix = this.buildDemoSalePrefix(organizationId);
    const demoSales = await this.prisma.sales.findMany({
      where: {
        organizationId,
        referenceId: { startsWith: salePrefix },
      },
      select: { id: true },
    });
    const saleIds = demoSales.map((sale) => sale.id);

    await this.prisma.$transaction([
      this.prisma.inventoryHistory.deleteMany({
        where: {
          inventory: {
            product: { organizationId, isDemo: true },
          },
        },
      }),
      this.prisma.storeOnInventory.deleteMany({
        where: {
          inventory: {
            product: { organizationId, isDemo: true },
          },
        },
      }),
      this.prisma.salePayment.deleteMany({
        where: {
          salesId: { in: saleIds },
        },
      }),
      this.prisma.salesDetail.deleteMany({
        where: {
          salesId: { in: saleIds },
        },
      }),
      this.prisma.invoiceSales.deleteMany({
        where: {
          salesId: { in: saleIds },
        },
      }),
      this.prisma.sales.deleteMany({
        where: {
          id: { in: saleIds },
        },
      }),
      this.prisma.client.deleteMany({
        where: { organizationId, isDemo: true },
      }),
      this.prisma.product.deleteMany({
        where: { organizationId, isDemo: true },
      }),
      this.prisma.category.deleteMany({
        where: { organizationId, isDemo: true },
      }),
      this.prisma.user.deleteMany({
        where: {
          id: { in: demoUserIds },
          isDemo: true,
        },
      }),
      this.prisma.inventory.deleteMany({
        where: { organizationId, product: { isDemo: true } },
      }),
      this.prisma.store.deleteMany({
        where: { organizationId, name: { startsWith: 'Demo Store ' } },
      }),
    ]);
  }

  private async seedDemoSales(params: {
    organizationId: number;
    companyId: number | null;
    storeId: number;
    actorUserId: number | null;
    clients: number[];
    productRecords: ProductSeedRecord[];
  }): Promise<number> {
    if (
      !params.actorUserId ||
      params.clients.length === 0 ||
      params.productRecords.length === 0
    ) {
      return 0;
    }

    const maxSales = Math.min(
      params.clients.length * 2,
      params.productRecords.length * 2,
      10,
    );
    let created = 0;
    const now = Date.now();

    for (let i = 0; i < maxSales; i++) {
      const clientId = params.clients[i % params.clients.length];
      const product = params.productRecords[i % params.productRecords.length];
      const quantity = (i % 3) + 1;
      const total = Number((product.price * quantity).toFixed(2));
      const taxableTotal = total;
      const exemptTotal = 0;
      const unaffectedTotal = 0;
      const igvTotal = Number((taxableTotal * 0.18).toFixed(2));
      const timestamp = now - i * 6 * 60 * 60 * 1000;
      const saleDate = new Date(timestamp);

      await this.prisma.sales.create({
        data: {
          userId: params.actorUserId,
          storeId: params.storeId,
          clientId,
          total,
          taxableTotal,
          exemptTotal,
          unaffectedTotal,
          igvTotal,
          description: `Venta demo de ${product.name} (x${quantity})`,
          source: SaleSource.POS,
          organizationId: params.organizationId,
          companyId: params.companyId,
          referenceId: this.buildDemoSaleReference(
            params.organizationId,
            clientId,
            i,
          ),
          createdAt: saleDate,
          updatedAt: saleDate,
        },
      });

      await this.applyInventoryConsumption({
        product,
        quantity,
        organizationId: params.organizationId,
        companyId: params.companyId,
        actorUserId: params.actorUserId,
      });

      created += 1;
    }

    return created;
  }

  private async applyInventoryConsumption(params: {
    product: ProductSeedRecord;
    quantity: number;
    organizationId: number;
    companyId: number | null;
    actorUserId: number;
  }) {
    if (!params.actorUserId) return;
    const storeInventory = await this.prisma.storeOnInventory.findUnique({
      where: { id: params.product.storeOnInventoryId },
      select: { stock: true },
    });
    const previousStock = storeInventory?.stock ?? params.product.initialStock;
    const newStock = Math.max(0, previousStock - params.quantity);

    await this.prisma.storeOnInventory.update({
      where: { id: params.product.storeOnInventoryId },
      data: {
        stock: newStock,
        updatedAt: new Date(),
      },
    });

    await this.createInventoryHistory({
      inventoryId: params.product.inventoryId,
      userId: params.actorUserId,
      organizationId: params.organizationId,
      companyId: params.companyId,
      change: -params.quantity,
      previousStock,
      newStock,
      description: 'Venta demo generada automáticamente',
      action: 'demo-sale',
    });
  }

  private async createInventoryHistory(params: {
    inventoryId: number;
    userId: number | null;
    organizationId: number;
    companyId: number | null;
    change: number;
    previousStock: number | null;
    newStock: number | null;
    description: string;
    action: string;
  }) {
    if (!params.userId) return;
    await this.prisma.inventoryHistory.create({
      data: {
        inventoryId: params.inventoryId,
        userId: params.userId,
        action: params.action,
        description: params.description,
        stockChange: params.change,
        previousStock: params.previousStock,
        newStock: params.newStock,
        organizationId: params.organizationId,
        companyId: params.companyId,
      },
    });
  }

  private async findDemoActorUserId(
    organizationId: number,
  ): Promise<number | null> {
    const user = await this.prisma.user.findFirst({
      where: { organizationId },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!user) {
      this.logger.warn(
        `No se encontró usuario para registrar datos demo en la organización ${organizationId}`,
      );
    }
    return user?.id ?? null;
  }

  private buildDemoSalePrefix(organizationId: number): string {
    return `${this.demoSalePrefix}-${organizationId}-`;
  }

  private buildDemoSaleReference(
    organizationId: number,
    clientId: number,
    index: number,
  ): string {
    return `${this.buildDemoSalePrefix(organizationId)}${clientId}-${index}-${Date.now()}`;
  }

  private normalizeIndustry(value?: string): DemoIndustry {
    if (!value) return 'retail';
    const normalized = value.toLowerCase();
    if (normalized.includes('service')) return 'services';
    if (normalized.includes('manufact')) return 'manufacturing';
    if (normalized.includes('retail') || normalized.includes('comerc')) {
      return 'retail';
    }
    return 'other';
  }

  private buildSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildDemoRuc(organizationId: number, index: number): string {
    const base = `799${organizationId.toString().padStart(4, '0')}${index}`;
    return base.slice(0, 11).padEnd(11, '0');
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async ensureDemoStore(
    organizationId: number,
    companyId: number | null,
  ) {
    const name = `Demo Store ${organizationId}`;
    return this.prisma.store.upsert({
      where: { name },
      update: {
        organizationId,
        companyId,
        status: 'ACTIVE',
      },
      create: {
        name,
        description: 'Tienda de demostración generada automáticamente.',
        status: 'ACTIVE',
        organizationId,
        companyId,
      },
    });
  }

  private async ensureInventoryRecord(
    productId: number,
    storeId: number,
    organizationId: number,
    stock: number,
  ): Promise<{
    inventoryId: number;
    storeOnInventoryId: number;
    stock: number;
  }> {
    const inventory = await this.prisma.inventory.upsert({
      where: {
        productId_storeId: {
          productId,
          storeId,
        },
      },
      update: {
        organizationId,
        updatedAt: new Date(),
      },
      create: {
        productId,
        storeId,
        organizationId,
      },
    });

    const existing = await this.prisma.storeOnInventory.findFirst({
      where: { storeId, inventoryId: inventory.id },
    });
    const storeOnInventory = existing
      ? await this.prisma.storeOnInventory.update({
          where: { id: existing.id },
          data: {
            stock,
            updatedAt: new Date(),
          },
        })
      : await this.prisma.storeOnInventory.create({
          data: {
            storeId,
            inventoryId: inventory.id,
            stock,
          },
        });

    return {
      inventoryId: inventory.id,
      storeOnInventoryId: storeOnInventory.id,
      stock,
    };
  }
}
