import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateTenancyDto,
  OrganizationUnitInputDto,
} from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import {
  StoredOrganizationUnit,
  TenancySnapshot,
  OrganizationSuperAdmin,
} from './entities/tenancy.entity';

type MinimalUnit = Pick<
  StoredOrganizationUnit,
  'id' | 'organizationId' | 'code'
>;

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenancyDto: CreateTenancyDto): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;

        const organization = await prisma.organization.create({
          data: {
            name: createTenancyDto.name.trim(),
            code: this.normalizeCodeInput(createTenancyDto.code) ?? null,
            status: createTenancyDto.status ?? 'ACTIVE',
          },
        });

        const existingUnits = new Map<string, number>();
        const createdUnits = await this.persistUnits(
          tx,
          organization.id,
          createTenancyDto.units?.length
            ? createTenancyDto.units
            : [{ name: 'General' }],
          existingUnits,
        );

        const membershipCount = await prisma.organizationMembership.count({
          where: { organizationId: organization.id },
        });

        const superAdmin = await this.resolveSuperAdmin(
          tx,
          organization.id,
        );

        return {
          ...organization,
          units: createdUnits,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<TenancySnapshot[]> {
    const prismaClient = this.prisma as unknown as PrismaService as any;
    const organizations = await prismaClient.organization.findMany({
      include: {
        units: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
      orderBy: { id: 'asc' },
    });

    return Promise.all(
      organizations.map(async ({ _count, units, ...organization }) => ({
        ...organization,
        units,
        membershipCount: _count.memberships,
        superAdmin: await this.resolveSuperAdmin(
          prismaClient,
          organization.id,
        ),
      })),
    );
  }

  async findOne(id: number): Promise<TenancySnapshot> {
    const prismaClient = this.prisma as unknown as PrismaService as any;
    const organization = await prismaClient.organization.findUnique({
      where: { id },
      include: {
        units: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} was not found`);
    }

    const { _count, units, ...rest } = organization;
    const superAdmin = await this.resolveSuperAdmin(prismaClient, id);
    return {
      ...rest,
      units,
      membershipCount: _count.memberships,
      superAdmin,
    };
  }

  async update(
    id: number,
    updateTenancyDto: UpdateTenancyDto,
  ): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;
        const trimmedName = updateTenancyDto.name?.trim();
        const organization = await prisma.organization.update({
          where: { id },
          data: {
            name: trimmedName?.length ? trimmedName : undefined,
            code: this.normalizeCodeInput(updateTenancyDto.code),
            status: updateTenancyDto.status,
          },
        });

        const existingUnits = await prisma.organizationUnit.findMany({
          where: { organizationId: id },
        });
        const unitsByCode = new Map<string, number>();
        for (const unit of existingUnits) {
          if (unit.code) {
            unitsByCode.set(unit.code, unit.id);
          }
        }

        if (updateTenancyDto.units?.length) {
          for (const unitDto of updateTenancyDto.units) {
            await this.upsertUnit(tx, id, unitDto, unitsByCode, existingUnits);
          }
        }

        const units = await prisma.organizationUnit.findMany({
          where: { organizationId: id },
          orderBy: { id: 'asc' },
        });

        const membershipCount = await prisma.organizationMembership.count({
          where: { organizationId: id },
        });

        const superAdmin = await this.resolveSuperAdmin(tx, id);

        return {
          ...organization,
          units,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;

        const organization = await prisma.organization.update({
          where: { id },
          data: { status: 'INACTIVE' },
        });

        await prisma.organizationUnit.updateMany({
          where: { organizationId: id },
          data: { status: 'INACTIVE' },
        });

        const units = await prisma.organizationUnit.findMany({
          where: { organizationId: id },
          orderBy: { id: 'asc' },
        });

        const membershipCount = await prisma.organizationMembership.count({
          where: { organizationId: id },
        });

        const superAdmin = await this.resolveSuperAdmin(tx, id);

        return {
          ...organization,
          units,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  async assignSuperAdmin(
    organizationId: number,
    userId: number,
  ): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;

        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
        });

        if (!organization) {
          throw new NotFoundException(
            `Organization ${organizationId} was not found`,
          );
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new NotFoundException(`User ${userId} was not found`);
        }

        await prisma.organizationMembership.updateMany({
          where: { organizationId, role: 'SUPER_ADMIN' },
          data: { role: 'ADMIN', isDefault: false },
        });

        const existingMembership =
          await prisma.organizationMembership.findFirst({
            where: { organizationId, userId },
          });

        if (existingMembership) {
          await prisma.organizationMembership.update({
            where: { id: existingMembership.id },
            data: {
              role: 'SUPER_ADMIN',
              isDefault: true,
            },
          });
        } else {
          await prisma.organizationMembership.create({
            data: {
              organizationId,
              userId,
              organizationUnitId: null,
              role: 'SUPER_ADMIN',
              isDefault: true,
            },
          });
        }

        const units = await prisma.organizationUnit.findMany({
          where: { organizationId },
          orderBy: { id: 'asc' },
        });

        const membershipCount = await prisma.organizationMembership.count({
          where: { organizationId },
        });

        const superAdmin = await this.resolveSuperAdmin(tx, organizationId);

        return {
          ...organization,
          units,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  private async resolveSuperAdmin(
    prisma: Prisma.TransactionClient | PrismaService,
    organizationId: number,
  ): Promise<OrganizationSuperAdmin | null> {
    const membership = await (prisma as any).organizationMembership.findFirst({
      where: { organizationId, role: 'SUPER_ADMIN' },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (!membership?.user) {
      return null;
    }

    return {
      id: membership.user.id,
      username: membership.user.username,
      email: membership.user.email,
    }
  } 
    
  private async persistUnits(
    tx: Prisma.TransactionClient,
    organizationId: number,
    units: OrganizationUnitInputDto[],
    unitsByCode: Map<string, number>,
  ): Promise<StoredOrganizationUnit[]> {
    const createdUnits: StoredOrganizationUnit[] = [];
    const prisma = tx as unknown as PrismaService as any;

    for (const unit of units) {
      if (!unit.name) {
        throw new BadRequestException('Organization units must include a name');
      }

      const parentId = this.resolveParentId(unit, unitsByCode);

      const created = await prisma.organizationUnit.create({
        data: {
          organizationId,
          name: unit.name.trim(),
          code: this.normalizeCodeInput(unit.code) ?? null,
          parentUnitId: unit.parentUnitId ?? parentId ?? null,
          status: unit.status ?? 'ACTIVE',
        },
      });

      if (created.code) {
        unitsByCode.set(created.code, created.id);
      }
      createdUnits.push(created);
    }

    return createdUnits;
  }

  private async upsertUnit(
    tx: Prisma.TransactionClient,
    organizationId: number,
    unitDto: OrganizationUnitInputDto,
    unitsByCode: Map<string, number>,
    existingUnits: MinimalUnit[],
  ) {
    const prisma = tx as unknown as PrismaService as any;

    if (unitDto.id) {
      const current = existingUnits.find((unit) => unit.id === unitDto.id);
      if (!current || current.organizationId !== organizationId) {
        throw new BadRequestException(
          `Unit ${unitDto.id} does not belong to organization ${organizationId}`,
        );
      }

      const parentId =
        unitDto.parentUnitId ??
        (unitDto.parentCode
          ? this.resolveParentId(unitDto, unitsByCode)
          : undefined);

      const updated = await prisma.organizationUnit.update({
        where: { id: unitDto.id },
        data: {
          name: unitDto.name?.trim(),
          code: this.normalizeCodeInput(unitDto.code),
          status: unitDto.status,
          parentUnitId: parentId ?? undefined,
        },
      });

      if (current.code && current.code !== updated.code) {
        unitsByCode.delete(current.code);
      }
      if (updated.code) {
        unitsByCode.set(updated.code, updated.id);
      }

      const index = existingUnits.findIndex((unit) => unit.id === updated.id);
      existingUnits[index] = {
        id: updated.id,
        organizationId: organizationId,
        code: updated.code,
      };
      return;
    }

    if (!unitDto.name) {
      throw new BadRequestException('New organization units require a name');
    }

    const created = await this.persistUnits(
      tx,
      organizationId,
      [unitDto],
      unitsByCode,
    );
    existingUnits.push(
      ...created.map<MinimalUnit>((unit) => ({
        id: unit.id,
        organizationId,
        code: unit.code,
      })),
    );
  }

  private resolveParentId(
    unit: OrganizationUnitInputDto,
    unitsByCode: Map<string, number>,
  ): number | null {
    if (!unit.parentCode) {
      return null;
    }

    const parentId = unitsByCode.get(unit.parentCode);
    if (!parentId) {
      throw new BadRequestException(
        `Parent unit with code "${unit.parentCode}" was not found in this payload`,
      );
    }
    return parentId;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organization not found');
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Duplicate organization or unit identifier',
        );
      }
    }

    throw error;
  }

  private normalizeCodeInput(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
