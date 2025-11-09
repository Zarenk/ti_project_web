import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SiteSettings } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

function cloneJson<T extends Prisma.JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMergeJson(
  target: Prisma.JsonObject,
  source: Prisma.JsonObject,
): Prisma.JsonObject {
  const output = cloneJson(target);

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }

    const typedKey = key;
    const targetValue = output[typedKey];

    if (Array.isArray(value)) {
      output[typedKey] = cloneJson(value) as Prisma.JsonValue;
      continue;
    }

    if (
      isPlainObject(value) &&
      targetValue !== undefined &&
      isPlainObject(targetValue)
    ) {
      output[typedKey] = deepMergeJson(targetValue, value);
      continue;
    }

    output[typedKey] = value as Prisma.JsonValue;
  }

  return output;
}

const DEFAULT_SITE_SETTINGS: Prisma.JsonObject = {
  company: {
    name: 'Mi Empresa',
    receiptFormat: 'a4',
    documentNumber: '',
    address: '',
    phone: '',
    email: '',
  },
  brand: {
    siteName: 'Mi Sitio Web',
    logoUrl: '',
    faviconUrl: '',
  },
  theme: {
    mode: 'system',
    colors: {
      primary: '#0f172a',
      accent: '#f1f5f9',
      bg: '#ffffff',
      text: '#020817',
    },
    preset: 'shadcn-default',
  },
  typography: {
    fontFamily: 'Inter',
    baseSize: 16,
    scale: 1.25,
  },
  layout: {
    container: 'lg',
    spacing: 4,
    radius: 0.75,
    shadow: 'md',
    buttonStyle: 'rounded',
  },
  navbar: {
    style: 'light',
    position: 'fixed',
    showSearch: true,
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Productos', href: '/productos' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
  hero: {
    title: 'Bienvenido a nuestro sitio',
    subtitle: 'Descubre todo lo que tenemos para ti',
    ctaLabel: 'Comenzar',
    ctaHref: '',
    enableCarousel: false,
    speed: 5,
    particles: false,
  },
  components: {
    cardStyle: 'shadow',
    chipStyle: 'solid',
    tableDensity: 'normal',
  },
  seo: {
    defaultTitle: 'Mi Sitio Web',
    defaultDescription: 'Descripcion de mi sitio web',
    ogImage: '',
    baseSlug: '',
  },
  integrations: {
    gaId: '',
    metaPixelId: '',
    loadOnCookieAccept: true,
  },
  social: {
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    x: '',
  },
  privacy: {
    cookieBanner: false,
    cookieText: 'Este sitio utiliza cookies para mejorar tu experiencia.',
    acceptText: 'Aceptar',
    termsUrl: '',
    privacyUrl: '',
    cookiePolicyUrl: '',
  },
  maintenance: {
    enabled: false,
    message: 'Estamos realizando mantenimiento programado.',
  },
  permissions: {
    dashboard: true,
    catalog: true,
    store: true,
    inventory: true,
    sales: true,
    purchases: true,
    accounting: true,
    marketing: true,
    ads: true,
    settings: true,
    hidePurchaseCost: false,
  },
};

@Injectable()
export class SiteSettingsService {
  private readonly CACHE_TTL_MS = 30_000;
  private cache = new Map<
    string,
    {
      value: SiteSettings;
      timestamp: number;
    }
  >();

  constructor(private readonly prisma: PrismaService) {}

  private buildTenantKey(
    organizationId: number | null,
    companyId: number | null,
  ): string {
    const normalizedOrg =
      typeof organizationId === 'number' && Number.isFinite(organizationId)
        ? organizationId
        : 0;
    const normalizedCompany =
      typeof companyId === 'number' && Number.isFinite(companyId)
        ? companyId
        : 0;

    return `org:${normalizedOrg}|company:${normalizedCompany}`;
  }

  private async findOrCreate(
    organizationId: number | null,
    companyId: number | null,
  ): Promise<SiteSettings> {
    const tenantKey = this.buildTenantKey(organizationId, companyId);

    return this.prisma.siteSettings.upsert({
      where: { tenantKey },
      update: {},
      create: {
        tenantKey,
        organizationId,
        companyId,
        data: DEFAULT_SITE_SETTINGS,
      },
    });
  }

  async getSettings(
    organizationId: number | null,
    companyId: number | null,
  ): Promise<SiteSettings> {
    const cacheKey = this.buildTenantKey(organizationId, companyId);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return this.cloneSettings(cached);
    }

    const settings = await this.findOrCreate(organizationId, companyId);
    const sanitized = {
      ...settings,
      data: this.sanitizeSettingsData(settings.data),
    } as SiteSettings;

    this.setCache(cacheKey, sanitized);

    return this.cloneSettings(sanitized);
  }

  async updateSettings(
    dto: UpdateSiteSettingsDto,
    organizationId: number | null,
    companyId: number | null,
  ): Promise<SiteSettings> {
    const tenantKey = this.buildTenantKey(organizationId, companyId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.siteSettings.findUnique({
        where: { tenantKey },
      });

      if (existing && dto.expectedUpdatedAt) {
        const expected = new Date(dto.expectedUpdatedAt);
        if (existing.updatedAt.getTime() !== expected.getTime()) {
          throw new ConflictException(
            'Site settings were modified by another user.',
          );
        }
      }

      const payload = (dto.data ??
        DEFAULT_SITE_SETTINGS) as Prisma.InputJsonValue;

      if (!existing) {
        return tx.siteSettings.create({
          data: {
            tenantKey,
            organizationId,
            companyId,
            data: payload,
          },
        });
      }

      return tx.siteSettings.update({
        where: { tenantKey },
        data: {
          organizationId,
          companyId,
          data: payload,
        },
      });
    });

    const sanitized = {
      ...updated,
      data: this.sanitizeSettingsData(updated.data),
    } as SiteSettings;

    this.setCache(tenantKey, sanitized);

    if (organizationId !== null) {
      const sanitizedPermissions = (
        sanitized.data as Prisma.JsonObject
      )?.permissions;
      if (sanitizedPermissions && typeof sanitizedPermissions === 'object') {
        await this.propagatePermissionsToOrganization(
          organizationId,
          sanitizedPermissions as Prisma.JsonObject,
        );
      }
    }

    return this.cloneSettings(sanitized);
  }

  private sanitizeSettingsData(data: Prisma.JsonValue): Prisma.JsonValue {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return cloneJson(DEFAULT_SITE_SETTINGS);
    }

    const merged = deepMergeJson(DEFAULT_SITE_SETTINGS, data);
    const integrations = merged.integrations as Prisma.JsonValue;

    if (integrations && isPlainObject(integrations)) {
      const integrationsObject = {
        ...integrations,
      };

      delete integrationsObject.gaId;
      delete integrationsObject.metaPixelId;

      merged.integrations = integrationsObject;
    }

    return merged;
  }

  private getFromCache(cacheKey: string): SiteSettings | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  private setCache(cacheKey: string, settings: SiteSettings): void {
    this.cache.set(cacheKey, {
      value: settings,
      timestamp: Date.now(),
    });
  }

  private cloneSettings(settings: SiteSettings): SiteSettings {
    return {
      ...settings,
      data: cloneJson(settings.data),
    };
  }

  private async propagatePermissionsToOrganization(
    organizationId: number,
    permissions: Prisma.JsonObject,
  ): Promise<void> {
    const entries = await this.prisma.siteSettings.findMany({
      where: { organizationId },
    });

    await Promise.all(
      entries.map((entry) => {
        const currentData = (entry.data as Prisma.JsonObject) ?? {};
        const nextData: Prisma.JsonObject = {
          ...currentData,
          permissions,
        };

        return this.prisma.siteSettings.update({
          where: { id: entry.id },
          data: { data: nextData },
        });
      }),
    );
  }
}
