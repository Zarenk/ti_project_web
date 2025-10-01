import { z } from "zod";

export const siteSettingsSchema = z.object({
  brand: z.object({
    siteName: z.string().min(1, "Este campo es obligatorio."),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark", "system"]),
    colors: z.object({
      primary: z.string(),
      accent: z.string(),
      bg: z.string(),
      text: z.string(),
    }),
    preset: z.string().optional(),
  }),
  typography: z.object({
    fontFamily: z.string(),
    baseSize: z.number().min(12).max(24),
    scale: z.number().min(1).max(2),
  }),
  layout: z.object({
    container: z.enum(["sm", "md", "lg", "full"]),
    spacing: z.number().min(0).max(10),
    radius: z.number().min(0).max(2),
    shadow: z.enum(["none", "sm", "md", "lg"]),
    buttonStyle: z.enum(["rounded", "pill", "rectangular"]),
  }),
  navbar: z.object({
    style: z.enum(["light", "dark", "transparent"]),
    position: z.enum(["fixed", "static"]),
    showSearch: z.boolean(),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      )
      .min(1),
  }),
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    ctaLabel: z.string(),
    ctaHref: z
      .string()
      .url("Ingresa una URL válida.")
      .optional()
      .or(z.literal("")),
    enableCarousel: z.boolean(),
    speed: z.number().min(1).max(10),
    particles: z.boolean(),
  }),
  components: z.object({
    cardStyle: z.enum(["border", "shadow"]),
    chipStyle: z.enum(["solid", "outline"]),
    tableDensity: z.enum(["compact", "normal"]),
  }),
  seo: z.object({
    defaultTitle: z.string().min(1, "Este campo es obligatorio."),
    defaultDescription: z.string().min(1, "Este campo es obligatorio."),
    ogImage: z.string().optional(),
    baseSlug: z.string().optional(),
  }),
  integrations: z.object({
    gaId: z.string().optional(),
    metaPixelId: z.string().optional(),
    loadOnCookieAccept: z.boolean(),
  }),
  social: z.object({
    facebook: z.string().url("Ingresa una URL válida.").optional().or(z.literal("")),
    instagram: z.string().url("Ingresa una URL válida.").optional().or(z.literal("")),
    tiktok: z.string().url("Ingresa una URL válida.").optional().or(z.literal("")),
    youtube: z.string().url("Ingresa una URL válida.").optional().or(z.literal("")),
    x: z.string().url("Ingresa una URL válida.").optional().or(z.literal("")),
  }),
  privacy: z.object({
    cookieBanner: z.boolean(),
    cookieText: z.string(),
    acceptText: z.string(),
  }),
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string(),
  }),
});

export const siteSettingsWithMetaSchema = z.object({
  settings: siteSettingsSchema,
  updatedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export const siteSettingsUpdatePayloadSchema = z.object({
  data: siteSettingsSchema,
  expectedUpdatedAt: z.string().nullable().optional(),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SiteSettingsWithMeta = z.infer<typeof siteSettingsWithMetaSchema>;
export type SiteSettingsUpdatePayload = z.infer<typeof siteSettingsUpdatePayloadSchema>;

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export const defaultSiteSettings: SiteSettings = {
  brand: {
    siteName: "Mi Sitio Web",
    logoUrl: "",
    faviconUrl: "",
  },
  theme: {
    mode: "system",
    colors: {
      primary: "#0f172a",
      accent: "#f1f5f9",
      bg: "#ffffff",
      text: "#020817",
    },
    preset: "shadcn-default",
  },
  typography: {
    fontFamily: "Inter",
    baseSize: 16,
    scale: 1.25,
  },
  layout: {
    container: "lg",
    spacing: 4,
    radius: 0.75,
    shadow: "md",
    buttonStyle: "rounded",
  },
  navbar: {
    style: "light",
    position: "fixed",
    showSearch: true,
    links: [
      { label: "Inicio", href: "/" },
      { label: "Productos", href: "/productos" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
  hero: {
    title: "Bienvenido a nuestro sitio",
    subtitle: "Descubre todo lo que tenemos para ti",
    ctaLabel: "Comenzar",
    ctaHref: "",
    enableCarousel: false,
    speed: 5,
    particles: false,
  },
  components: {
    cardStyle: "shadow",
    chipStyle: "solid",
    tableDensity: "normal",
  },
  seo: {
    defaultTitle: "Mi Sitio Web",
    defaultDescription: "Descripción de mi sitio web",
    ogImage: "",
    baseSlug: "",
  },
  integrations: {
    gaId: "",
    metaPixelId: "",
    loadOnCookieAccept: true,
  },
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    x: "",
  },
  privacy: {
    cookieBanner: true,
    cookieText: "Este sitio utiliza cookies para mejorar tu experiencia.",
    acceptText: "Aceptar",
  },
  maintenance: {
    enabled: false,
    message: "Estamos realizando mantenimiento. Vuelve pronto.",
  },
};

export type SiteSettingsUpdater =
  | DeepPartial<SiteSettings>
  | ((current: SiteSettings) => SiteSettings);