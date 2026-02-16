import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AccountNode {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  children?: AccountNode[];
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AccountNode[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });

    const map = new Map<number, AccountNode>();
    for (const acc of accounts) {
      map.set(acc.id, {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        parentId: acc.parentId,
        children: [],
      });
    }

    const roots: AccountNode[] = [];
    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    const clean = (node: AccountNode) => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else {
        node.children?.forEach(clean);
      }
    };

    roots.forEach(clean);
    return roots;
  }

  async create(data: {
    code: string;
    name: string;
    accountType: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
    organizationId: number;
    companyId?: number | null;
    parentId?: number | null;
  }): Promise<AccountNode> {
    const account = await this.prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        accountType: data.accountType,
        organizationId: data.organizationId,
        companyId: data.companyId ?? null,
        parentId: data.parentId ?? null,
        level: data.code.length,
        isPosting: data.code.length >= 4,
      },
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      parentId: account.parentId,
    };
  }

  async update(
    id: number,
    data: { code: string; name: string; parentId?: number | null },
  ): Promise<AccountNode> {
    const account = await this.prisma.account.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ?? null,
        level: data.code.length,
        isPosting: data.code.length >= 4,
      },
    });
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      parentId: account.parentId,
    };
  }
}
