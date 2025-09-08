import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class KeywordsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const brands = await this.prisma.brand.findMany({
      select: { name: true, logoSvg: true, logoPng: true },
    });
    return brands.map((b) => ({
      keyword: b.name,
      logoUrl: b.logoSvg || b.logoPng,
    }));
  }
}
