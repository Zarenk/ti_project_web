"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultSiteSettings,
  siteSettingsSchema,
} from "./site-settings-schema";
import type { DeepPartial, SiteSettings, SiteSettingsUpdater } from "./site-settings-schema";

const API_ENDPOINT = "/api/site-settings";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface SiteSettingsContextValue {
  settings: SiteSettings;
  persistedSettings: SiteSettings;
  persistedUpdatedAt: string | null;
  persistedCreatedAt: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  previewSettings: (updater: SiteSettingsUpdater) => void;
  resetPreview: () => void;
  saveSettings: (next: SiteSettings) => Promise<SiteSettings>;
  updateSettings: (updater: SiteSettingsUpdater) => Promise<SiteSettings>;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

const SHADOW_MAP: Record<SiteSettings["layout"]["shadow"], string> = {
  none: "none",
  sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
  md: "0 8px 20px rgba(15, 23, 42, 0.08)",
  lg: "0 15px 45px rgba(15, 23, 42, 0.18)",
};

const SHADCN_PRESET_ID = "shadcn-default";

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDeep<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const output = clone(target);

  if (!isPlainObject(source)) {
    return output;
  }

  const sourceRecord = source as Record<string, unknown>;

  for (const keyName of Object.keys(sourceRecord)) {
    const typedKey = keyName as keyof T;
    const sourceValue = sourceRecord[keyName];

    if (sourceValue === undefined) {
      continue;
    }

    const targetValue = output[typedKey];

    if (Array.isArray(sourceValue)) {
      output[typedKey] = clone(sourceValue) as unknown as T[keyof T];
      continue;
    }

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[typedKey] = mergeDeep(
        targetValue as Record<string, unknown>,
        sourceValue as DeepPartial<Record<string, unknown>>,
      ) as unknown as T[keyof T];
      continue;
    }

    output[typedKey] = sourceValue as unknown as T[keyof T];
  }

  return output;
}

function resolveUpdater(current: SiteSettings, updater: SiteSettingsUpdater): SiteSettings {
  if (typeof updater === "function") {
    const result = updater(clone(current));
    return clone(result);
  }

  return mergeDeep(current, updater);
}

function mix(first: string, second: string, ratio: number): string {
  const firstRatio = Math.min(Math.max(ratio, 0), 1);
  const secondRatio = 1 - firstRatio;
  return `color-mix(in srgb, ${first} ${Math.round(firstRatio * 100)}%, ${second} ${Math.round(secondRatio * 100)}%)`;
}

function lighten(color: string, amount: number): string {
  return mix("white", color, amount);
}

function darken(color: string, amount: number): string {
   return mix("black", color, amount);
}

