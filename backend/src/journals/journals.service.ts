import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJournalDto } from './dto/create-journal.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { endOfDay, startOfDay } from 'date-fns';

export interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
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

    const [sales, inventory] = await Promise.all([
      this.prisma.sales.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.inventoryHistory.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { inventory: { include: { product: true } } },
      }),
    ]);

    const saleEntries: Journal[] = sales.map((s) => ({
      id: `sale-${s.id}`,
      date: s.createdAt.toISOString(),
      description: `Venta #${s.id}`,
      amount: s.total,
    }));

    const inventoryEntries: Journal[] = (
      inventory as InventoryHistoryRecord[]
    ).map((i) => {
      const action = i.action === 'sales' ? 'Venta' : i.action;
      let description = `${action} ${i.inventory.product.name}`;

      const serial = i.serial ?? i.serie;
      if (serial) {
        description += ` Serie ${serial}`;
      }

      const quantity = i.quantity ?? i.cantidad;
      if (quantity) {
        description += ` Cantidad ${quantity}`;
      }

      return {
        id: `inv-${i.id}`,
        date: i.createdAt.toISOString(),
        description,
        amount: i.stockChange,
      };
    });

    const manualToday = this.journals.filter((j) => {
      const d = new Date(j.date);
      return d >= start && d <= end;
    });

    return [...inventoryEntries, ...saleEntries, ...manualToday];
  }
}
