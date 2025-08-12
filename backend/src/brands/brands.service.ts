import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ActivityService } from 'src/activity/activity.service';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  private normalizeName(name: string) {
    return name.trim().toUpperCase();
  }

  async create(createBrandDto: CreateBrandDto, req: Request) {
    const name = this.normalizeName(createBrandDto.name);
    const brand = await this.prisma.brand.create({
      data: { ...createBrandDto, name },
    });
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Brand',
        entityId: brand.id.toString(),
        action: AuditAction.CREATED,
        summary: `Marca ${brand.name} creada`,
        diff: { after: brand } as any,
      },
      req,
    );
    return brand;
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

  async update(id: number, updateBrandDto: UpdateBrandDto, req: Request) {
    const before = await this.findOne(id);
    const data = updateBrandDto.name
      ? { ...updateBrandDto, name: this.normalizeName(updateBrandDto.name) }
      : updateBrandDto;
    const updated = await this.prisma.brand.update({ where: { id }, data });
    const diff: any = { before: {}, after: {} };
    for (const key of Object.keys(updated)) {
      if (JSON.stringify((before as any)[key]) !== JSON.stringify((updated as any)[key])) {
        diff.before[key] = (before as any)[key];
        diff.after[key] = (updated as any)[key];
      }
    }
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Brand',
        entityId: updated.id.toString(),
        action: AuditAction.UPDATED,
        summary: `Marca ${updated.name} actualizada`,
        diff,
      },
      req,
    );
    return updated;
  }

  async remove(id: number, req: Request) {
    const removed = await this.prisma.brand.delete({ where: { id } });
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Brand',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Marca ${removed.name} eliminada`,
        diff: { before: removed } as any,
      },
      req,
    );
    return removed;
  }
}