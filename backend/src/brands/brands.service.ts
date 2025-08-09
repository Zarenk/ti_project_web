import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeName(name: string) {
    return name.trim().toUpperCase();
  }

  create(createBrandDto: CreateBrandDto) {
    const name = this.normalizeName(createBrandDto.name);
    return this.prisma.brand.create({
      data: { ...createBrandDto, name },
    });
  }

  async findOrCreateByName(name: string) {
    const normalized = this.normalizeName(name);
    const existing = await this.prisma.brand.findUnique({
      where: { name: normalized },
    });
    if (existing) return existing;
    return this.prisma.brand.create({ data: { name: normalized } });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.count(),
    ]);
    return { data, total };
  }

  findOne(id: number) {
    return this.prisma.brand.findUnique({ where: { id } });
  }

  update(id: number, updateBrandDto: UpdateBrandDto) {
    const data = updateBrandDto.name
      ? { ...updateBrandDto, name: this.normalizeName(updateBrandDto.name) }
      : updateBrandDto;
    return this.prisma.brand.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.brand.delete({ where: { id } });
  }
}