function buildLightPalette(settings: SiteSettings) {
  const { colors } = settings.theme;
  const background = colors.bg;
  const foreground = colors.text;

  if (settings.theme.preset === SHADCN_PRESET_ID) {
    const primary = colors.primary;
    const accent = colors.accent;
    const border = "#e2e8f0";
    const mutedForeground = "#64748b";

    return {
      "--site-color-background": background,
      "--site-color-foreground": foreground,
      "--site-color-card": background,
      "--site-color-card-foreground": foreground,
      "--site-color-popover": background,
      "--site-color-popover-foreground": foreground,
      "--site-color-primary": primary,
      "--site-color-primary-foreground": "#f8fafc",
      "--site-color-secondary": accent,
      "--site-color-secondary-foreground": foreground,
      "--site-color-muted": accent,
      "--site-color-muted-foreground": mutedForeground,
      "--site-color-accent": accent,
      "--site-color-accent-foreground": foreground,
      "--site-color-destructive": "#ef4444",
      "--site-color-border": border,
      "--site-color-input": border,
      "--site-color-ring": primary,
      "--site-color-chart-1": primary,
      "--site-color-chart-2": mix(primary, accent, 0.5),
      "--site-color-chart-3": accent,
      "--site-color-chart-4": mix(accent, "#10b981", 0.6),
      "--site-color-chart-5": mix(primary, "#f97316", 0.4),
      "--site-color-sidebar": background,
      "--site-color-sidebar-foreground": foreground,
      "--site-color-sidebar-primary": primary,
      "--site-color-sidebar-primary-foreground": "#f8fafc",
      "--site-color-sidebar-accent": accent,
      "--site-color-sidebar-accent-foreground": foreground,
      "--site-color-sidebar-border": border,
      "--site-color-sidebar-ring": primary,
    } satisfies Record<string, string>;
  }

  return {
    "--site-color-background": background,
    "--site-color-foreground": foreground,
    "--site-color-card": lighten(colors.bg, 0.04),
    "--site-color-card-foreground": foreground,
    "--site-color-popover": lighten(colors.bg, 0.06),
    "--site-color-popover-foreground": foreground,
    "--site-color-primary": colors.primary,
    "--site-color-primary-foreground": lighten(colors.primary, 0.85),
    "--site-color-secondary": mix(colors.accent, colors.bg, 0.4),
    "--site-color-secondary-foreground": foreground,
    "--site-color-muted": mix(colors.bg, colors.text, 0.08),
    "--site-color-muted-foreground": mix(colors.text, colors.bg, 0.25),
    "--site-color-accent": colors.accent,
    "--site-color-accent-foreground": lighten(colors.accent, 0.85),
    "--site-color-destructive": "#ef4444",
    "--site-color-border": mix(colors.text, colors.bg, 0.12),
    "--site-color-input": mix(colors.text, colors.bg, 0.12),
    "--site-color-ring": colors.primary,
    "--site-color-chart-1": colors.primary,
    "--site-color-chart-2": mix(colors.primary, colors.accent, 0.5),
    "--site-color-chart-3": colors.accent,
    "--site-color-chart-4": mix(colors.accent, "#10b981", 0.6),
    "--site-color-chart-5": mix(colors.primary, "#f97316", 0.4),
    "--site-color-sidebar": lighten(colors.bg, 0.02),
    "--site-color-sidebar-foreground": foreground,
    "--site-color-sidebar-primary": colors.primary,
    "--site-color-sidebar-primary-foreground": lighten(colors.primary, 0.85),
    "--site-color-sidebar-accent": mix(colors.accent, colors.bg, 0.25),
    "--site-color-sidebar-accent-foreground": foreground,
    "--site-color-sidebar-border": mix(colors.text, colors.bg, 0.12),
    "--site-color-sidebar-ring": colors.primary,
  } satisfies Record<string, string>;
}

