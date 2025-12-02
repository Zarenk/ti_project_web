import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DemoDataStatus,
  OnboardingProgress,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import {
  OnboardingStepKey,
  UpdateOnboardingStepDto,
} from './dto/update-onboarding-step.dto';
import { UpdateDemoStatusDto } from './dto/update-demo-status.dto';
import { OnboardingDemoDataService } from './onboarding-demo-data.service';

type StepField = keyof Pick<
  OnboardingProgress,
  'companyProfile' | 'storeSetup' | 'sunatSetup' | 'dataImport'
>;

interface StepState extends Prisma.JsonObject {
  completed: boolean;
  completedAt: string | null;
  updatedAt: string | null;
  data: Record<string, any> | null;
}

interface StepDefinition {
  key: OnboardingStepKey;
  field: StepField;
  order: number;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  private readonly stepDefinitions: StepDefinition[] = [
    {
      key: OnboardingStepKey.COMPANY_PROFILE,
      field: 'companyProfile',
      order: 1,
    },
    {
      key: OnboardingStepKey.STORE_SETUP,
      field: 'storeSetup',
      order: 2,
    },
    {
      key: OnboardingStepKey.SUNAT_SETUP,
      field: 'sunatSetup',
      order: 3,
    },
    {
      key: OnboardingStepKey.DATA_IMPORT,
      field: 'dataImport',
      order: 4,
    },
  ];

