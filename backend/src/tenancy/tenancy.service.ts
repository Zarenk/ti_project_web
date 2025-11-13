import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CompanyInputDto,
  CreateTenancyDto,
  OrganizationUnitInputDto,
} from './dto/create-tenancy.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import {
  CompanySnapshot,
  StoredOrganizationUnit,
  TenancySnapshot,
  OrganizationSuperAdmin,
} from './entities/tenancy.entity';
import { TenantContext } from './tenant-context.interface';
import { resolveOrganizationId } from './organization.utils';

type MinimalUnit = Pick<
  StoredOrganizationUnit,
  'id' | 'organizationId' | 'code'
>;

export interface TenantSelectionCompany {
  id: number;
  name: string;
}

export interface TenantSelectionSummary {
  organization: { id: number; name: string } | null;
  company: TenantSelectionCompany | null;
  companies: TenantSelectionCompany[];
}

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  private async mapToSnapshot(
    prisma: PrismaService,
    organization: {
      id: number;
      name: string;
      slug: string | null;
      code: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      units: StoredOrganizationUnit[];
      companies: CompanySnapshot[];
      _count: { memberships: number };
    },
  ): Promise<TenancySnapshot> {
    const { _count, units, companies, ...rest } = organization;
    const superAdmin = await this.resolveSuperAdmin(prisma, organization.id);
    return {
      ...rest,
      units,
      companies,
      membershipCount: _count.memberships,
      superAdmin,
    };
  }

  private buildOrganizationFilter(
    tenant: TenantContext,
  ): Prisma.OrganizationWhereInput {
    if (tenant.isGlobalSuperAdmin) {
      const allowed = new Set<number>();
      for (const id of tenant.allowedOrganizationIds ?? []) {
        if (typeof id === 'number' && Number.isFinite(id)) {
          allowed.add(id);
        }
      }
      if (allowed.size === 0) {
        return {};
      }
      return { id: { in: Array.from(allowed) } };
    }

    if (tenant.isOrganizationSuperAdmin) {
      const allowed = new Set<number>();
      if (tenant.organizationId !== null) {
        allowed.add(tenant.organizationId);
      }
      for (const id of tenant.allowedOrganizationIds ?? []) {
        if (typeof id === 'number' && Number.isFinite(id)) {
          allowed.add(id);
        }
      }
      if (allowed.size === 0) {
        throw new ForbiddenException(
          'No tienes organizaciones asignadas para gestionar.',
        );
      }
      return { id: { in: Array.from(allowed) } };
    }

    throw new ForbiddenException(
      'Solo los super administradores pueden gestionar empresas.',
    );
  }

  private ensureOrganizationAccess(
    organizationId: number,
    tenant: TenantContext,
  ): void {
    if (tenant.isGlobalSuperAdmin) {
      const allowed = tenant.allowedOrganizationIds ?? [];
      if (allowed.length > 0 && !allowed.includes(organizationId)) {
        throw new ForbiddenException(
          'No tienes permisos para gestionar empresas de esta organizacion.',
        );
      }
      return;
    }

    if (tenant.isOrganizationSuperAdmin) {
      const allowed = new Set<number>();
      if (tenant.organizationId !== null) {
        allowed.add(tenant.organizationId);
      }
      for (const id of tenant.allowedOrganizationIds ?? []) {
        if (typeof id === 'number') {
          allowed.add(id);
        }
      }
      if (!allowed.has(organizationId)) {
        throw new ForbiddenException(
          'No tienes permisos para gestionar empresas de esta organizacion.',
        );
      }
      return;
    }

    throw new ForbiddenException(
      'Solo los super administradores pueden gestionar empresas.',
    );
  }

  async create(createTenancyDto: CreateTenancyDto): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;

        const organizationSlug = await this.ensureOrganizationSlug(
          prisma,
          createTenancyDto.slug,
          createTenancyDto.name,
        );

        // 1. Crear organizacion
        const organization = await prisma.organization.create({
          data: {
            name: createTenancyDto.name.trim(),
            slug: organizationSlug,
            code: this.normalizeCodeInput(createTenancyDto.code) ?? null,
            status: createTenancyDto.status ?? 'ACTIVE',
          },
        });

        // 2. Crear companies (solo UNA VEZ)
        const companies = await this.persistCompanies(
          tx,
          organization.id,
          createTenancyDto.companies ?? [],
        );

        // 3. Crear units con validacion de companyId
        const existingUnits = new Map<string, number>();
        const allowedCompanyIds = new Set<number>(companies.map((c) => c.id));

        const createdUnits = await this.persistUnits(
          tx,
          organization.id,
          createTenancyDto.units?.length
            ? createTenancyDto.units
            : [{ name: 'General' }],
          existingUnits,
          allowedCompanyIds,
        );

        const membershipCount = await prisma.organizationMembership.count({
          where: { organizationId: organization.id },
        });

        const superAdmin = await this.resolveSuperAdmin(tx, organization.id);

        return {
          ...organization,
          units: createdUnits,
          companies,
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
        companies: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
      orderBy: { id: 'asc' },
    });

    return Promise.all(
      organizations.map((organization) =>
        this.mapToSnapshot(prismaClient as PrismaService, organization),
      ),
    );
  }

  async findOne(id: number): Promise<TenancySnapshot> {
    const prismaClient = this.prisma as unknown as PrismaService as any;
    const organization = await prismaClient.organization.findUnique({
      where: { id },
      include: {
        units: { orderBy: { id: 'asc' } },
        companies: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} was not found`);
    }

    return this.mapToSnapshot(prismaClient as PrismaService, organization);
  }

  async findBySlug(slug: string): Promise<TenancySnapshot> {
    const normalizedSlug = this.slugify(slug);
    if (!normalizedSlug) {
      throw new NotFoundException('Organization not found');
    }

    const prismaClient = this.prisma as unknown as PrismaService as any;
    const organization = await prismaClient.organization.findFirst({
      where: { slug: normalizedSlug },
      include: {
        units: { orderBy: { id: 'asc' } },
        companies: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.mapToSnapshot(prismaClient as PrismaService, organization);
  }
  async update(
    id: number,
    updateTenancyDto: UpdateTenancyDto,
  ): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;
        const trimmedName = updateTenancyDto.name?.trim();

        const currentOrganization = await prisma.organization.findUnique({
          where: { id },
          select: { name: true, slug: true },
        });
        if (!currentOrganization) {
          throw new NotFoundException('Organization not found');
        }

        const effectiveName = trimmedName?.length
          ? trimmedName
          : currentOrganization.name;

        let slugValue: string | undefined;
        if (updateTenancyDto.slug !== undefined || !currentOrganization.slug) {
          slugValue = await this.ensureOrganizationSlug(
            prisma,
            updateTenancyDto.slug ?? currentOrganization.slug ?? undefined,
            effectiveName,
            id,
          );
        }

        const organization = await prisma.organization.update({
          where: { id },
          data: {
            name: trimmedName?.length ? trimmedName : undefined,
            slug: slugValue,
            code: this.normalizeCodeInput(updateTenancyDto.code),
            status: updateTenancyDto.status,
          },
        });

        // Sincronizar companies si vienen en el DTO
        if (updateTenancyDto.companies) {
          await this.syncCompanies(tx, id, updateTenancyDto.companies);
        }

        // Obtener companies actualizadas
        const companies = await prisma.company.findMany({
          where: { organizationId: id },
          orderBy: { id: 'asc' },
        });

        const allowedCompanyIds = new Set<number>(companies.map((c) => c.id));

        // Preparar mapa de units existentes
        const existingUnits = await prisma.organizationUnit.findMany({
          where: { organizationId: id },
        });

        const unitsByCode = new Map<string, number>();
        for (const unit of existingUnits) {
          if (unit.code) {
            unitsByCode.set(unit.code, unit.id);
          }
        }

        // Actualizar units si vienen en el DTO
        if (updateTenancyDto.units?.length) {
          for (const unitDto of updateTenancyDto.units) {
            await this.upsertUnit(
              tx,
              id,
              unitDto,
              unitsByCode,
              existingUnits,
              allowedCompanyIds,
            );
          }
        }

        // Obtener units actualizadas
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
          companies,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
  async createCompany(
    dto: CreateCompanyDto,
    tenant: TenantContext,
  ): Promise<CompanySnapshot> {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden crear empresas.',
      );
    }

    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('El nombre de la empresa es obligatorio.');
    }

    const organizationId = resolveOrganizationId({
      provided: dto.organizationId ?? null,
      fallbacks: [tenant.organizationId ?? null],
      mismatchError:
        'La organizacion proporcionada no coincide con el contexto actual.',
    });

    if (organizationId === null) {
      throw new BadRequestException(
        'Debes seleccionar una organizacion antes de crear empresas.',
      );
    }

    const allowedOrganizations = tenant.allowedOrganizationIds ?? [];
    if (
      allowedOrganizations.length > 0 &&
      !allowedOrganizations.includes(organizationId)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar empresas de esta organizacion.',
      );
    }

    const legalName = dto.legalName?.trim();
    const taxId = dto.taxId?.trim();
    const status = dto.status?.trim() || 'ACTIVE';
    const sunatEnvironment =
      this.normalizeSunatEnvironment(dto.sunatEnvironment) ?? 'BETA';
    const sunatRuc = this.normalizeNullableInput(dto.sunatRuc);
    const sunatBusinessName = this.normalizeNullableInput(
      dto.sunatBusinessName,
    );
    const sunatAddress = this.normalizeNullableInput(dto.sunatAddress);
    const sunatPhone = this.normalizeNullableInput(dto.sunatPhone);
    const sunatSolUserBeta = this.normalizeNullableInput(dto.sunatSolUserBeta);
    const sunatSolPasswordBeta = this.normalizeNullableInput(
      dto.sunatSolPasswordBeta,
    );
    const sunatCertPathBeta = this.normalizeNullableInput(
      dto.sunatCertPathBeta,
    );
    const sunatKeyPathBeta = this.normalizeNullableInput(dto.sunatKeyPathBeta);
    const sunatSolUserProd = this.normalizeNullableInput(dto.sunatSolUserProd);
    const sunatSolPasswordProd = this.normalizeNullableInput(
      dto.sunatSolPasswordProd,
    );
    const sunatCertPathProd = this.normalizeNullableInput(
      dto.sunatCertPathProd,
    );
    const sunatKeyPathProd = this.normalizeNullableInput(dto.sunatKeyPathProd);

    try {
      const company = await this.prisma.company.create({
        data: {
          organizationId,
          name: trimmedName,
          legalName: legalName?.length ? legalName : null,
          taxId: taxId?.length ? taxId : null,
          status,
          sunatEnvironment,
          sunatRuc: sunatRuc ?? null,
          sunatBusinessName: sunatBusinessName ?? null,
          sunatAddress: sunatAddress ?? null,
          sunatPhone: sunatPhone ?? null,
          sunatSolUserBeta: sunatSolUserBeta ?? null,
          sunatSolPasswordBeta: sunatSolPasswordBeta ?? null,
          sunatCertPathBeta: sunatCertPathBeta ?? null,
          sunatKeyPathBeta: sunatKeyPathBeta ?? null,
          sunatSolUserProd: sunatSolUserProd ?? null,
          sunatSolPasswordProd: sunatSolPasswordProd ?? null,
          sunatCertPathProd: sunatCertPathProd ?? null,
          sunatKeyPathProd: sunatKeyPathProd ?? null,
        },
      });

      return company;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target ?? []) as string[];
          if (target.includes('organizationId_name')) {
            throw new ConflictException(
              'Ya existe una empresa con ese nombre en la organizacion.',
            );
          }
          if (target.includes('taxId')) {
            throw new ConflictException(
              'Ya existe una empresa con ese RUC/NIT.',
            );
          }
          throw new ConflictException(
            'Ya existe una empresa con los mismos datos.',
          );
        }
      }
      throw error;
    }
  }

  async listCompanies(tenant: TenantContext): Promise<TenancySnapshot[]> {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden consultar empresas.',
      );
    }

    const prismaClient = this.prisma as unknown as PrismaService as any;
    const where = this.buildOrganizationFilter(tenant);

    const organizations = await prismaClient.organization.findMany({
      where,
      include: {
        units: { orderBy: { id: 'asc' } },
        companies: { orderBy: { id: 'asc' } },
        _count: { select: { memberships: true } },
      },
      orderBy: { id: 'asc' },
    });

    return Promise.all(
      organizations.map((organization) =>
        this.mapToSnapshot(prismaClient as PrismaService, organization),
      ),
    );
  }

  async getCompanyById(
    id: number,
    tenant: TenantContext,
  ): Promise<
    CompanySnapshot & {
      organization: {
        id: number;
        name: string;
        code: string | null;
        status: string;
      };
    }
  > {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden consultar empresas.',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    if (!company.organization) {
      throw new NotFoundException(
        'La empresa no esta asociada a una organizacion valida.',
      );
    }

    this.ensureOrganizationAccess(company.organizationId, tenant);

    const { organization, ...snapshot } = company;
    return {
      ...(snapshot as CompanySnapshot),
      organization,
    };
  }

  async updateCompany(
    id: number,
    dto: UpdateCompanyDto,
    tenant: TenantContext,
  ): Promise<CompanySnapshot> {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden actualizar empresas.',
      );
    }

    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureOrganizationAccess(existing.organizationId, tenant);

    const data: Prisma.CompanyUpdateInput = {};

    const sunatEnvironment = this.normalizeSunatEnvironment(
      dto.sunatEnvironment,
    );
    const sunatRuc = this.normalizeNullableInput(dto.sunatRuc);
    const sunatBusinessName = this.normalizeNullableInput(
      dto.sunatBusinessName,
    );
    const sunatAddress = this.normalizeNullableInput(dto.sunatAddress);
    const sunatPhone = this.normalizeNullableInput(dto.sunatPhone);
    const sunatSolUserBeta = this.normalizeNullableInput(dto.sunatSolUserBeta);
    const sunatSolPasswordBeta = this.normalizeNullableInput(
      dto.sunatSolPasswordBeta,
    );
    const sunatCertPathBeta = this.normalizeNullableInput(
      dto.sunatCertPathBeta,
    );
    const sunatKeyPathBeta = this.normalizeNullableInput(dto.sunatKeyPathBeta);
    const sunatSolUserProd = this.normalizeNullableInput(dto.sunatSolUserProd);
    const sunatSolPasswordProd = this.normalizeNullableInput(
      dto.sunatSolPasswordProd,
    );
    const sunatCertPathProd = this.normalizeNullableInput(
      dto.sunatCertPathProd,
    );
    const sunatKeyPathProd = this.normalizeNullableInput(dto.sunatKeyPathProd);

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException(
          'El nombre de la empresa no puede estar vacio.',
        );
      }
      data.name = trimmed;
    }

    if (dto.legalName !== undefined) {
      const trimmed = dto.legalName?.trim() ?? '';
      data.legalName = trimmed.length ? trimmed : null;
    }

    if (dto.taxId !== undefined) {
      const trimmed = dto.taxId?.trim() ?? '';
      data.taxId = trimmed.length ? trimmed : null;
    }

    if (dto.status !== undefined) {
      const trimmed = dto.status.trim();
      data.status = trimmed.length ? trimmed : existing.status;
    }

    if (sunatEnvironment !== undefined) {
      data.sunatEnvironment = sunatEnvironment;
    }
    if (dto.sunatRuc !== undefined) {
      data.sunatRuc = sunatRuc ?? null;
    }
    if (dto.sunatBusinessName !== undefined) {
      data.sunatBusinessName = sunatBusinessName ?? null;
    }
    if (dto.sunatAddress !== undefined) {
      data.sunatAddress = sunatAddress ?? null;
    }
    if (dto.sunatPhone !== undefined) {
      data.sunatPhone = sunatPhone ?? null;
    }
    if (dto.sunatSolUserBeta !== undefined) {
      data.sunatSolUserBeta = sunatSolUserBeta ?? null;
    }
    if (dto.sunatSolPasswordBeta !== undefined) {
      data.sunatSolPasswordBeta = sunatSolPasswordBeta ?? null;
    }
    if (dto.sunatCertPathBeta !== undefined) {
      data.sunatCertPathBeta = sunatCertPathBeta ?? null;
    }
    if (dto.sunatKeyPathBeta !== undefined) {
      data.sunatKeyPathBeta = sunatKeyPathBeta ?? null;
    }
    if (dto.sunatSolUserProd !== undefined) {
      data.sunatSolUserProd = sunatSolUserProd ?? null;
    }
    if (dto.sunatSolPasswordProd !== undefined) {
      data.sunatSolPasswordProd = sunatSolPasswordProd ?? null;
    }
    if (dto.sunatCertPathProd !== undefined) {
      data.sunatCertPathProd = sunatCertPathProd ?? null;
    }
    if (dto.sunatKeyPathProd !== undefined) {
      data.sunatKeyPathProd = sunatKeyPathProd ?? null;
    }

    try {
      return await this.prisma.company.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target ?? []) as string[];
          if (target.includes('organizationId_name')) {
            throw new ConflictException(
              'Ya existe una empresa con ese nombre en la organizacion.',
            );
          }
          if (target.includes('taxId')) {
            throw new ConflictException(
              'Ya existe una empresa con ese RUC/NIT.',
            );
          }
        }
      }
      throw error;
    }
  }

  async updateCompanySunatFile(
    id: number,
    input: {
      tenant: TenantContext;
      environment: 'BETA' | 'PROD';
      kind: 'cert' | 'key';
      filePath: string;
      originalName: string;
    },
  ): Promise<CompanySnapshot> {
    const { tenant, environment, kind, filePath } = input;

    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden actualizar empresas.',
      );
    }

    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureOrganizationAccess(existing.organizationId, tenant);

    const data: Prisma.CompanyUpdateInput = {};

    if (environment === 'BETA') {
      if (kind === 'cert') {
        data.sunatCertPathBeta = filePath;
      } else {
        data.sunatKeyPathBeta = filePath;
      }
    } else {
      if (kind === 'cert') {
        data.sunatCertPathProd = filePath;
      } else {
        data.sunatKeyPathProd = filePath;
      }
    }

    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async listCompanySunatTransmissions(id: number, tenant: TenantContext) {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden consultar envíos SUNAT.',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!company) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureOrganizationAccess(company.organizationId, tenant);

    return this.prisma.sunatTransmission.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
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

        await prisma.company.updateMany({
          where: { organizationId: id },
          data: { status: 'INACTIVE' },
        });

        const units = await prisma.organizationUnit.findMany({
          where: { organizationId: id },
          orderBy: { id: 'asc' },
        });

        const companies = await prisma.company.findMany({
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
          companies,
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

        const companies = await prisma.company.findMany({
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
          companies,
          membershipCount,
          superAdmin,
        };
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  async resolveTenantSelection(
    context: TenantContext,
  ): Promise<TenantSelectionSummary> {
    const prismaClient = this.prisma as unknown as PrismaService as any;
    const allowedOrganizationIds = context.allowedOrganizationIds ?? [];
    const allowedCompanyIds = context.allowedCompanyIds ?? [];

    const organizationInclude = {
      companies: {
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
      },
    };

    let organization: Awaited<
      ReturnType<(typeof prismaClient.organization)['findFirst']>
    > | null = null;

    if (context.organizationId !== null) {
      organization = await prismaClient.organization.findUnique({
        where: { id: context.organizationId },
        include: organizationInclude,
      });
    } else {
      organization = await prismaClient.organization.findFirst({
        where:
          allowedOrganizationIds.length > 0
            ? { id: { in: allowedOrganizationIds } }
            : undefined,
        include: organizationInclude,
        orderBy: { id: 'asc' },
      });
    }

    if (!organization && allowedOrganizationIds.length > 0) {
      organization = await prismaClient.organization.findFirst({
        include: organizationInclude,
        orderBy: { id: 'asc' },
        where: { id: { in: allowedOrganizationIds } },
      });
    }

    if (!organization) {
      organization = await prismaClient.organization.findFirst({
        include: organizationInclude,
        orderBy: { id: 'asc' },
      });
    }

    if (!organization) {
      return { organization: null, company: null, companies: [] };
    }

    const allowedCompanySet =
      allowedCompanyIds.length > 0 ? new Set(allowedCompanyIds) : null;

    const organizationCompanies = organization.companies ?? [];

    let filteredCompanies = organizationCompanies;
    if (
      !context.isGlobalSuperAdmin &&
      allowedCompanySet !== null &&
      allowedCompanySet.size > 0
    ) {
      filteredCompanies = filteredCompanies.filter((company) =>
        allowedCompanySet.has(company.id),
      );
    }

    if (filteredCompanies.length === 0) {
      filteredCompanies = organizationCompanies;
    }

    const companies = filteredCompanies.map((company) => ({
      id: company.id,
      name: (company.name ?? '').trim(),
    }));

    const selectedCompany =
      companies.find((company) => company.id === context.companyId) ??
      companies[0] ??
      null;

    return {
      organization: {
        id: organization.id,
        name: (organization.name ?? '').trim(),
      },
      company: selectedCompany,
      companies,
    };
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
    };
  }

  private async persistUnits(
    tx: Prisma.TransactionClient,
    organizationId: number,
    units: OrganizationUnitInputDto[],
    unitsByCode: Map<string, number>,
    allowedCompanyIds?: Set<number>,
  ): Promise<StoredOrganizationUnit[]> {
    const createdUnits: StoredOrganizationUnit[] = [];
    const prisma = tx as unknown as PrismaService as any;

    for (const unit of units) {
      if (!unit.name) {
        throw new BadRequestException('Organization units must include a name');
      }

      const parentId = this.resolveParentId(unit, unitsByCode);

      // Validar companyId si está presente
      if (unit.companyId !== undefined && unit.companyId !== null) {
        await this.assertCompanyBelongsToOrganization(
          prisma,
          organizationId,
          unit.companyId,
        );
      }

      const created = await prisma.organizationUnit.create({
        data: {
          organizationId,
          name: unit.name.trim(),
          code: this.normalizeCodeInput(unit.code) ?? null,
          companyId: unit.companyId ?? null,
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

  private async persistCompanies(
    tx: Prisma.TransactionClient,
    organizationId: number,
    companies: CompanyInputDto[],
  ): Promise<CompanySnapshot[]> {
    if (!companies.length) {
      return [];
    }

    const prisma = tx as unknown as PrismaService as any;
    const createdCompanies: CompanySnapshot[] = [];
    const seenNames = new Set<string>();

    for (const company of companies) {
      const trimmedName = company.name?.trim();
      if (!trimmedName) {
        throw new BadRequestException('Las companias requieren un nombre.');
      }

      const normalizedName = trimmedName.toLowerCase();
      if (seenNames.has(normalizedName)) {
        throw new BadRequestException(
          `La compania "${trimmedName}" esta duplicada en la solicitud.`,
        );
      }
      seenNames.add(normalizedName);

      const legalName =
        company.legalName && company.legalName.trim().length > 0
          ? company.legalName.trim()
          : null;
      const taxId =
        company.taxId && company.taxId.trim().length > 0
          ? company.taxId.trim()
          : null;
      const sunatEnvironment =
        this.normalizeSunatEnvironment(company.sunatEnvironment) ?? 'BETA';
      const sunatRuc = this.normalizeNullableInput(company.sunatRuc);
      const sunatBusinessName = this.normalizeNullableInput(
        company.sunatBusinessName,
      );
      const sunatAddress = this.normalizeNullableInput(company.sunatAddress);
      const sunatPhone = this.normalizeNullableInput(company.sunatPhone);
      const sunatSolUserBeta = this.normalizeNullableInput(
        company.sunatSolUserBeta,
      );
      const sunatSolPasswordBeta = this.normalizeNullableInput(
        company.sunatSolPasswordBeta,
      );
      const sunatCertPathBeta = this.normalizeNullableInput(
        company.sunatCertPathBeta,
      );
      const sunatKeyPathBeta = this.normalizeNullableInput(
        company.sunatKeyPathBeta,
      );
      const sunatSolUserProd = this.normalizeNullableInput(
        company.sunatSolUserProd,
      );
      const sunatSolPasswordProd = this.normalizeNullableInput(
        company.sunatSolPasswordProd,
      );
      const sunatCertPathProd = this.normalizeNullableInput(
        company.sunatCertPathProd,
      );
      const sunatKeyPathProd = this.normalizeNullableInput(
        company.sunatKeyPathProd,
      );

      const created = await prisma.company.create({
        data: {
          organizationId,
          name: trimmedName,
          legalName,
          taxId,
          status: company.status ?? 'ACTIVE',
          sunatEnvironment,
          sunatRuc: sunatRuc ?? null,
          sunatBusinessName: sunatBusinessName ?? null,
          sunatAddress: sunatAddress ?? null,
          sunatPhone: sunatPhone ?? null,
          sunatSolUserBeta: sunatSolUserBeta ?? null,
          sunatSolPasswordBeta: sunatSolPasswordBeta ?? null,
          sunatCertPathBeta: sunatCertPathBeta ?? null,
          sunatKeyPathBeta: sunatKeyPathBeta ?? null,
          sunatSolUserProd: sunatSolUserProd ?? null,
          sunatSolPasswordProd: sunatSolPasswordProd ?? null,
          sunatCertPathProd: sunatCertPathProd ?? null,
          sunatKeyPathProd: sunatKeyPathProd ?? null,
        },
      });

      createdCompanies.push(created);
    }

    return createdCompanies;
  }

  private async upsertUnit(
    tx: Prisma.TransactionClient,
    organizationId: number,
    unitDto: OrganizationUnitInputDto,
    unitsByCode: Map<string, number>,
    existingUnits: MinimalUnit[],
    allowedCompanyIds?: Set<number>,
  ) {
    const prisma = tx as unknown as PrismaService as any;

    if (unitDto.id) {
      // Actualizar unit existente
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

      // Validar companyId si está presente
      if (unitDto.companyId !== undefined && unitDto.companyId !== null) {
        await this.assertCompanyBelongsToOrganization(
          prisma,
          organizationId,
          unitDto.companyId,
        );
      }

      const updated = await prisma.organizationUnit.update({
        where: { id: unitDto.id },
        data: {
          name: unitDto.name?.trim(),
          code: this.normalizeCodeInput(unitDto.code),
          companyId: unitDto.companyId ?? undefined,
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

    // Crear nueva unit
    if (!unitDto.name) {
      throw new BadRequestException('New organization units require a name');
    }

    const created = await this.persistUnits(
      tx,
      organizationId,
      [unitDto],
      unitsByCode,
      allowedCompanyIds,
    );

    existingUnits.push(
      ...created.map<MinimalUnit>((unit) => ({
        id: unit.id,
        organizationId,
        code: unit.code,
      })),
    );
  }

  private async syncCompanies(
    tx: Prisma.TransactionClient,
    organizationId: number,
    companies: CompanyInputDto[],
  ): Promise<void> {
    if (!companies.length) {
      return;
    }

    const prisma = tx as unknown as PrismaService as any;
    const seenNames = new Set<string>();

    for (const company of companies) {
      const normalizedName = this.normalizeCompanyName(company.name);
      const nameKey = normalizedName.toLowerCase();
      if (seenNames.has(nameKey)) {
        throw new BadRequestException(
          `Duplicate company name "${normalizedName}" in payload`,
        );
      }
      seenNames.add(nameKey);

      const normalizedStatus = this.normalizeCompanyStatus(company.status);
      const legalName = this.normalizeNullableInput(company.legalName);
      const taxId = this.normalizeNullableInput(company.taxId);
      const sunatEnvironment = this.normalizeSunatEnvironment(
        company.sunatEnvironment,
      );
      const sunatRuc = this.normalizeNullableInput(company.sunatRuc);
      const sunatSolUserBeta = this.normalizeNullableInput(
        company.sunatSolUserBeta,
      );
      const sunatSolPasswordBeta = this.normalizeNullableInput(
        company.sunatSolPasswordBeta,
      );
      const sunatCertPathBeta = this.normalizeNullableInput(
        company.sunatCertPathBeta,
      );
      const sunatKeyPathBeta = this.normalizeNullableInput(
        company.sunatKeyPathBeta,
      );
      const sunatSolUserProd = this.normalizeNullableInput(
        company.sunatSolUserProd,
      );
      const sunatSolPasswordProd = this.normalizeNullableInput(
        company.sunatSolPasswordProd,
      );
      const sunatCertPathProd = this.normalizeNullableInput(
        company.sunatCertPathProd,
      );
      const sunatKeyPathProd = this.normalizeNullableInput(
        company.sunatKeyPathProd,
      );

      if (company.id) {
        // Actualizar company existente
        const existing = await prisma.company.findUnique({
          where: { id: company.id },
        });

        if (!existing || existing.organizationId !== organizationId) {
          throw new BadRequestException(
            `Company ${company.id} does not belong to organization ${organizationId}`,
          );
        }

        const updateData: Prisma.CompanyUpdateInput = {};

        if (normalizedName && normalizedName !== existing.name) {
          updateData.name = normalizedName;
        }
        if (company.legalName !== undefined) {
          updateData.legalName = legalName ?? null;
        }
        if (company.taxId !== undefined) {
          updateData.taxId = taxId ?? null;
        }
        if (normalizedStatus !== undefined) {
          updateData.status = normalizedStatus;
        }
        if (sunatEnvironment !== undefined) {
          updateData.sunatEnvironment = sunatEnvironment;
        }
        if (company.sunatRuc !== undefined) {
          updateData.sunatRuc = sunatRuc ?? null;
        }
        if (company.sunatBusinessName !== undefined) {
          updateData.sunatBusinessName = sunatBusinessName ?? null;
        }
        if (company.sunatAddress !== undefined) {
          updateData.sunatAddress = sunatAddress ?? null;
        }
        if (company.sunatPhone !== undefined) {
          updateData.sunatPhone = sunatPhone ?? null;
        }
        if (company.sunatSolUserBeta !== undefined) {
          updateData.sunatSolUserBeta = sunatSolUserBeta ?? null;
        }
        if (company.sunatSolPasswordBeta !== undefined) {
          updateData.sunatSolPasswordBeta = sunatSolPasswordBeta ?? null;
        }
        if (company.sunatCertPathBeta !== undefined) {
          updateData.sunatCertPathBeta = sunatCertPathBeta ?? null;
        }
        if (company.sunatKeyPathBeta !== undefined) {
          updateData.sunatKeyPathBeta = sunatKeyPathBeta ?? null;
        }
        if (company.sunatSolUserProd !== undefined) {
          updateData.sunatSolUserProd = sunatSolUserProd ?? null;
        }
        if (company.sunatSolPasswordProd !== undefined) {
          updateData.sunatSolPasswordProd = sunatSolPasswordProd ?? null;
        }
        if (company.sunatCertPathProd !== undefined) {
          updateData.sunatCertPathProd = sunatCertPathProd ?? null;
        }
        if (company.sunatKeyPathProd !== undefined) {
          updateData.sunatKeyPathProd = sunatKeyPathProd ?? null;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.company.update({
            where: { id: company.id },
            data: updateData,
          });
        }

        continue;
      }

      // Crear nueva company
      await prisma.company.create({
        data: {
          organizationId,
          name: normalizedName,
          legalName: legalName ?? undefined,
          taxId: taxId ?? undefined,
          status: normalizedStatus ?? 'ACTIVE',
          sunatEnvironment: sunatEnvironment ?? 'BETA',
          sunatRuc: sunatRuc ?? null,
          sunatBusinessName: sunatBusinessName ?? null,
          sunatAddress: sunatAddress ?? null,
          sunatPhone: sunatPhone ?? null,
          sunatSolUserBeta: sunatSolUserBeta ?? null,
          sunatSolPasswordBeta: sunatSolPasswordBeta ?? null,
          sunatCertPathBeta: sunatCertPathBeta ?? null,
          sunatKeyPathBeta: sunatKeyPathBeta ?? null,
          sunatSolUserProd: sunatSolUserProd ?? null,
          sunatSolPasswordProd: sunatSolPasswordProd ?? null,
          sunatCertPathProd: sunatCertPathProd ?? null,
          sunatKeyPathProd: sunatKeyPathProd ?? null,
        },
      });
    }
  }

  /**
   * Valida que una companyId pertenezca a la organización especificada
   * mediante consulta a la base de datos
   */
  private async assertCompanyBelongsToOrganization(
    prisma: any,
    organizationId: number,
    companyId: number | null | undefined,
  ): Promise<void> {
    if (companyId === undefined || companyId === null) {
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });

    if (!company || company.organizationId !== organizationId) {
      throw new BadRequestException(
        `Company ${companyId} does not belong to organization ${organizationId}`,
      );
    }
  }

  private normalizeCompanyName(value: string | undefined): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException('Company name is required');
    }
    return trimmed;
  }

  private normalizeNullableInput(
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

  private normalizeCompanyStatus(
    status: string | undefined,
  ): 'ACTIVE' | 'INACTIVE' | undefined {
    if (status === undefined) {
      return undefined;
    }

    const trimmed = status.trim().toUpperCase();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed !== 'ACTIVE' && trimmed !== 'INACTIVE') {
      throw new BadRequestException(
        `Invalid company status "${status}" provided`,
      );
    }

    return trimmed;
  }

  private normalizeSunatEnvironment(
    environment: string | null | undefined,
  ): 'BETA' | 'PROD' | undefined {
    if (environment === undefined || environment === null) {
      return undefined;
    }

    const trimmed = environment.trim().toUpperCase();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed !== 'BETA' && trimmed !== 'PROD') {
      throw new BadRequestException(
        `Invalid SUNAT environment "${environment}" provided`,
      );
    }

    return trimmed;
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

  private normalizeSlugInput(
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

  private slugify(input: string): string {
    return input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private async ensureOrganizationSlug(
    prisma: PrismaService,
    slugInput: string | null | undefined,
    fallbackName: string,
    excludeId?: number,
  ): Promise<string> {
    const normalizedInput = this.normalizeSlugInput(slugInput);
    const baseSource = normalizedInput ?? fallbackName;

    let base = this.slugify(baseSource);
    if (!base) {
      base = 'org';
    }

    let candidate = base;
    let counter = 1;

    while (true) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      counter += 1;
      const nextCandidate = this.slugify(`${base}-${counter}`);
      candidate = nextCandidate || `${base}-${counter}`;
    }
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