function buildDarkPalette(settings: SiteSettings) {
  const { colors } = settings.theme;
  const background = darken(colors.bg, 0.7);
  const foreground = lighten(colors.text, 0.85);

  if (settings.theme.preset === SHADCN_PRESET_ID) {
    const darkBackground = "#020817";
    const darkForeground = "#f8fafc";
    const darkPrimary = "#f8fafc";
    const darkPrimaryForeground = "#0f172a";
    const darkAccent = "#1e293b";
    const darkBorder = "#1e293b";
    const darkMutedForeground = "#94a3b8";
    const darkRing = "#cbd5e1";
    const darkSidebar = "#0b1220";

    return {
      "--site-dark-color-background": darkBackground,
      "--site-dark-color-foreground": darkForeground,
      "--site-dark-color-card": darkBackground,
      "--site-dark-color-card-foreground": darkForeground,
      "--site-dark-color-popover": darkBackground,
      "--site-dark-color-popover-foreground": darkForeground,
      "--site-dark-color-primary": darkPrimary,
      "--site-dark-color-primary-foreground": darkPrimaryForeground,
      "--site-dark-color-secondary": darkAccent,
      "--site-dark-color-secondary-foreground": darkForeground,
      "--site-dark-color-muted": darkAccent,
      "--site-dark-color-muted-foreground": darkMutedForeground,
      "--site-dark-color-accent": darkAccent,
      "--site-dark-color-accent-foreground": darkForeground,
      "--site-dark-color-destructive": "#7f1d1d",
      "--site-dark-color-border": darkBorder,
      "--site-dark-color-input": darkBorder,
      "--site-dark-color-ring": darkRing,
      "--site-dark-color-chart-1": darkPrimary,
      "--site-dark-color-chart-2": mix(darkPrimary, darkAccent, 0.6),
      "--site-dark-color-chart-3": mix(darkAccent, "#38bdf8", 0.5),
      "--site-dark-color-chart-4": mix(darkAccent, "#facc15", 0.5),
      "--site-dark-color-chart-5": mix(darkPrimary, "#f97316", 0.4),
      "--site-dark-color-sidebar": darkSidebar,
      "--site-dark-color-sidebar-foreground": darkForeground,
      "--site-dark-color-sidebar-primary": darkPrimary,
      "--site-dark-color-sidebar-primary-foreground": darkPrimaryForeground,
      "--site-dark-color-sidebar-accent": darkAccent,
      "--site-dark-color-sidebar-accent-foreground": darkForeground,
      "--site-dark-color-sidebar-border": darkBorder,
      "--site-dark-color-sidebar-ring": darkRing,
    } satisfies Record<string, string>;
  }

  return {
    "--site-dark-color-background": background,
    "--site-dark-color-foreground": foreground,
    "--site-dark-color-card": darken(colors.bg, 0.5),
    "--site-dark-color-card-foreground": foreground,
    "--site-dark-color-popover": darken(colors.bg, 0.55),
    "--site-dark-color-popover-foreground": foreground,
    "--site-dark-color-primary": lighten(colors.primary, 0.25),
    "--site-dark-color-primary-foreground": darken(colors.primary, 0.6),
    "--site-dark-color-secondary": mix(colors.accent, "#0f172a", 0.6),
    "--site-dark-color-secondary-foreground": foreground,
    "--site-dark-color-muted": mix(background, foreground, 0.2),
    "--site-dark-color-muted-foreground": mix(foreground, background, 0.4),
    "--site-dark-color-accent": lighten(colors.accent, 0.2),
    "--site-dark-color-accent-foreground": darken(colors.accent, 0.65),
    "--site-dark-color-destructive": "#f87171",
    "--site-dark-color-border": mix(foreground, background, 0.18),
    "--site-dark-color-input": mix(foreground, background, 0.18),
    "--site-dark-color-ring": lighten(colors.primary, 0.2),
    "--site-dark-color-chart-1": lighten(colors.primary, 0.1),
    "--site-dark-color-chart-2": mix(colors.primary, colors.accent, 0.6),
    "--site-dark-color-chart-3": lighten(colors.accent, 0.1),
    "--site-dark-color-chart-4": mix(colors.accent, "#facc15", 0.5),
    "--site-dark-color-chart-5": mix(colors.primary, "#f97316", 0.5),
    "--site-dark-color-sidebar": darken(colors.bg, 0.55),
    "--site-dark-color-sidebar-foreground": foreground,
    "--site-dark-color-sidebar-primary": lighten(colors.primary, 0.25),
    "--site-dark-color-sidebar-primary-foreground": darken(colors.primary, 0.65),
    "--site-dark-color-sidebar-accent": mix(colors.accent, background, 0.5),
    "--site-dark-color-sidebar-accent-foreground": foreground,
    "--site-dark-color-sidebar-border": mix(foreground, background, 0.2),
    "--site-dark-color-sidebar-ring": lighten(colors.primary, 0.25),
  } satisfies Record<string, string>;
}

function applyCssVariables(settings: SiteSettings) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (!root) {
    return;
  }
  const spacingRem = `${(settings.layout.spacing || 0) * 0.25}rem`;
  const radiusRem = `${settings.layout.radius}rem`;
  const baseFontSize = `${settings.typography.baseSize}px`;
  const variables: Record<string, string> = {
    "--site-spacing": spacingRem,
    "--site-radius": radiusRem,
    "--site-shadow": SHADOW_MAP[settings.layout.shadow],
    "--site-font-body": settings.typography.fontFamily,
    "--site-font-heading": settings.typography.fontFamily,
    "--site-font-base-size": baseFontSize,
    "--site-font-scale": settings.typography.scale.toString(),
    "--site-theme-mode": settings.theme.mode,
    ...buildLightPalette(settings),
    ...buildDarkPalette(settings),
  };

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.error === "string") {
      return data.error;
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {
    // Ignore JSON parsing errors.
  }

  try {
    const text = await response.clone().text();
    if (text) {
      return text;
    }
  } catch {
    // Ignore body parsing errors.
  }

  return response.statusText || "Error desconocido";
}

interface SiteSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: SiteSettings | null;
  initialUpdatedAt?: string | null;
  initialCreatedAt?: string | null;
}

