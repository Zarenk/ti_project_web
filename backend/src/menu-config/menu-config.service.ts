import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const DEFAULT_MENU_CONFIG = {
  appearance: {
    theme: 'dark',
    primaryColor: '#34d399',
    backgroundColor: '#0a0a0a',
    textColor: '#ffffff',
    menuStyle: 'elegante' as 'elegante' | 'luxury' | 'moderno' | 'tropical',
  },
  branding: {
    restaurantName: '',
    description: '',
    logoUrl: null,
    bannerUrl: null,
    showSearch: true,
  },
  hours: {
    enabled: false,
    schedule: [
      { day: 'Lunes', open: '09:00', close: '22:00', closed: false },
      { day: 'Martes', open: '09:00', close: '22:00', closed: false },
      { day: 'Miercoles', open: '09:00', close: '22:00', closed: false },
      { day: 'Jueves', open: '09:00', close: '22:00', closed: false },
      { day: 'Viernes', open: '09:00', close: '23:00', closed: false },
      { day: 'Sabado', open: '09:00', close: '23:00', closed: false },
      { day: 'Domingo', open: '09:00', close: '21:00', closed: false },
    ],
  },
  categories: [] as Array<{
    categoryId: number;
    visible: boolean;
    displayOrder: number;
    displayName: string | null;
  }>,
  featuredProductIds: [] as number[],
  hiddenProductIds: [] as number[],
  productOverrides: {} as Record<
    string,
    { menuDescription?: string; menuPrice?: number; featured?: boolean }
  >,
  contact: {
    address: '',
    phone: '',
    email: '',
    googleMapsUrl: '',
  },
  socialLinks: {
    facebook: '',
    instagram: '',
    tiktok: '',
    whatsapp: '',
  },
  sharing: {
    slug: null as string | null,
    enabled: true,
  },
};

@Injectable()
export class MenuConfigService {
  private cache = new Map<string, { data: typeof DEFAULT_MENU_CONFIG; updatedAt: Date }>();

  constructor(private readonly prisma: PrismaService) {}

  private buildTenantKey(
    organizationId: number | null,
    companyId: number | null,
  ): string {
    const org =
      typeof organizationId === 'number' && Number.isFinite(organizationId)
        ? organizationId
        : 0;
    const comp =
      typeof companyId === 'number' && Number.isFinite(companyId)
        ? companyId
        : 0;
    return `org:${org}|company:${comp}`;
  }

  async getConfig(
    organizationId: number | null,
    companyId: number | null,
  ) {
    const key = this.buildTenantKey(organizationId, companyId);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const record = await this.prisma.menuConfig.upsert({
      where: { tenantKey: key },
      create: {
        tenantKey: key,
        organizationId: organizationId ?? undefined,
        companyId: companyId ?? undefined,
        data: DEFAULT_MENU_CONFIG as any,
      },
      update: {},
    });

    const merged = this.deepMerge(DEFAULT_MENU_CONFIG, record.data as any);
    const result = { data: merged, updatedAt: record.updatedAt };
    this.cache.set(key, result);
    return result;
  }

  async updateConfig(
    organizationId: number | null,
    companyId: number | null,
    data: Record<string, unknown>,
    expectedUpdatedAt?: string,
  ) {
    const key = this.buildTenantKey(organizationId, companyId);

    if (expectedUpdatedAt) {
      const current = await this.prisma.menuConfig.findUnique({
        where: { tenantKey: key },
        select: { updatedAt: true },
      });
      if (
        current &&
        current.updatedAt.toISOString() !== expectedUpdatedAt
      ) {
        throw new ConflictException(
          'La configuracion fue modificada por otro usuario. Recarga la pagina.',
        );
      }
    }

    const currentConfig = await this.getConfig(organizationId, companyId);
    const merged = this.deepMerge(currentConfig.data, data);

    const record = await this.prisma.menuConfig.upsert({
      where: { tenantKey: key },
      create: {
        tenantKey: key,
        organizationId: organizationId ?? undefined,
        companyId: companyId ?? undefined,
        data: merged as any,
      },
      update: {
        data: merged as any,
      },
    });

    const result = { data: merged, updatedAt: record.updatedAt };
    this.cache.set(key, result);
    return result;
  }

  /** Look up a MenuConfig by its sharing.slug and return orgId + companyId */
  async findTenantBySlug(
    slug: string,
  ): Promise<{ organizationId: number | null; companyId: number | null } | null> {
    // Search all configs for matching slug in JSON data
    const records = await this.prisma.menuConfig.findMany({
      select: { organizationId: true, companyId: true, data: true },
    });
    for (const r of records) {
      const data = r.data as any;
      if (data?.sharing?.slug === slug) {
        return {
          organizationId: r.organizationId,
          companyId: r.companyId,
        };
      }
    }
    return null;
  }

  private deepMerge(target: any, source: any): any {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
