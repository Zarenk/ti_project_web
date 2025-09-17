import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJournalDto } from './dto/create-journal.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { endOfDay, startOfDay } from 'date-fns';

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
  private journals: Journal[] = [];
  constructor(private prisma: PrismaService) {}

  create(dto: CreateJournalDto): Journal {
    const journal: Journal = {
      id: (this.journals.length + 1).toString(),
      ...dto,
    };
    this.journals.push(journal);
    return journal;
  }

  update(id: string, dto: CreateJournalDto): Journal {
    const index = this.journals.findIndex((j) => j.id === id);
    if (index === -1) {
      throw new NotFoundException('Journal not found');
    }
    const updated: Journal = { id, ...dto };
    this.journals[index] = updated;
    return updated;
  }

  remove(id: string): void {
    this.journals = this.journals.filter((j) => j.id !== id);
  }

  async findAll(): Promise<Journal[]> {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    const [sales, inventory, entryDetails] = await Promise.all([
      this.prisma.sales.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.inventoryHistory.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { inventory: { include: { product: true } } },
      }),
      this.prisma.entryDetail.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          inventoryId: { not: null },
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

    const manualToday = this.journals.filter((j) => {
      const d = new Date(j.date);
      return d >= start && d <= end;
    });

    return [...inventoryEntries, ...saleEntries, ...manualToday];
  }
}