export function SiteSettingsProvider({
  children,
  initialSettings = null,
  initialUpdatedAt = null,
  initialCreatedAt = null,
}: SiteSettingsProviderProps) {
  const [settings, setSettings] = useState<SiteSettings>(() =>
    clone(initialSettings ?? defaultSiteSettings),
  );
  const [persistedSettings, setPersistedSettings] = useState<SiteSettings>(() =>
    clone(initialSettings ?? defaultSiteSettings),
  );
  const [persistedUpdatedAt, setPersistedUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [persistedCreatedAt, setPersistedCreatedAt] = useState<string | null>(initialCreatedAt);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSettings);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINT, { cache: "no-store" });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message);
      }

      const payload = await response.json();
      const parsed = siteSettingsSchema.parse(payload);

      const nextPersisted = clone(parsed);
      const nextSettings = clone(parsed);
      setPersistedSettings(nextPersisted);
      const nextUpdatedAt = response.headers.get("x-site-settings-updated-at");
      const nextCreatedAt = response.headers.get("x-site-settings-created-at");
      setPersistedUpdatedAt(nextUpdatedAt);
      setPersistedCreatedAt(nextCreatedAt);
      setSettings(nextSettings);
      if (mountedRef.current) {
        applyCssVariables(nextSettings);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading site settings", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los ajustes del sitio.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSettings) {
      setIsLoading(false);
      return;
    }
    refresh().catch((err) => {
      console.error("Error initializing site settings", err);
    });
  }, [initialSettings, refresh]);

  useIsomorphicLayoutEffect(() => {
    if (typeof document !== "undefined") {
      mountedRef.current = true;
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!mountedRef.current) {
      return;
    }

    applyCssVariables(settings);
  }, [settings]);

  const previewSettings = useCallback((updater: SiteSettingsUpdater) => {
    setSettings((current:any) => {
      const next = resolveUpdater(current, updater);

      if (mountedRef.current) {
        applyCssVariables(next);
      }

      return next;
    });
  }, []);

  const resetPreview = useCallback(() => {
    const next = clone(persistedSettings);

    if (mountedRef.current) {
      applyCssVariables(next);
    }

    setSettings(next);
  }, [persistedSettings]);

  const saveSettings = useCallback(
    async (next: SiteSettings): Promise<SiteSettings> => {
      const validated = siteSettingsSchema.parse(next);
      const previousPersisted = persistedSettings;
      const previousPersistedUpdatedAt = persistedUpdatedAt;
      const previousPersistedCreatedAt = persistedCreatedAt;

      setIsSaving(true);
      setPersistedSettings(clone(validated));
      setSettings(clone(validated));

      try {
        const response = await fetch(API_ENDPOINT, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: validated,
            expectedUpdatedAt: persistedUpdatedAt,
          }),
        });

        if (!response.ok) {
          const message = await readErrorMessage(response);
          throw new Error(message);
        }

        let parsed: SiteSettings | null = null;
        if (response.headers.get("content-type")?.includes("application/json")) {
          const payload = await response.json();
          parsed = siteSettingsSchema.parse(payload);
        }

        const nextUpdatedAt = response.headers.get("x-site-settings-updated-at");
        const nextCreatedAt = response.headers.get("x-site-settings-created-at");

        if (parsed) {
          setPersistedSettings(clone(parsed));
          setSettings(clone(parsed));
          setPersistedUpdatedAt(nextUpdatedAt);
          setPersistedCreatedAt(nextCreatedAt);
          applyCssVariables(parsed);
          setError(null);
          return parsed;
        }

        setPersistedUpdatedAt(nextUpdatedAt);
        setPersistedCreatedAt(nextCreatedAt);

        applyCssVariables(validated);
        setError(null);
        return validated;
      } catch (err) {
        setPersistedSettings(clone(previousPersisted));
        setSettings(clone(previousPersisted));
        setPersistedUpdatedAt(previousPersistedUpdatedAt);
        setPersistedCreatedAt(previousPersistedCreatedAt);
        applyCssVariables(previousPersisted);
        const message = err instanceof Error ? err.message : "No se pudieron guardar los ajustes.";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [persistedSettings, persistedUpdatedAt, persistedCreatedAt],
  );

  const updateSettings = useCallback(
    async (updater: SiteSettingsUpdater): Promise<SiteSettings> => {
      const next = resolveUpdater(settings, updater);
      return saveSettings(next);
    },
    [saveSettings, settings],
  );

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      persistedSettings,
      persistedUpdatedAt,
      persistedCreatedAt,
      isLoading,
      isSaving,
      error,
      previewSettings,
      resetPreview,
      saveSettings,
      updateSettings,
      refresh,
    }),
    [
      settings,
      persistedSettings,
      persistedUpdatedAt,
      persistedCreatedAt,
      isLoading,
      isSaving,
      error,
      previewSettings,
      resetPreview,
      saveSettings,
      updateSettings,
      refresh,
    ],
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }

  return context;
}
