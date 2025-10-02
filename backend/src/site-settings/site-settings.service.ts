import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SiteSettings } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

const SETTINGS_ID = 1;

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

    const typedKey = key as keyof typeof output;
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
    cookieBanner: true,
    cookieText: 'Este sitio utiliza cookies para mejorar tu experiencia.',
    acceptText: 'Aceptar',
  },
  maintenance: {
    enabled: false,
    message: 'Estamos realizando mantenimiento. Vuelve pronto.',
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
  },
};

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(): Promise<SiteSettings> {
    return this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {
        id: SETTINGS_ID,
        data: DEFAULT_SITE_SETTINGS,
      },
    });
  }

  async getSettings(): Promise<SiteSettings> {
    const settings = await this.findOrCreate();
    return {
      ...settings,
      data: this.sanitizeSettingsData(settings.data),
    };
  }

  async updateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.siteSettings.findUnique({ where: { id: SETTINGS_ID } });

      if (existing && dto.expectedUpdatedAt) {
        const expected = new Date(dto.expectedUpdatedAt);
        if (existing.updatedAt.getTime() !== expected.getTime()) {
          throw new ConflictException('Site settings were modified by another user.');
        }
      }

      const payload = (dto.data ?? DEFAULT_SITE_SETTINGS) as Prisma.InputJsonValue;

      if (!existing) {
        return tx.siteSettings.create({
          data: {
            id: SETTINGS_ID,
            data: payload,
          },
        });
      }

      return tx.siteSettings.update({
        where: { id: SETTINGS_ID },
        data: {
          data: payload,
        },
      });
    });
  }

  private sanitizeSettingsData(data: Prisma.JsonValue): Prisma.JsonValue {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
  }

    const merged = deepMergeJson(
      DEFAULT_SITE_SETTINGS,
      data as Prisma.JsonObject,
    );
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
}