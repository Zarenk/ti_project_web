import { Injectable, NotFoundException } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';

import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

import { CreateJournalDto } from './dto/create-journal.dto';

export interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
  series?: string[];
}

interface InventoryHistoryRecord {
  id: number;
  action: string;
  createdAt: Date;
  stockChange: number;
  inventory: { product: { name: string } };
  serial?: string;
  serie?: string;
  quantity?: number;
  cantidad?: number;
  inventoryId: number;
}

@Injectable()
export class JournalsService {
  private readonly tenantJournals = new Map<string, Journal[]>();
  constructor(private prisma: PrismaService) {}

  private getTenantKey(context: TenantContext): string {
    const orgPart = context.organizationId ?? 'none';
    const companyPart = context.companyId ?? 'none';
    return `${orgPart}:${companyPart}`;
  }

  private getTenantJournalStore(context: TenantContext): Journal[] {
    const key = this.getTenantKey(context);
    if (!this.tenantJournals.has(key)) {
      this.tenantJournals.set(key, []);
    }
    return this.tenantJournals.get(key)!;
  }

  private createJournalId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private buildTenantFilters(context: TenantContext) {
    const organizationFilter =
      context.organizationId !== null
        ? { equals: context.organizationId }
        : context.allowedOrganizationIds.length > 0
          ? { in: context.allowedOrganizationIds }
          : undefined;

    const companyFilter =
      context.companyId !== null ? { equals: context.companyId } : undefined;

    return { organizationFilter, companyFilter };
  }

  create(dto: CreateJournalDto, context: TenantContext): Journal {
    const store = this.getTenantJournalStore(context);
    const journal: Journal = {
      id: this.createJournalId(),
      ...dto,
    };
    store.push(journal);
    return journal;
  }

  update(id: string, dto: CreateJournalDto, context: TenantContext): Journal {
    const store = this.getTenantJournalStore(context);
    const index = store.findIndex((j) => j.id === id);
    if (index === -1) {
      throw new NotFoundException('Journal not found');
    }
    const updated: Journal = { id, ...dto };
    store[index] = updated;
    return updated;
  }

  remove(id: string, context: TenantContext): void {
    const store = this.getTenantJournalStore(context);
    const filtered = store.filter((j) => j.id !== id);
    const key = this.getTenantKey(context);
    this.tenantJournals.set(key, filtered);
  }

  async findAll(context: TenantContext): Promise<Journal[]> {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const { organizationFilter, companyFilter } =
      this.buildTenantFilters(context);

    const sharedFilters: Record<string, unknown> = {
      ...(organizationFilter ? { organizationId: organizationFilter } : {}),
      ...(companyFilter ? { companyId: companyFilter } : {}),
    };

    const [sales, inventory, entryDetails] = await Promise.all([
      this.prisma.sales.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(Object.keys(sharedFilters).length > 0 ? sharedFilters : {}),
        },
      }),
      this.prisma.inventoryHistory.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(Object.keys(sharedFilters).length > 0 ? sharedFilters : {}),
        },
        include: { inventory: { include: { product: true } } },
      }),
      this.prisma.entryDetail.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          inventoryId: { not: null },
          ...(organizationFilter || companyFilter
            ? {
                entry: {
                  ...(organizationFilter
                    ? { organizationId: organizationFilter }
                    : {}),
                  ...(companyFilter
                    ? {
                        store: {
                          companyId: companyFilter,
                        },
                      }
                    : {}),
                },
              }
            : {}),
        },
        include: { series: true },
      }),
    ]);

    // Indexar series por inventoryId del día
    const seriesByInventory = new Map<number, string[]>();
    for (const d of entryDetails) {
      const invId = (d as any).inventoryId as number | null;
      if (!invId) continue;
      const list = seriesByInventory.get(invId) ?? [];
      for (const s of d.series) {
        if (!list.includes(s.serial)) list.push(s.serial);
      }
      seriesByInventory.set(invId, list);
    }

    const saleEntries: Journal[] = sales.map((s) => ({
      id: `sale-${s.id}`,
      date: s.createdAt.toISOString(),
      description: `Venta #${s.id}`,
      amount: s.total,
    }));

    const inventoryEntries: Journal[] = (
      inventory as InventoryHistoryRecord[]
    ).map((i) => {
      // Construir una glosa más amigable según el tipo de movimiento
      // Regla: si hay ingreso (stockChange > 0) => "Ingreso al Inventario del Item …"
      //        si hay salida (stockChange < 0)  => "Salida del Inventario del Item …"
      //        para ventas explícitas => "Venta …"
      const lowerAction = (i.action || '').toLowerCase();
      let base: string;
      if (lowerAction === 'sales' || lowerAction === 'venta') {
        base = 'Venta';
      } else if ((i.stockChange ?? 0) > 0) {
        base = 'Ingreso al Inventario del Item';
      } else if ((i.stockChange ?? 0) < 0) {
        base = 'Salida del Inventario del Item';
      } else {
        // fallback al nombre de la acción original si no se puede inferir
        base = i.action || 'Movimiento de Inventario';
      }

      let description = `${base} ${i.inventory.product.name}`;

      // Serie (o serial) si existe
      const serial = i.serial ?? i.serie;
      if (serial) {
        description += ` Serie ${serial}`;
      }

      // Cantidad si viene informada
      const quantity = i.quantity ?? i.cantidad;
      if (quantity) {
        description += ` Cantidad ${quantity}`;
      }

      return {
        id: `inv-${i.id}`,
        date: i.createdAt.toISOString(),
        description,
        amount: i.stockChange,
        series: seriesByInventory.get(i.inventoryId) ?? undefined,
      };
    });

    const manualToday = this.getTenantJournalStore(context).filter((j) => {
      const d = new Date(j.date);
      return d >= start && d <= end;
    });

    return [...inventoryEntries, ...saleEntries, ...manualToday];
  }
}
