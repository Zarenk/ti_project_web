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
import { ValidateCompanyDto } from './dto/validate-company.dto';
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
  businessVertical?: string | null;
}

export interface TenantSelectionSummary {
  organization: { id: number; name: string } | null;
  company: TenantSelectionCompany | null;
  companies: TenantSelectionCompany[];
}

type NormalizedSequenceInput = {
  documentType: string;
  serie: string;
  nextCorrelative: number;
  correlativeLength: number;
};

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

  private ensureCompanyAccess(
    company: { id: number; organizationId: number },
    tenant: TenantContext,
  ): void {
    if (tenant.isSuperAdmin || tenant.isOrganizationSuperAdmin) {
      this.ensureOrganizationAccess(company.organizationId, tenant);
      return;
    }

    const allowedCompanies = tenant.allowedCompanyIds ?? [];
    const allowedOrganizations = tenant.allowedOrganizationIds ?? [];

    const hasOrgConstraints = allowedOrganizations.length > 0;
    const hasCompanyConstraints = allowedCompanies.length > 0;

    const orgMatches =
      tenant.organizationId === company.organizationId ||
      allowedOrganizations.includes(company.organizationId);

    const companyMatches =
      tenant.companyId === company.id || allowedCompanies.includes(company.id);

    const orgAllowed = hasOrgConstraints
      ? orgMatches
      : tenant.organizationId === null ||
        tenant.organizationId === company.organizationId;
    const companyAllowed = hasCompanyConstraints
      ? companyMatches
      : tenant.companyId === null || tenant.companyId === company.id;

    if (!orgAllowed || !companyAllowed) {
      throw new ForbiddenException(
        'No tienes permisos para consultar o gestionar esta empresa.',
      );
    }
  }

  async create(createTenancyDto: CreateTenancyDto): Promise<TenancySnapshot> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as unknown as PrismaService as any;
        const trimmedOrgName = createTenancyDto.name?.trim() ?? '';
        if (!trimmedOrgName) {
          throw new BadRequestException('El nombre de la organizacion es obligatorio.');
        }

        const existingByName = await prisma.organization.findFirst({
          where: {
            name: { equals: trimmedOrgName, mode: 'insensitive' },
          },
        });
        if (existingByName) {
          throw new BadRequestException('Ya existe una organizacion con ese nombre.');
        }

        const organizationSlug = await this.ensureOrganizationSlug(
          prisma,
          createTenancyDto.slug,
          createTenancyDto.name,
        );

        // 1. Crear organizacion
        const organizationCode = await this.resolveOrganizationCode(
          prisma,
          createTenancyDto.code,
          createTenancyDto.name,
        );

        const organization = await prisma.organization.create({
          data: {
            name: trimmedOrgName,
            slug: organizationSlug,
            code: organizationCode ?? null,
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

        if (
          trimmedName?.length &&
          trimmedName.localeCompare(currentOrganization.name, undefined, {
            sensitivity: 'base',
          }) !== 0
        ) {
          const existingByName = await prisma.organization.findFirst({
            where: {
              name: { equals: trimmedName, mode: 'insensitive' },
              NOT: { id },
            },
          });
          if (existingByName) {
            throw new BadRequestException(
              'Ya existe una organizacion con ese nombre.',
            );
          }
        }

        let slugValue: string | undefined;
        if (updateTenancyDto.slug !== undefined || !currentOrganization.slug) {
          slugValue = await this.ensureOrganizationSlug(
            prisma,
            updateTenancyDto.slug ?? currentOrganization.slug ?? undefined,
            effectiveName,
            id,
          );
        }

        let nextCode: string | null | undefined = undefined;
        if (updateTenancyDto.code !== undefined) {
          nextCode = await this.resolveOrganizationCode(
            prisma,
            updateTenancyDto.code,
            effectiveName,
            id,
          );
        }

        const organization = await prisma.organization.update({
          where: { id },
          data: {
            name: trimmedName?.length ? trimmedName : undefined,
            slug: slugValue,
            code: nextCode,
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

    const providedOrganizationId = dto.organizationId ?? null;
    const contextOrganizationId = tenant.organizationId ?? null;
    const organizationId =
      tenant.isGlobalSuperAdmin && providedOrganizationId
        ? providedOrganizationId
        : resolveOrganizationId({
            provided: providedOrganizationId,
            fallbacks: [contextOrganizationId],
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
    const logoUrl = this.normalizeNullableInput(dto.logoUrl);
    const primaryColor = this.normalizeColorInput(
      dto.primaryColor,
      'primaryColor',
    );
    const secondaryColor = this.normalizeColorInput(
      dto.secondaryColor,
      'secondaryColor',
    );
    const defaultQuoteMargin = this.normalizeMarginInput(
      dto.defaultQuoteMargin,
    );
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
    const normalizedSequences = this.normalizeDocumentSequencesInput(
      dto.documentSequences,
    );

    if (legalName?.length) {
      const existingLegalName = await this.prisma.company.findFirst({
        where: {
          organizationId,
          legalName: { equals: legalName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existingLegalName) {
        throw new ConflictException(
          'Ya existe una empresa con esa razon social en la organizacion.',
        );
      }
    }

    if (taxId?.length) {
      const existingTaxId = await this.prisma.company.findFirst({
        where: { taxId },
        select: { id: true },
      });
      if (existingTaxId) {
        throw new ConflictException('Ya existe una empresa con ese RUC/NIT.');
      }
    }

    try {
      const company = await this.prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
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
            logoUrl: logoUrl ?? null,
            primaryColor: primaryColor ?? null,
            secondaryColor: secondaryColor ?? null,
            defaultQuoteMargin: defaultQuoteMargin ?? undefined,
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

        if (normalizedSequences) {
          await this.saveCompanySequences(tx, created.id, normalizedSequences);
        }

        return tx.company.findUnique({
          where: { id: created.id },
          include: this.buildCompanyInclude(),
        });
      });

      if (!company) {
        throw new NotFoundException('No se pudo cargar la empresa creada.');
      }

      return company as CompanySnapshot;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target ?? []) as string[];
          if (target.includes('organizationId_legalName')) {
            throw new ConflictException(
              'Ya existe una empresa con esa razon social en la organizacion.',
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

  async validateCompanyFields(
    dto: ValidateCompanyDto,
    tenant: TenantContext,
  ): Promise<{ legalNameAvailable: boolean; taxIdAvailable: boolean }> {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden validar empresas.',
      );
    }

    const providedOrganizationId = dto.organizationId ?? null;
    const contextOrganizationId = tenant.organizationId ?? null;
    const organizationId = tenant.isGlobalSuperAdmin
      ? providedOrganizationId ?? contextOrganizationId
      : resolveOrganizationId({
          provided: providedOrganizationId,
          fallbacks: [contextOrganizationId],
          mismatchError:
            'La organizacion proporcionada no coincide con el contexto actual.',
        });

    if (organizationId !== null && !Number.isFinite(organizationId)) {
      throw new BadRequestException('Organizacion invalida para la validacion.');
    }

    if (
      organizationId !== null &&
      (tenant.allowedOrganizationIds?.length ?? 0) > 0 &&
      !tenant.allowedOrganizationIds?.includes(organizationId)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar empresas de esta organizacion.',
      );
    }

    const legalName = dto.legalName?.trim() ?? '';
    const taxId = dto.taxId?.trim() ?? '';
    const companyId = dto.companyId ?? null;

    if (companyId !== null && !Number.isFinite(companyId)) {
      throw new BadRequestException('Empresa invalida para la validacion.');
    }

    let legalNameAvailable = true;
    let taxIdAvailable = true;

    try {
      if (legalName.length > 0 && organizationId !== null) {
        const existingLegalName = await this.prisma.company.findFirst({
          where: {
            organizationId,
            legalName: { equals: legalName, mode: 'insensitive' },
            ...(companyId ? { NOT: { id: companyId } } : {}),
          },
          select: { id: true },
        });
        legalNameAvailable = !existingLegalName;
      }

      if (taxId.length > 0) {
        const existingTaxId = await this.prisma.company.findFirst({
          where: {
            taxId,
            ...(companyId ? { NOT: { id: companyId } } : {}),
          },
          select: { id: true },
        });
        taxIdAvailable = !existingTaxId;
      }
    } catch (error) {
      throw new BadRequestException(
        'No se pudo validar la empresa. Verifica los datos enviados.',
      );
    }

    return { legalNameAvailable, taxIdAvailable };
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
        companies: {
          orderBy: { id: 'asc' },
          include: {
            documentSequences: { orderBy: { documentType: 'asc' } },
          },
        },
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
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: this.buildCompanyInclude({ organization: true }),
    });

    if (!company) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    if (!company.organization) {
      throw new NotFoundException(
        'La empresa no esta asociada a una organizacion valida.',
      );
    }

    this.ensureCompanyAccess(
      { id: company.id, organizationId: company.organizationId },
      tenant,
    );

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
    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureCompanyAccess(
      { id: existing.id, organizationId: existing.organizationId },
      tenant,
    );

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
    const logoUrl = this.normalizeNullableInput(dto.logoUrl);
    const primaryColor = this.normalizeColorInput(
      dto.primaryColor,
      'primaryColor',
    );
    const secondaryColor = this.normalizeColorInput(
      dto.secondaryColor,
      'secondaryColor',
    );
    const defaultQuoteMargin = this.normalizeMarginInput(
      dto.defaultQuoteMargin,
    );
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
    const normalizedSequences = this.normalizeDocumentSequencesInput(
      dto.documentSequences,
    );

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException(
          'El nombre de la empresa no puede estar vacio.',
        );
      }
      data.name = trimmed;
    }

    const nextLegalNameInput =
      dto.legalName !== undefined ? (dto.legalName?.trim() ?? '') : undefined;
    if (nextLegalNameInput !== undefined) {
      data.legalName = nextLegalNameInput.length ? nextLegalNameInput : null;
    }

    const nextTaxIdInput =
      dto.taxId !== undefined ? (dto.taxId?.trim() ?? '') : undefined;
    if (nextTaxIdInput !== undefined) {
      data.taxId = nextTaxIdInput.length ? nextTaxIdInput : null;
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
    if (dto.logoUrl !== undefined) {
      data.logoUrl = logoUrl ?? null;
    }
    if (dto.primaryColor !== undefined) {
      data.primaryColor = primaryColor ?? null;
    }
    if (dto.secondaryColor !== undefined) {
      data.secondaryColor = secondaryColor ?? null;
    }
    if (dto.defaultQuoteMargin !== undefined) {
      data.defaultQuoteMargin =
        defaultQuoteMargin ?? existing.defaultQuoteMargin;
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

    if (nextLegalNameInput !== undefined) {
      const nextLegalName =
        nextLegalNameInput.length > 0 ? nextLegalNameInput : null;
      const currentLegalName = existing.legalName?.trim() ?? null;
      if (
        nextLegalName &&
        nextLegalName.localeCompare(currentLegalName ?? '', undefined, {
          sensitivity: 'accent',
        }) !== 0
      ) {
        const existingLegalName = await this.prisma.company.findFirst({
          where: {
            organizationId: existing.organizationId,
            legalName: { equals: nextLegalName, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
          select: { id: true },
        });
        if (existingLegalName) {
          throw new ConflictException(
            'Ya existe una empresa con esa razon social en la organizacion.',
          );
        }
      }
    }

    if (nextTaxIdInput !== undefined) {
      const nextTaxId = nextTaxIdInput.length > 0 ? nextTaxIdInput : null;
      if (nextTaxId && nextTaxId !== existing.taxId) {
        const existingTaxId = await this.prisma.company.findFirst({
          where: {
            taxId: nextTaxId,
            NOT: { id: existing.id },
          },
          select: { id: true },
        });
        if (existingTaxId) {
          throw new ConflictException('Ya existe una empresa con ese RUC/NIT.');
        }
      }
    }

    try {
      const updatedCompany = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.company.update({
          where: { id },
          data,
        });

        if (normalizedSequences) {
          await this.saveCompanySequences(tx, updated.id, normalizedSequences);
        }

        return tx.company.findUnique({
          where: { id },
          include: this.buildCompanyInclude(),
        });
      });

      if (!updatedCompany) {
        throw new NotFoundException('La empresa actualizada no existe.');
      }

      return updatedCompany as CompanySnapshot;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target ?? []) as string[];
          if (target.includes('organizationId_legalName')) {
            throw new ConflictException(
              'Ya existe una empresa con esa razon social en la organizacion.',
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

  async validateOrganizationName(
    name: string,
    excludeId?: number | null,
  ): Promise<{ nameAvailable: boolean }> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { nameAvailable: true };
    }
    const existing = await this.prisma.organization.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    return { nameAvailable: !existing };
  }

  async updateCompanyLogo(
    id: number,
    input: {
      tenant: TenantContext;
      filePath: string;
      originalName?: string;
    },
  ): Promise<CompanySnapshot> {
    const { tenant, filePath } = input;

    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureCompanyAccess(
      { id: existing.id, organizationId: existing.organizationId },
      tenant,
    );

    return this.prisma.company.update({
      where: { id },
      data: {
        logoUrl: filePath,
      },
      include: this.buildCompanyInclude(),
    });
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

    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`La empresa ${id} no existe.`);
    }

    this.ensureCompanyAccess(
      { id: existing.id, organizationId: existing.organizationId },
      tenant,
    );

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
      include: this.buildCompanyInclude(),
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

        const previousSuperAdmins =
          await prisma.organizationMembership.findMany({
            where: { organizationId, role: 'SUPER_ADMIN' },
            select: { userId: true },
          });

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

        await this.promoteUserToOrganizationSuperAdmin(prisma, userId);

        const demotedUserIds = previousSuperAdmins
          .map((entry) => entry.userId)
          .filter(
            (previousId): previousId is number =>
              typeof previousId === 'number' &&
              Number.isFinite(previousId) &&
              previousId !== userId,
          );

        for (const demotedUserId of demotedUserIds) {
          await this.maybeDemoteOrganizationSuperAdmin(prisma, demotedUserId);
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
    let allowedOrganizationIds = (context.allowedOrganizationIds ?? []).filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id),
    );
    const allowedCompanyIds = context.allowedCompanyIds ?? [];

    if (
      allowedOrganizationIds.length === 0 &&
      context.userId !== null &&
      !context.isGlobalSuperAdmin
    ) {
      const memberships = await prismaClient.organizationMembership.findMany({
        where: { userId: context.userId },
        select: { organizationId: true },
      });
      const membershipIds = new Set<number>();
      for (const membership of memberships) {
        if (
          typeof membership.organizationId === 'number' &&
          Number.isFinite(membership.organizationId)
        ) {
          membershipIds.add(membership.organizationId);
        }
      }
      if (membershipIds.size > 0) {
        allowedOrganizationIds = Array.from(membershipIds).sort(
          (a, b) => a - b,
        );
      }
    }

    const organizationInclude = {
      companies: {
        orderBy: { id: 'asc' },
        select: { id: true, name: true, businessVertical: true },
      },
    };

    let organization: Awaited<
      ReturnType<(typeof prismaClient.organization)['findFirst']>
    > | null = null;

    const hasOrgRestrictions =
      !context.isGlobalSuperAdmin && allowedOrganizationIds.length > 0;
    const requestedOrganizationId =
      context.organizationId !== null &&
      (!hasOrgRestrictions ||
        allowedOrganizationIds.includes(context.organizationId))
        ? context.organizationId
        : null;

    if (requestedOrganizationId !== null) {
      organization = await prismaClient.organization.findUnique({
        where: { id: requestedOrganizationId },
        include: organizationInclude,
      });
    } else {
      organization = await prismaClient.organization.findFirst({
        where: hasOrgRestrictions
          ? { id: { in: allowedOrganizationIds } }
          : undefined,
        include: organizationInclude,
        orderBy: { id: 'asc' },
      });
    }

    if (!organization && hasOrgRestrictions) {
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

    if (!organization && context.userId !== null) {
      const membershipWithOrg =
        await prismaClient.organizationMembership.findFirst({
          where: { userId: context.userId },
          orderBy: { createdAt: 'asc' },
          include: {
            organization: {
              include: organizationInclude,
            },
          },
        });
      organization = membershipWithOrg?.organization ?? null;
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
      businessVertical: company.businessVertical ?? null,
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
    const client = prisma as Prisma.TransactionClient;

    const membership = await client.organizationMembership.findFirst({
      where: { organizationId, role: 'SUPER_ADMIN' },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (membership?.user) {
      return {
        id: membership.user.id,
        username: membership.user.username,
        email: membership.user.email,
      };
    }

    const ownerMembership = await client.organizationMembership.findFirst({
      where: { organizationId, role: 'OWNER' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { id: 'asc' },
    });

    if (!ownerMembership?.user) {
      return null;
    }

    await client.organizationMembership.update({
      where: { id: ownerMembership.id },
      data: { role: 'SUPER_ADMIN' },
    });
    await this.promoteUserToOrganizationSuperAdmin(
      prisma,
      ownerMembership.user.id,
    );

    return {
      id: ownerMembership.user.id,
      username: ownerMembership.user.username,
      email: ownerMembership.user.email,
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
    const seenLegalNames = new Set<string>();
    const seenTaxIds = new Set<string>();

    for (const company of companies) {
      const trimmedName = company.name?.trim();
      if (!trimmedName) {
        throw new BadRequestException('Las companias requieren un nombre.');
      }

      const legalName =
        company.legalName && company.legalName.trim().length > 0
          ? company.legalName.trim()
          : null;
      const taxId =
        company.taxId && company.taxId.trim().length > 0
          ? company.taxId.trim()
          : null;
      const legalNameKey = legalName?.toLowerCase();
      if (legalNameKey) {
        if (seenLegalNames.has(legalNameKey)) {
          throw new BadRequestException(
            `La razon social "${legalName}" esta duplicada en la solicitud.`,
          );
        }
        seenLegalNames.add(legalNameKey);
      }
      if (taxId) {
        if (seenTaxIds.has(taxId)) {
          throw new BadRequestException(
            `El RUC/NIT "${taxId}" esta duplicado en la solicitud.`,
          );
        }
        seenTaxIds.add(taxId);
      }
      const sunatEnvironment =
        this.normalizeSunatEnvironment(company.sunatEnvironment) ?? 'BETA';
      const sunatRuc = this.normalizeNullableInput(company.sunatRuc);
      const sunatBusinessName = this.normalizeNullableInput(
        company.sunatBusinessName,
      );
      const sunatAddress = this.normalizeNullableInput(company.sunatAddress);
      const sunatPhone = this.normalizeNullableInput(company.sunatPhone);
      const logoUrl = this.normalizeNullableInput(company.logoUrl);
      const primaryColor = this.normalizeColorInput(
        company.primaryColor,
        'primaryColor',
      );
      const secondaryColor = this.normalizeColorInput(
        company.secondaryColor,
        'secondaryColor',
      );
      const defaultQuoteMargin = this.normalizeMarginInput(
        company.defaultQuoteMargin,
      );
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

      const businessVertical = company.businessVertical ?? 'GENERAL';
      const created = await prisma.company.create({
        data: {
          organizationId,
          name: trimmedName,
          legalName,
          taxId,
          businessVertical,
          status: company.status ?? 'ACTIVE',
          sunatEnvironment,
          sunatRuc: sunatRuc ?? null,
          sunatBusinessName: sunatBusinessName ?? null,
          sunatAddress: sunatAddress ?? null,
          sunatPhone: sunatPhone ?? null,
          logoUrl: logoUrl ?? null,
          primaryColor: primaryColor ?? null,
          secondaryColor: secondaryColor ?? null,
          defaultQuoteMargin: defaultQuoteMargin ?? undefined,
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
    const seenLegalNames = new Set<string>();
    const seenTaxIds = new Set<string>();

    for (const company of companies) {
      const normalizedStatus = this.normalizeCompanyStatus(company.status);
      const normalizedName = this.normalizeCompanyName(company.name);
      const legalName = this.normalizeNullableInput(company.legalName);
      const taxId = this.normalizeNullableInput(company.taxId);
      if (legalName) {
        const legalNameKey = legalName.toLowerCase();
        if (seenLegalNames.has(legalNameKey)) {
          throw new BadRequestException(
            `Duplicate company legal name "${legalName}" in payload`,
          );
        }
        seenLegalNames.add(legalNameKey);
      }
      if (taxId) {
        if (seenTaxIds.has(taxId)) {
          throw new BadRequestException(
            `Duplicate company tax id "${taxId}" in payload`,
          );
        }
        seenTaxIds.add(taxId);
      }
      const sunatEnvironment = this.normalizeSunatEnvironment(
        company.sunatEnvironment,
      );
      const sunatRuc = this.normalizeNullableInput(company.sunatRuc);
      const sunatBusinessName = this.normalizeNullableInput(
        company.sunatBusinessName,
      );
      const sunatAddress = this.normalizeNullableInput(company.sunatAddress);
      const sunatPhone = this.normalizeNullableInput(company.sunatPhone);
      const logoUrl = this.normalizeNullableInput(company.logoUrl);
      const primaryColor = this.normalizeColorInput(
        company.primaryColor,
        'primaryColor',
      );
      const secondaryColor = this.normalizeColorInput(
        company.secondaryColor,
        'secondaryColor',
      );
      const defaultQuoteMargin = this.normalizeMarginInput(
        company.defaultQuoteMargin,
      );
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
        if (company.logoUrl !== undefined) {
          updateData.logoUrl = logoUrl ?? null;
        }
        if (company.primaryColor !== undefined) {
          updateData.primaryColor = primaryColor ?? null;
        }
        if (company.secondaryColor !== undefined) {
          updateData.secondaryColor = secondaryColor ?? null;
        }
        if (company.defaultQuoteMargin !== undefined) {
          updateData.defaultQuoteMargin =
            defaultQuoteMargin ?? existing.defaultQuoteMargin;
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
          logoUrl: logoUrl ?? null,
          primaryColor: primaryColor ?? null,
          secondaryColor: secondaryColor ?? null,
          defaultQuoteMargin: defaultQuoteMargin ?? undefined,
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

  private normalizeColorInput(
    value: string | null | undefined,
    fieldName = 'color',
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un color HEX válido.`,
      );
    }
    return normalized.toUpperCase();
  }

  private normalizeMarginInput(
    value: number | null | undefined,
  ): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      throw new BadRequestException(
        'El margen de cotización debe ser un número válido.',
      );
    }
    if (value < 0 || value > 1) {
      throw new BadRequestException(
        'El margen de cotización debe estar entre 0 y 1.',
      );
    }
    return value;
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

  private buildCompanyInclude(options?: {
    organization?: boolean;
  }): Prisma.CompanyInclude {
    const include: Prisma.CompanyInclude = {
      documentSequences: { orderBy: { documentType: 'asc' } },
    };

    if (options?.organization) {
      include.organization = {
        select: { id: true, name: true, code: true, status: true },
      };
    }

    return include;
  }

  private normalizeDocumentSequencesInput(
    sequences?: Array<{
      documentType?: string | null;
      serie?: string | null;
      nextCorrelative?: string | number | null;
      correlativeLength?: number | null;
    }> | null,
  ): NormalizedSequenceInput[] | null {
    if (!Array.isArray(sequences) || sequences.length === 0) {
      return null;
    }

    const normalized: NormalizedSequenceInput[] = [];
    const seenTypes = new Set<string>();

    for (const entry of sequences) {
      if (!entry) {
        continue;
      }

      const documentType = entry.documentType?.toString().trim().toUpperCase();
      if (!documentType) {
        throw new BadRequestException(
          'El tipo de documento de la serie es obligatorio.',
        );
      }

      const serie = entry.serie?.toString().trim().toUpperCase();
      if (!serie) {
        throw new BadRequestException(
          `La serie para el tipo de documento ${documentType} es obligatoria.`,
        );
      }

      const correlativoRaw = entry.nextCorrelative?.toString().trim();
      if (!correlativoRaw || !/^[0-9]+$/.test(correlativoRaw)) {
        throw new BadRequestException(
          `El numero correlativo inicial para ${documentType} debe contener solo digitos.`,
        );
      }

      const correlativoNumber = Number.parseInt(correlativoRaw, 10);
      if (!Number.isFinite(correlativoNumber) || correlativoNumber < 1) {
        throw new BadRequestException(
          `El numero correlativo inicial para ${documentType} debe ser mayor o igual a 1.`,
        );
      }

      if (seenTypes.has(documentType)) {
        throw new BadRequestException(
          `Solo puedes configurar una serie por tipo de documento (${documentType}).`,
        );
      }
      seenTypes.add(documentType);

      const correlativeLength = Math.max(
        Number(entry.correlativeLength ?? correlativoRaw.length) ||
          correlativoRaw.length,
        correlativoRaw.length,
        1,
      );

      normalized.push({
        documentType,
        serie,
        nextCorrelative: correlativoNumber,
        correlativeLength,
      });
    }

    return normalized.length ? normalized : null;
  }

  private async saveCompanySequences(
    prisma: PrismaService | Prisma.TransactionClient,
    companyId: number,
    sequences: NormalizedSequenceInput[],
  ): Promise<void> {
    if (!sequences.length) {
      return;
    }

    for (const sequence of sequences) {
      await prisma.companyDocumentSequence.upsert({
        where: {
          companyId_documentType: {
            companyId,
            documentType: sequence.documentType,
          },
        },
        update: {
          serie: sequence.serie,
          nextCorrelative: sequence.nextCorrelative,
          correlativeLength: sequence.correlativeLength,
        },
        create: {
          companyId,
          documentType: sequence.documentType,
          serie: sequence.serie,
          nextCorrelative: sequence.nextCorrelative,
          correlativeLength: sequence.correlativeLength,
        },
      });
    }
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

    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized.length > 0 ? normalized : null;
  }

  private async promoteUserToOrganizationSuperAdmin(
    prisma: PrismaService | Prisma.TransactionClient,
    userId: number,
  ): Promise<void> {
    const user = await (prisma as Prisma.TransactionClient).user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      return;
    }

    const normalizedRole = (user.role ?? '').toString().trim().toUpperCase();

    if (
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN_ORG' ||
      normalizedRole === 'SUPER_ADMIN'
    ) {
      return;
    }

    await (prisma as Prisma.TransactionClient).user.update({
      where: { id: userId },
      data: { role: 'SUPER_ADMIN_ORG' },
    });
  }

  private async maybeDemoteOrganizationSuperAdmin(
    prisma: PrismaService,
    userId: number,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      return;
    }

    const normalizedRole = (user.role ?? '').toString().trim().toUpperCase();

    if (normalizedRole === 'SUPER_ADMIN_GLOBAL') {
      return;
    }

    const remainingAssignments = await prisma.organizationMembership.count({
      where: { userId, role: 'SUPER_ADMIN' },
    });

    if (remainingAssignments > 0) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });
  }

  private async resolveOrganizationCode(
    prisma: PrismaService,
    codeInput: string | null | undefined,
    fallbackName: string,
    excludeId?: number,
  ): Promise<string | null> {
    const normalized = this.normalizeCodeInput(codeInput);
    if (normalized === undefined) {
      const base = this.buildOrganizationCodeBase(fallbackName);
      if (!base) {
        return null;
      }
      return this.generateOrganizationCodeFromBase(prisma, base, excludeId);
    }

    if (normalized === null) {
      return null;
    }

    await this.ensureOrganizationCodeAvailability(
      prisma,
      normalized,
      excludeId,
    );
    return normalized;
  }

  private buildOrganizationCodeBase(input: string): string | null {
    const normalized = input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();

    if (!normalized) {
      return null;
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const compact = tokens
      .map((token) => token.slice(0, 3))
      .join('')
      .slice(0, 10);

    if (compact) {
      return compact;
    }

    const fallback = normalized.replace(/\s+/g, '').slice(0, 10);
    return fallback || 'ORG';
  }

  private async generateOrganizationCodeFromBase(
    prisma: PrismaService,
    base: string,
    excludeId?: number,
  ): Promise<string> {
    let candidate = base;
    let counter = 1;

    while (true) {
      const existing = await prisma.organization.findFirst({
        where: {
          code: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      counter += 1;
      const suffix = String(counter);
      const baseLength = Math.max(3, 10 - suffix.length);
      candidate = `${base.slice(0, baseLength)}${suffix}`;
    }
  }

  private async ensureOrganizationCodeAvailability(
    prisma: PrismaService,
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await prisma.organization.findFirst({
      where: {
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'El codigo ingresado ya esta en uso por otra organizacion.',
      );
    }
  }
}