  private readonly stepFieldMap = this.stepDefinitions.reduce<
    Record<OnboardingStepKey, StepDefinition>
  >((acc, definition) => {
    acc[definition.key] = definition;
    return acc;
  }, {} as Record<OnboardingStepKey, StepDefinition>);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly demoDataService: OnboardingDemoDataService,
  ) {}

  async getProgressForCurrentTenant(): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    return this.ensureProgressRecord(organizationId);
  }

  async updateStep(
    dto: UpdateOnboardingStepDto,
  ): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    const definition = this.stepFieldMap[dto.step];
    if (!definition) {
      throw new BadRequestException('Paso de onboarding no soportado.');
    }

    const current = await this.ensureProgressRecord(organizationId);
    const now = new Date();
    const nowIso = now.toISOString();

    const nextState = this.mergeStepState(
      this.normalizeStepState(current[definition.field]),
      {
        completed: dto.completed,
        updatedAt: nowIso,
        data: dto.payload ?? undefined,
      },
    );

    const sideEffects = await this.applySideEffects(
      definition.key,
      dto.payload ?? null,
      organizationId,
      current,
    );

    if (dto.completed === true && !nextState.completedAt) {
      nextState.completedAt = nowIso;
    }

    const stepStates = this.buildStepStateMap(current, {
      [definition.key]: nextState,
    });
    const nextCurrentStep = this.computeNextCurrentStep(stepStates);
    const allCompleted = this.areAllStepsCompleted(stepStates);

    const updateData: Prisma.OnboardingProgressUpdateInput = {
      [definition.field]: nextState,
      currentStep: nextCurrentStep,
      ...sideEffects,
    };

    if (allCompleted && !current.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = now;
      updateData.wizardDismissedAt = now;
    } else if (!allCompleted && current.isCompleted) {
      updateData.isCompleted = false;
      updateData.completedAt = null;
      updateData.wizardDismissedAt = null;
    }

    if (dto.completed === false) {
      updateData.wizardDismissedAt = null;
    }

    return this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: updateData,
    });
  }

  async seedDemoData(industry?: string): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    const result = await this.demoDataService.seedDemoData(
      organizationId,
      industry,
    );
    return this.updateDemoStatus({
      status: DemoDataStatus.SEEDED,
      note: `seed:${result.industry}|products:${result.products}|clients:${result.clients}|sales:${result.sales}`,
    });
  }

  async updateDemoStatus(
    dto: UpdateDemoStatusDto,
  ): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    await this.ensureProgressRecord(organizationId);
    const now = new Date();
    const nowIso = now.toISOString();

    const data: Prisma.OnboardingProgressUpdateInput = {
      demoStatus: dto.status,
    };

    if (dto.status === DemoDataStatus.SEEDED) {
      data.demoSeededAt = now;
    }

    if (dto.status === DemoDataStatus.NONE) {
      data.demoClearedAt = now;
    }

    if (dto.note) {
      const progress = await this.prisma.onboardingProgress.findUnique({
        where: { organizationId },
        select: { dataImport: true },
      });
      if (progress) {
        const updatedState = this.appendHistory(
          this.mergeStepState(
            this.normalizeStepState(progress.dataImport),
            { updatedAt: nowIso },
          ),
          {
            action: 'demo-status',
            at: nowIso,
            status: dto.status,
            note: dto.note,
          },
        );
        data.dataImport = updatedState;
      }
    }

    return this.prisma.onboardingProgress.update({
      where: { organizationId },
      data,
    });
  }

  async clearDemoData(reason?: string): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    await this.demoDataService.clearDemoData(organizationId);
    return this.updateDemoStatus({
      status: DemoDataStatus.NONE,
      note: reason ?? 'clear-demo',
    });
  }

  async dismissWizardBanner(): Promise<OnboardingProgress> {
    const organizationId = this.requireOrganizationId();
    return this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: {
        wizardDismissedAt: new Date(),
      },
    });
  }

  private async applySideEffects(
    step: OnboardingStepKey,
    payload: Record<string, any> | null,
    organizationId: number,
    progress: OnboardingProgress,
  ): Promise<Partial<Prisma.OnboardingProgressUpdateInput>> {
    switch (step) {
      case OnboardingStepKey.COMPANY_PROFILE:
        await this.applyCompanyProfile(organizationId, payload);
        return {};
      case OnboardingStepKey.STORE_SETUP:
        await this.applyStoreSetup(organizationId, payload);
        return {};
      case OnboardingStepKey.SUNAT_SETUP:
        await this.applySunatSetup(organizationId, payload);
        return {};
      case OnboardingStepKey.DATA_IMPORT:
        return this.applyDataImport(organizationId, payload, progress);
      default:
        return {};
    }
  }

  private async applyCompanyProfile(
    organizationId: number,
    payload: Record<string, any> | null,
  ) {
    if (!payload) return;
    const company = await this.getOrCreatePrimaryCompany(organizationId);
    const legalName = this.normalizeString(payload.legalName);
    const ruc = this.normalizeString(payload.ruc);
    const address = this.normalizeString(payload.address);
    const logoUrl = this.normalizeString(payload.logoUrl);

    const data: Prisma.CompanyUpdateInput = {};
    if (legalName) {
      data.legalName = legalName;
      data.name = legalName;
      data.sunatBusinessName = legalName;
    }
    if (ruc) {
      data.taxId = ruc;
      data.sunatRuc = ruc;
    }
    if (address) {
      data.sunatAddress = address;
    }
    if (logoUrl) {
      data.logoUrl = logoUrl;
    }

    if (Object.keys(data).length === 0) {
      return;
    }

    await this.prisma.company.update({
      where: { id: company.id },
      data,
    });
  }

  private async applyStoreSetup(
    organizationId: number,
    payload: Record<string, any> | null,
  ) {
    if (!payload) return;
    const company = await this.getOrCreatePrimaryCompany(organizationId);
    const primaryStore = this.normalizeString(payload.primaryStore);
    const notes = this.normalizeString(payload.warehouseNotes);
    const additional = this.extractList(payload.additionalStores);

    if (primaryStore) {
      await this.createOrUpdateStore({
        organizationId,
        companyId: company.id,
        name: primaryStore,
        description: notes ?? undefined,
      });
    }

    for (const extra of additional) {
      if (extra && extra !== primaryStore) {
        await this.createOrUpdateStore({
          organizationId,
          companyId: company.id,
          name: extra,
        });
      }
    }
  }

  private async applySunatSetup(
    organizationId: number,
    payload: Record<string, any> | null,
  ) {
    if (!payload) return;
    const company = await this.getOrCreatePrimaryCompany(organizationId);
    const environmentRaw = this.normalizeString(payload.environment) ?? 'BETA';
    const environment =
      environmentRaw.toUpperCase() === 'PRODUCCION' ? 'PRODUCCION' : 'BETA';
    const solUser = this.normalizeString(payload.solUser);
    const solPassword = this.normalizeString(payload.solPassword);
    const certificateStatus = this.normalizeString(payload.certificateStatus);
    const contactEmail = this.normalizeString(payload.contactEmail);

    const data: Prisma.CompanyUpdateInput = {
      sunatEnvironment: environment,
    };

    if (certificateStatus) {
      data.sunatCertificateNotes = certificateStatus;
    }
    if (contactEmail) {
      data.sunatContactEmail = contactEmail;
    }

    if (environment === 'BETA') {
      if (solUser) data.sunatSolUserBeta = solUser;
      if (solPassword) data.sunatSolPasswordBeta = solPassword;
    } else {
      if (solUser) data.sunatSolUserProd = solUser;
      if (solPassword) data.sunatSolPasswordProd = solPassword;
    }

    await this.prisma.company.update({
      where: { id: company.id },
      data,
    });
  }

  private async applyDataImport(
    organizationId: number,
    payload: Record<string, any> | null,
    progress: OnboardingProgress,
  ): Promise<Partial<Prisma.OnboardingProgressUpdateInput>> {
    if (!payload) return {};
    const strategy = (payload.dataStrategy ?? '').toString().toLowerCase();
    if (strategy !== 'demo') {
      return {};
    }
    if (progress.demoStatus === DemoDataStatus.SEEDED) {
      return {};
    }
    await this.demoDataService.seedDemoData(organizationId, payload.industry);
    return {
      demoStatus: DemoDataStatus.SEEDED,
      demoSeededAt: new Date(),
      demoClearedAt: null,
    };
  }

  private buildStepStateMap(
    current: OnboardingProgress,
    overrides: Partial<Record<OnboardingStepKey, StepState>> = {},
  ): Record<OnboardingStepKey, StepState> {
    return this.stepDefinitions.reduce<
      Record<OnboardingStepKey, StepState>
    >((acc, def) => {
      const override = overrides[def.key];
      acc[def.key] = override ?? this.normalizeStepState(current[def.field]);
      return acc;
    }, {} as Record<OnboardingStepKey, StepState>);
  }

  private computeNextCurrentStep(
    steps: Record<OnboardingStepKey, StepState>,
  ): number {
    const pending = this.stepDefinitions.find(
      (def) => !steps[def.key].completed,
    );
    return pending ? pending.order : this.stepDefinitions.length + 1;
  }

  private areAllStepsCompleted(
    steps: Record<OnboardingStepKey, StepState>,
  ): boolean {
    return this.stepDefinitions.every((def) => steps[def.key].completed);
  }

  private mergeStepState(
    current: StepState,
    patch: {
      completed?: boolean;
      updatedAt?: string | null;
      completedAt?: string | null;
      data?: Record<string, any> | null | undefined;
    },
  ): StepState {
    const result: StepState = {
      ...current,
      completed:
        patch.completed !== undefined ? patch.completed : current.completed,
      updatedAt: patch.updatedAt ?? current.updatedAt,
      completedAt: current.completedAt,
      data: current.data,
    };

    if (patch.completed === false) {
      result.completedAt = null;
    } else if (patch.completed === true) {
      result.completedAt = patch.completedAt ?? patch.updatedAt ?? null;
    } else if (patch.completedAt !== undefined) {
      result.completedAt = patch.completedAt;
    }

    if (patch.data !== undefined) {
      if (patch.data === null) {
        result.data = null;
      } else {
        result.data = {
          ...(result.data ?? {}),
          ...patch.data,
        };
      }
    }

    return result;
  }

  private appendHistory(state: StepState, entry: Record<string, any>): StepState {
    const payload = this.isPlainObject(state.data) ? { ...state.data } : {};
    const history = Array.isArray(payload.history)
      ? payload.history.slice(-9)
      : [];
    history.push(entry);
    payload.history = history;

    return {
      ...state,
      data: payload,
    };
  }

  private normalizeStepState(value: unknown): StepState {
    if (!this.isPlainObject(value)) {
      return {
        completed: false,
        completedAt: null,
        updatedAt: null,
        data: null,
      };
    }

    const record = value as Record<string, any>;
    return {
      completed: Boolean(record.completed),
      completedAt:
        typeof record.completedAt === 'string' ? record.completedAt : null,
      updatedAt:
        typeof record.updatedAt === 'string' ? record.updatedAt : null,
      data: this.isPlainObject(record.data)
        ? (record.data as Record<string, any>)
        : null,
    };
  }

  private requireOrganizationId(): number {
    const organizationId = this.tenantContext.getContext().organizationId;
    if (organizationId === null) {
      throw new BadRequestException(
        'Se requiere una organización activa para continuar con el onboarding.',
      );
    }
    return organizationId;
  }

  private async ensureProgressRecord(
    organizationId: number,
  ): Promise<OnboardingProgress> {
    return this.prisma.onboardingProgress.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
      },
    });
  }

  private isPlainObject(value: unknown): value is Record<string, any> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value.constructor === Object ||
        Object.getPrototypeOf(value) === Object.prototype)
    );
  }

  private async getOrCreatePrimaryCompany(organizationId: number) {
    let company = await this.prisma.company.findFirst({
      where: { organizationId },
      orderBy: { id: 'asc' },
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: {
          organizationId,
          name: `Empresa ${organizationId}`,
          status: 'ACTIVE',
        },
      });
    }

    return company;
  }

  private async createOrUpdateStore(params: {
    organizationId: number;
    companyId: number;
    name: string;
    description?: string;
  }): Promise<void> {
    const existing = await this.prisma.store.findFirst({
      where: { organizationId: params.organizationId, name: params.name },
    });

    if (existing) {
      await this.prisma.store.update({
        where: { id: existing.id },
        data: {
          companyId: params.companyId,
          description: params.description ?? existing.description,
          status: 'ACTIVE',
        },
      });
      return;
    }

    const createData: Prisma.StoreCreateInput = {
      name: params.name,
      description: params.description ?? undefined,
      status: 'ACTIVE',
      organizationId: params.organizationId,
      company: { connect: { id: params.companyId } },
    };

    try {
      await this.prisma.store.create({ data: createData });
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
      await this.prisma.store.create({
        data: {
          ...createData,
          name: `${params.name} · Org ${params.organizationId}`,
        },
      });
    }
  }

  private extractList(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => this.normalizeString(item))
        .filter((v): v is string => Boolean(v));
    }
    return value
      .toString()
      .split(/[,;\n]+/)
      .map((entry) => this.normalizeString(entry))
      .filter((v): v is string => Boolean(v));
  }

  private normalizeString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.toString().trim();
    return trimmed.length ? trimmed : null;
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
