import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ActivityService } from 'src/activity/activity.service';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { TenantContextService } from 'src/tenancy/tenant-context.service';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly tenant: TenantContextService,
  ) {}

  private normalizeName(name: string) {
    return name.trim().toUpperCase();
  }

  private orgId() {
    return this.tenant.getContext().organizationId ?? null;
  }

  private async getActorInfo(req: Request) {
    const actorId = (req as any)?.user?.userId;
    if (!actorId) return { actorId: undefined, actorEmail: undefined };
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { email: true },
    });
    return { actorId, actorEmail: user?.email };
  }

  async create(createBrandDto: CreateBrandDto, req: Request) {
    const orgId = this.orgId();
    if (orgId === null) {
      throw new BadRequestException(
        'No se puede resolver la organizacion para la marca.',
      );
    }
    const rawName = createBrandDto.name?.trim();
    if (!rawName) {
      throw new BadRequestException('El nombre de la marca es obligatorio');
    }
    const name = this.normalizeName(rawName);
    const existing = await this.prisma.brand.findFirst({
      where: { organizationId: orgId, name },
    });
    if (existing) {
      throw new ConflictException('La marca ya existe');
    }

    const brand = await this.prisma.brand.create({
      data: { ...createBrandDto, name, organizationId: orgId },
    });
    await this.prisma.keyword.create({
      data: { name: brand.name, brandId: brand.id },
    });
    const { actorId, actorEmail } = await this.getActorInfo(req);
    await this.activityService.log(
      {
        actorId,
        actorEmail,
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
    const orgId = this.orgId();
    if (orgId === null) {
      throw new BadRequestException(
        'No se puede resolver la organizacion para la marca.',
      );
    }
    const normalized = this.normalizeName(name);
    const existing = await this.prisma.brand.findFirst({
      where: { organizationId: orgId, name: normalized },
    });
    if (existing) return existing;
    const brand = await this.prisma.brand.create({
      data: { name: normalized, organizationId: orgId },
    });
    await this.prisma.keyword.create({
      data: { name: brand.name, brandId: brand.id },
    });
    return brand;
  }

  async findAll(page = 1, limit = 10) {
    const orgId = this.orgId();
    if (orgId === null) {
      throw new BadRequestException(
        'No se puede resolver la organizacion para listar marcas.',
      );
    }
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        skip,
        take: limit,
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.count({ where: { organizationId: orgId } }),
    ]);
    return { data, total };
  }

  async findOne(id: number) {
    const orgId = this.orgId();
    return this.prisma.brand.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async update(id: number, updateBrandDto: UpdateBrandDto, req: Request) {
    const orgId = this.orgId();
    const before = await this.findOne(id);
    if (!before) {
      throw new BadRequestException('La marca no pertenece a tu organizacion.');
    }

    let data: UpdateBrandDto;
    if (updateBrandDto.name !== undefined) {
      const rawName = updateBrandDto.name.trim();
      if (!rawName) {
        throw new BadRequestException('El nombre de la marca es obligatorio');
      }
      const name = this.normalizeName(rawName);
      const existing = await this.prisma.brand.findFirst({
        where: { organizationId: orgId, name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('La marca ya existe');
      }
      data = { ...updateBrandDto, name };
    } else {
      data = updateBrandDto;
    }

    const updated = await this.prisma.brand.update({ where: { id }, data });
    if (data.name && before) {
      await this.prisma.keyword.updateMany({
        where: { brandId: id, name: before.name },
        data: { name: updated.name },
      });
    }
    const { actorId, actorEmail } = await this.getActorInfo(req);
    const diff: any = { before: {}, after: {} };
    for (const key of Object.keys(updated)) {
      if (
        JSON.stringify((before as any)[key]) !==
        JSON.stringify((updated as any)[key])
      ) {
        diff.before[key] = (before as any)[key];
        diff.after[key] = (updated as any)[key];
      }
    }
    await this.activityService.log(
      {
        actorId,
        actorEmail,
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
    const orgId = this.orgId();
    const brand = await this.prisma.brand.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!brand) {
      throw new BadRequestException('La marca no pertenece a tu organizacion.');
    }
    const removed = await this.prisma.brand.delete({ where: { id } });
    const { actorId, actorEmail } = await this.getActorInfo(req);
    await this.activityService.log(
      {
        actorId,
        actorEmail,
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
