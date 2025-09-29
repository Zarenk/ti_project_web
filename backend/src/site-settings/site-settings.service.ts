import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SiteSettings } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

const SETTINGS_ID = 1;

const DEFAULT_SITE_SETTINGS: Prisma.JsonObject = {
  brand: {
    siteName: 'Mi Sitio Web',
    logoUrl: '',
    faviconUrl: '',
  },
  theme: {
    mode: 'system',
    colors: {
      primary: '#3b82f6',
      accent: '#38bdf8',
      bg: '#ffffff',
      text: '#0f172a',
    },
    preset: 'blue-classic',
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
    defaultDescription: 'Descripción de mi sitio web',
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
    return this.findOrCreate();
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

      if (!existing) {
        return tx.siteSettings.create({
          data: {
            id: SETTINGS_ID,
            data: (dto.data as Prisma.JsonValue) ?? DEFAULT_SITE_SETTINGS,
          },
        });
      }

      return tx.siteSettings.update({
        where: { id: SETTINGS_ID },
        data: {
          data: dto.data as Prisma.JsonValue,
        },
      });
    });
  }
}