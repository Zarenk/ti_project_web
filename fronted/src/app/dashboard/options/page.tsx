"use client";

import {
  type ChangeEvent,
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Box,
  Download,
  ImageIcon,
  Layout,
  Database,
  Monitor,
  Moon,
  Navigation,
  Palette,
  RotateCcw,
  Save,
  Search,
  Share2,
  Shield,
  Sparkles,
  Sun,
  Loader2,
  Type,
  Upload,
  UserCog,
  Wrench,
  X,
} from "lucide-react";
import { useSiteSettings } from "@/context/site-settings-context";
import {
  defaultSiteSettings,
  siteSettingsSchema,
  type SiteSettings,
  type DeepPartial,
} from "@/context/site-settings-schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  TYPOGRAPHY_FONT_OPTIONS,
  getTypographyFont,
} from "@/lib/typography-fonts";
import { DeleteActionsGuard } from "@/components/delete-actions-guard";
import { useAuth } from "@/context/auth-context";
import { useOptionalTenantSelection } from "@/context/tenant-selection-context";
import { getCompanyDetail, type CompanyDetail } from "../tenancy/tenancy.api";

import { BACKEND_URL } from "@/lib/utils";

export type SettingsFormData = SiteSettings;

type SectionId =
    "company"
  | "brand"
  | "theme"
  | "typography"
  | "layout"
  | "navbar"
  | "hero"
  | "components"
  | "seo"
  | "integrations"
  | "social"
  | "privacy"
  | "maintenance"
  | "permissions"
  | "system";

const defaultValues: SettingsFormData = defaultSiteSettings;
const ACTIVE_SECTION_STORAGE_KEY = "dashboard.options.active-section";

function getStoredActiveSection(): SectionId {
  if (typeof window === "undefined") {
    return "company";
  }
  try {
    const stored = window.sessionStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
    if (!stored) return "company";
    return sections.some((section) => section.id === stored)
      ? (stored as SectionId)
      : "company";
  } catch {
    return "company";
  }
}

const sections: { id: SectionId; label: string; icon: typeof Palette }[] = [
  { id: "company", label: "Empresa", icon: Building2 },
  { id: "brand", label: "Marca", icon: Sparkles },
  { id: "theme", label: "Colores y tema", icon: Palette },
  { id: "typography", label: "Tipografía", icon: Type },
  { id: "layout", label: "Diseño", icon: Layout },
  { id: "navbar", label: "Navegación", icon: Navigation },
  { id: "hero", label: "Hero/Banner", icon: ImageIcon },
  { id: "components", label: "Contenido y componentes", icon: Box },
  { id: "seo", label: "SEO y Metadatos", icon: Search },
  { id: "integrations", label: "Integraciones", icon: Wrench },
  { id: "social", label: "Redes sociales", icon: Share2 },
  { id: "privacy", label: "Privacidad", icon: Shield },
  { id: "maintenance", label: "Modo mantenimiento", icon: AlertCircle },
  { id: "permissions", label: "Permisos de usuarios", icon: UserCog },
  { id: "system", label: "Datos del Sistema", icon: Database },
];

type PermissionModuleKey = Exclude<
  keyof SiteSettings["permissions"],
  "hidePurchaseCost" | "hideDeleteForEmployees" | "hideDeleteForAdmins"
>;

const permissionModules: {
  key: PermissionModuleKey;
  label: string;
  description: string;
}[] = [
  {
    key: "dashboard",
    label: "Panel principal",
    description: "Acceso al panel de control con métricas generales.",
  },
  {
    key: "catalog",
    label: "Catálogo",
    description: "Gestionar los productos y sus categorías.",
  },
  {
    key: "store",
    label: "Tienda en línea",
    description: "Configurar la vitrina y opciones de la tienda.",
  },
  {
    key: "inventory",
    label: "Inventario",
    description: "Controlar el stock y movimientos de almacén.",
  },
  {
    key: "sales",
    label: "Ventas",
    description: "Crear y revisar pedidos y comprobantes.",
  },
  {
    key: "salesHistory",
    label: "Historial de ventas",
    description: "Acceso a los reportes y análisis del historial de ventas.",
  },
  {
    key: "purchases",
    label: "Compras",
    description: "Registrar compras y proveedores.",
  },
  {
    key: "accounting",
    label: "Contabilidad",
    description: "Ver reportes y conciliaciones contables.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Gestionar campañas y automatizaciones.",
  },
  {
    key: "providers",
    label: "Proveedores",
    description: "Permitir que los usuarios accedan a la gestión de proveedores.",
  },
  {
    key: "settings",
    label: "Configuraciones",
    description: "Modificar la configuración general del sitio.",
  },
];

type Register = UseFormRegister<SettingsFormData>;
type Errors = FieldErrors<SettingsFormData>;
type Watch = UseFormWatch<SettingsFormData>;
type SetValue = UseFormSetValue<SettingsFormData>;
type FormControl = Control<SettingsFormData>;

type SectionProps = {
  register: Register;
  errors: Errors;
  watch: Watch;
  setValue: SetValue;
  control: FormControl;
};

type SimpleSectionProps = {
  register: Register;
  errors: Errors;
  control?: FormControl;
};

type SystemDataSectionProps = {
  onGenerateBackup: () => Promise<void> | void;
  onPurgeData: () => Promise<void> | void;
  isBackupPending: boolean;
  isPurgeDialogOpen: boolean;
  onPurgeDialogOpenChange: (open: boolean) => void;
  watch: Watch;
  setValue: SetValue;
};

type BrandSectionProps = Pick<SectionProps, "register" | "errors" | "setValue" | "watch">;
type PermissionsSectionProps = Pick<SectionProps, "watch" | "setValue">;
const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function cloneSettings<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function mergeSettingsDeep<T extends Record<string, unknown>>(
  target: T,
  source?: DeepPartial<T> | null,
): T {
  const output = cloneSettings(target);

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
      output[typedKey] = cloneSettings(sourceValue) as unknown as T[keyof T];
      continue;
    }

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[typedKey] = mergeSettingsDeep(
        targetValue as Record<string, unknown>,
        sourceValue as DeepPartial<Record<string, unknown>>,
      ) as unknown as T[keyof T];
      continue;
    }

    output[typedKey] = sourceValue as unknown as T[keyof T];
  }

  return output;
}

/* ─── Skeleton shown while settings load from API ─── */
function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background font-site animate-fade-in">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar skeleton — mimics 15 nav items */}
          <aside className="h-fit space-y-1">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3">
                <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
                <Skeleton className="h-4" style={{ width: `${90 + Math.round(Math.sin(i * 1.3) * 40)}px` }} />
              </div>
            ))}
          </aside>

          {/* Content skeleton — mimics a form section with card + fields */}
          <main className="space-y-6">
            <Card className="border shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Field rows */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
                {/* Two-column row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Footer bar skeleton */}
      <div className="container mx-auto px-4 pb-8">
        <div className="sticky bottom-4 z-50 border border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <Skeleton className="h-5 w-36 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>(getStoredActiveSection);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [firstSave, setFirstSave] = useState(true);
  const [serverSettings, setServerSettings] = useState<SettingsFormData>(defaultValues);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isBackupPending, setIsBackupPending] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<CompanyDetail | null>(null);
  const previewInitializedRef = useRef(false);
  const lastNonSystemModeRef = useRef<"light" | "dark">("light");
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const tenantCtx = useOptionalTenantSelection();

  const {
    settings,
    persistedSettings,
    previewSettings,
    resetPreview,
    saveSettings,
    isSaving,
    isLoading: isContextLoading,
  } = useSiteSettings();

  const {
  register,
  handleSubmit,
  watch,
  control,
  setValue,
  reset,
  formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: persistedSettings, // ← desacoplado del “preview”
    mode: "onBlur",
    shouldUnregister: false,          // ← conserva valores en campos condicionales
  });

  // Mantén el form alineado SOLO cuando cambie lo persistido (no en cada preview)
  useEffect(() => {
    reset(persistedSettings);
  }, [persistedSettings, reset]);

  // Fetch active company details for CompanySection
  useEffect(() => {
    const companyId = tenantCtx?.selection?.companyId;
    if (!companyId) {
      setActiveCompany(null);
      return;
    }
    let cancelled = false;
    getCompanyDetail(companyId)
      .then((detail) => { if (!cancelled) setActiveCompany(detail); })
      .catch(() => { if (!cancelled) setActiveCompany(null); });
    return () => { cancelled = true; };
  }, [tenantCtx?.selection?.companyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.sessionStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, activeSection);
    } catch {
      /* ignore */
    }
  }, [activeSection]);

  const watchedValues = useWatch<SettingsFormData>({ control });
  const skipPreviewUpdateRef = useRef(false);
  const previewUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeMode = watchedValues?.theme?.mode ?? settings.theme.mode;

  const buildPreviewSafeSettings = useCallback(
    (value: DeepPartial<SettingsFormData> | null | undefined): SettingsFormData | null => {
      if (!value) {
        return null;
      }

      const merged = mergeSettingsDeep(defaultSiteSettings, value);

      const basePermissions =
        persistedSettings.permissions ?? defaultSiteSettings.permissions;

      const permissions: SettingsFormData["permissions"] = {
        ...defaultSiteSettings.permissions,
        ...basePermissions,
        ...merged.permissions,
      };

      return {
        ...merged,
        permissions,
      };
    },
    [persistedSettings.permissions],
  );

  const previewValues = useMemo(
    () => buildPreviewSafeSettings(watchedValues),
    [buildPreviewSafeSettings, watchedValues],
  );

  const currentSettingsForPreview = useMemo(
    () => buildPreviewSafeSettings(settings),
    [buildPreviewSafeSettings, settings],
  );

  const persistedSettingsForPreview = useMemo(
    () => buildPreviewSafeSettings(persistedSettings),
    [buildPreviewSafeSettings, persistedSettings],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!previewValues || !persistedSettingsForPreview) {
      return false;
    }

    return !deepEqual(previewValues, persistedSettingsForPreview);
  }, [persistedSettingsForPreview, previewValues]);

  useEffect(() => {
    if (!previewValues || !currentSettingsForPreview) {
      return;
    }

    if (skipPreviewUpdateRef.current) {
      skipPreviewUpdateRef.current = false;
      return;
    }

    if (deepEqual(previewValues, currentSettingsForPreview)) {
      return;
    }

    if (previewUpdateTimeoutRef.current) {
      clearTimeout(previewUpdateTimeoutRef.current);
    }

    previewUpdateTimeoutRef.current = setTimeout(() => {
      skipPreviewUpdateRef.current = true;
      previewSettings(previewValues);
    }, 150);
  }, [currentSettingsForPreview, previewValues, previewSettings]);

  useEffect(() => {
    return () => {
      if (previewUpdateTimeoutRef.current) {
        clearTimeout(previewUpdateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (themeMode !== "system") {
      lastNonSystemModeRef.current = themeMode;
    }
  }, [themeMode]);

  useEffect(() => {
    if (themeMode === "system") {
      if (resolvedTheme === "light" || resolvedTheme === "dark") {
        lastNonSystemModeRef.current = resolvedTheme;
      } else if (!lastNonSystemModeRef.current) {
        lastNonSystemModeRef.current = "light";
      }
    }
  }, [themeMode, resolvedTheme]);

  useEffect(() => {
    if (firstSave && !deepEqual(persistedSettings, defaultSiteSettings)) {
      setFirstSave(false);
    }
  }, [firstSave, persistedSettings]);

  const handleSave = async (data: SettingsFormData) => {
    try {
      await saveSettings(data);
      if (firstSave) {
        setFirstSave(false);
        toast.success("¡Cambios guardados correctamente!", {
          description: "🎉 Tu configuración ha sido guardada",
          duration: 3000,
        });
      } else {
        toast.success("Cambios guardados correctamente.");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "No se pudieron guardar los cambios.",
      );
    }
  };

  const handleDiscard = () => {
    reset(persistedSettings);
    resetPreview();
    if (hasUnsavedChanges) {
      toast.info("Cambios descartados.");
    }
  };
  
  const handleReset = () => {
    reset(defaultSiteSettings);
    previewSettings(defaultSiteSettings);
    toast.info("Se restablecieron los valores por defecto de esta sección.");
  };

  const handleExport = () => {
    try {
      const data = settings;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "configuracion-sitio.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Configuración exportada correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo exportar la configuración.");
    }
  };

  const handleImport = () => {
    try {
      const parsed = siteSettingsSchema.parse(JSON.parse(importJson));
      reset(parsed);
      previewSettings(parsed);
      setImportDialogOpen(false);
      setImportJson("");
      toast.success("Configuración importada correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("JSON inválido. Verifica el formato.");
    }
  };

  const handleConfirmReset = () => {
    handleReset();
    setConfirmResetOpen(false);
  };

  const handleConfirmExport = () => {
    handleExport();
    setConfirmExportOpen(false);
  };

  const handleConfirmSave = () => {
    void handleSubmit(handleSave)();
    setConfirmSaveOpen(false);
  };

  const handleGenerateBackup = useCallback(async () => {
    setIsBackupPending(true);
    try {
      const response = await authFetch("/api/system/backups", {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          errorText || "No se pudo generar el respaldo del sistema.",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `respaldo-sistema-${new Date().toISOString()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Respaldo generado correctamente.", {
        description: "Se descargó un archivo con los datos actuales del sistema.",
      });
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return;
      }
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo del sistema.",
      );
    } finally {
      setIsBackupPending(false);
    }
  }, [setIsBackupPending]);

  const handlePurgeData = useCallback(async () => {
    try {
      const response = await authFetch("/api/system/purge", {
        method: "POST",
      });

      const data = (await response
        .json()
        .catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(
          data?.message || "No se pudo purgar los datos del sistema.",
        );
      }

      toast.success(data?.message || "Datos del sistema purgados correctamente.");
      router.refresh();
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return;
      }
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo purgar los datos del sistema.",
      );
    } finally {
      setIsPurgeDialogOpen(false);
    }
  }, [router, setIsPurgeDialogOpen]);

  const handleThemeModeChange = useCallback(
    (mode: "light" | "dark" | "system") => {
      setValue("theme.mode", mode, { shouldDirty: true, shouldTouch: true });
      setTheme(mode);
    },
    [setTheme, setValue],
  );

  const presets = useMemo(
    () => [
      {
        id: "shadcn-default",
        label: "Shadcn predeterminado",
        primary: "#0f172a",
        accent: "#f1f5f9",
        bg: "#ffffff",
        text: "#020817",
      },
      {
        id: "blue-classic",
        label: "Azul clásico",
        primary: "#1d4ed8",
        accent: "#3b82f6",
        bg: "#f8fafc",
        text: "#0f172a",
      },
      {
        id: "blue-sky",
        label: "Azul celeste",
        primary: "#0284c7",
        accent: "#7dd3fc",
        bg: "#f0f9ff",
        text: "#0c4a6e",
      },
      {
        id: "blue-night",
        label: "Azul nocturno",
        primary: "#1e3a8a",
        accent: "#60a5fa",
        bg: "#020617",
        text: "#e2e8f0",
      },
    ],
    [],
  );

  if (isContextLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background font-site">
      <header className="sticky top-0 z-40 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuración del sitio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personaliza la apariencia y el comportamiento de tu página web.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 sm:justify-start">
              <Button
                variant={themeMode === "light" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleThemeModeChange("light")}
                className="h-8 w-8 p-0"
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={themeMode === "system" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleThemeModeChange("system")}
                className="h-8 w-8 p-0"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={themeMode === "dark" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleThemeModeChange("dark")}
                className="h-8 w-8 p-0"
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmExportOpen(true)}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar JSON
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar configuración</DialogTitle>
                  <DialogDescription>Pega el JSON de configuración exportado previamente.</DialogDescription>
                </DialogHeader>
                <Textarea
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  placeholder='{"brand": {...}, "theme": {...}}'
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport}>Importar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit lg:sticky lg:top-24">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{section.label}</span>
                  </motion.button>
                );
              })}
            </nav>
          </aside>

          <main>
            <form id="settings-form" onSubmit={handleSubmit(handleSave)} className="space-y-6">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                  {activeSection === "company" && (
                    <CompanySection register={register} errors={errors} control={control} companyData={activeCompany} />
                  )}
                  {activeSection === "brand" && (
                    <BrandSection register={register} errors={errors} setValue={setValue} watch={watch} />
                  )}
                  {activeSection === "theme" && (
                    <ThemeSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                      presets={presets}
                      themeMode={themeMode}
                      onThemeModeChange={handleThemeModeChange}
                      lastNonSystemModeRef={lastNonSystemModeRef}
                    />
                  )}
                  {activeSection === "typography" && (
                    <TypographySection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "layout" && (
                    <LayoutSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "navbar" && (
                    <NavbarSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "hero" && (
                    <HeroSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "components" && (
                    <ComponentsSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "seo" && <SeoSection register={register} errors={errors} />}
                  {activeSection === "integrations" && (
                    <IntegrationsSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "social" && <SocialSection register={register} errors={errors} />}
                  {activeSection === "privacy" && (
                    <PrivacySection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "maintenance" && (
                    <MaintenanceSection
                      register={register}
                      errors={errors}
                      watch={watch}
                      setValue={setValue}
                      control={control}
                    />
                  )}
                  {activeSection === "permissions" && (
                    <PermissionsSection watch={watch} setValue={setValue} />
                  )}
                  {activeSection === "system" && (
                    <SystemDataSection
                      onGenerateBackup={handleGenerateBackup}
                      onPurgeData={handlePurgeData}
                      isBackupPending={isBackupPending}
                      isPurgeDialogOpen={isPurgeDialogOpen}
                      onPurgeDialogOpenChange={setIsPurgeDialogOpen}
                      watch={watch}
                      setValue={setValue}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </form>
          </main>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <motion.div
          className="sticky bottom-4 z-50 border border-border bg-card/95 backdrop-blur-sm"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="animate-pulse">
                  Cambios sin guardar
                </Badge>
              )}
              {hasConflict && (
                <Badge variant="destructive" className="gap-2">
                  <AlertCircle className="h-3 w-3" />
                  Configuración actualizada en otro lugar
                </Badge>
              )}
            </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="gap-2 bg-transparent"
              >
                <RotateCcw className="h-4 w-4" />
                Restablecer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={!hasUnsavedChanges || isSaving}
                className="gap-2 bg-transparent"
              >
                <X className="h-4 w-4" />
                Descartar
              </Button>
              <Button
                type="submit"
                form="settings-form"
                disabled={!hasUnsavedChanges || isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="h-24" />

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de los cambios que desea realizar antes de proseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de los cambios que desea realizar antes de proseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExport}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de los cambios que desea realizar antes de proseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SystemDataSection({
  onGenerateBackup,
  onPurgeData,
  isBackupPending,
  isPurgeDialogOpen,
  onPurgeDialogOpenChange,
  watch,
  setValue,
}: SystemDataSectionProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const systemSettings = watch("system") ?? defaultValues.system;
  const autoBackupFrequency = systemSettings.autoBackupFrequency ?? defaultValues.system.autoBackupFrequency;
  const lastAutoBackupAt = systemSettings.lastAutoBackupAt ?? null;
  const formattedLastBackup =
    lastAutoBackupAt != null
      ? new Intl.DateTimeFormat("es-PE", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(lastAutoBackupAt))
      : "Nunca se ha ejecutado";

  useEffect(() => {
    if (!isPurgeDialogOpen) {
      setConfirmationText("");
      setAcknowledged(false);
    }
  }, [isPurgeDialogOpen]);

  const confirmationPhrase = "PURGAR SISTEMA";
  const isConfirmationTextValid =
    confirmationText.trim().toUpperCase() === confirmationPhrase;
  const canConfirmPurge = isConfirmationTextValid && acknowledged;

  const backupOptions: { value: SiteSettings["system"]["autoBackupFrequency"]; label: string }[] = [
    { value: "manual", label: "Manual" },
    { value: "daily", label: "Diario" },
    { value: "weekly", label: "Semanal" },
    { value: "biweekly", label: "Cada 15 días" },
    { value: "monthly", label: "Mensual" },
  ];

  const handleConfirmPurge = () => {
    if (!canConfirmPurge) {
      return;
    }
    void onPurgeData();
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Programación automática
          </CardTitle>
          <CardDescription>
            Define cada cuánto tiempo los administradores obtendrán una copia de seguridad de esta
            organización.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="auto-backup-frequency">Frecuencia</Label>
              <p className="text-xs text-muted-foreground">
                Los respaldos se generan en segundo plano y se guardan en el servidor.
              </p>
            </div>
            <Select
              value={autoBackupFrequency}
              onValueChange={(value) =>
                setValue(
                  "system.autoBackupFrequency",
                  value as SiteSettings["system"]["autoBackupFrequency"],
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger id="auto-backup-frequency" className="w-full sm:w-60">
                <SelectValue placeholder="Selecciona frecuencia" />
              </SelectTrigger>
              <SelectContent>
                {backupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium text-muted-foreground">Último respaldo automático</p>
            <p className="text-foreground">{formattedLastBackup}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Respaldo del sistema
          </CardTitle>
          <CardDescription>
            Genera un archivo descargable con una copia de seguridad de la base de datos
            actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Usa esta opción para resguardar la información antes de ejecutar acciones
            destructivas o realizar migraciones.
          </p>
          <Button
            type="button"
            onClick={() => void onGenerateBackup()}
            disabled={isBackupPending}
            className="gap-2"
          >
            {isBackupPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isBackupPending ? "Generando respaldo..." : "Generar respaldo"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Database className="h-5 w-5" />
            Purga total de datos
          </CardTitle>
          <CardDescription>
            Elimina toda la información operativa del sistema y conserva únicamente las
            cuentas de usuario registradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta acción es irreversible. Asegúrate de contar con un respaldo reciente y de
            haber notificado a tu equipo antes de continuar.
          </p>
          <AlertDialog open={isPurgeDialogOpen} onOpenChange={onPurgeDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full sm:w-auto">
                Purgar datos del sistema
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Purgar definitivamente los datos?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-muted-foreground text-sm">
                    <p>
                      Esta operación eliminará catálogos, configuraciones, inventarios y
                      registros históricos.{" "}
                      <strong>Solo se preservarán las cuentas de usuario</strong> para permitir el acceso
                      posterior.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="purge-confirmation">Escribe "{confirmationPhrase}" para confirmar.</Label>
                      <Input
                        id="purge-confirmation"
                        value={confirmationText}
                        onChange={(event) => setConfirmationText(event.target.value)}
                        placeholder={confirmationPhrase}
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="purge-acknowledge"
                        checked={acknowledged}
                        onCheckedChange={(checked:any) => setAcknowledged(checked === true)}
                      />
                      <Label htmlFor="purge-acknowledge" className="text-sm font-normal leading-tight">
                        Entiendo que esta purga no se puede deshacer y que todos los datos serán
                        eliminados de forma permanente.
                      </Label>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction disabled={!canConfirmPurge} onClick={handleConfirmPurge}>
                  Confirmar purga
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function CompanySection({ register, errors, control, companyData }: SimpleSectionProps & { companyData?: CompanyDetail | null }) {
  if (!control) {
    return null;
  }

  const companyName = companyData?.sunatBusinessName || companyData?.legalName || companyData?.name || "";
  const companyRuc = companyData?.sunatRuc || companyData?.taxId || "";
  const companyAddress = companyData?.sunatAddress || "";

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Empresa</CardTitle>
        <CardDescription>Define la información principal de tu empresa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Datos de Company (readonly — se editan en Tenancy) */}
        {companyData && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Estos datos provienen de tu empresa. Para editarlos, ve a la sección de empresas.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nombre / Razón social</Label>
                <p className="text-sm font-medium">{companyName || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">RUC</Label>
                <p className="text-sm font-medium">{companyRuc || "—"}</p>
              </div>
              {companyAddress && (
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Dirección fiscal</Label>
                  <p className="text-sm font-medium">{companyAddress}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Controller
          control={control}
          name="company.receiptFormat"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Formato de comprobante</Label>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a4" id="receipt-format-a4" />
                  <Label htmlFor="receipt-format-a4" className="font-normal cursor-pointer">
                    Hoja A4
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ticket" id="receipt-format-ticket" />
                  <Label htmlFor="receipt-format-ticket" className="font-normal cursor-pointer">
                    Ticket (80mm)
                  </Label>
                </div>
              </RadioGroup>
              {errors.company?.receiptFormat?.message && (
                <p className="text-sm text-destructive">{errors.company.receiptFormat.message}</p>
              )}
            </div>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyPhone">Teléfono</Label>
            <Input id="companyPhone" {...register("company.phone")} placeholder="(+51) 999 999 999" />
            {errors.company?.phone?.message && (
              <p className="text-sm text-destructive">{errors.company.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Correo electrónico</Label>
            <Input
              id="companyEmail"
              type="email"
              {...register("company.email")}
              placeholder="ventas@miempresa.com"
            />
            {errors.company?.email?.message && (
              <p className="text-sm text-destructive">{errors.company.email.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandSection({ register, errors, setValue, watch }: BrandSectionProps) {
  const logoUrl = watch("brand.logoUrl");
  const faviconUrl = watch("brand.faviconUrl");
  const handleFileUpload = (
    event: ChangeEvent<HTMLInputElement>,
    field: "logoUrl" | "faviconUrl",
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const formField: "brand.logoUrl" | "brand.faviconUrl" =
          field === "logoUrl" ? "brand.logoUrl" : "brand.faviconUrl";
        setValue(formField, reader.result, { shouldDirty: true });
      }
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Marca</CardTitle>
        <CardDescription>Configura el nombre, logo y favicon de tu sitio web.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="siteName">Nombre del sitio *</Label>
          <Input id="siteName" {...register("brand.siteName")} placeholder="Mi Sitio Web" />
          {errors.brand?.siteName?.message && (
            <p className="text-sm text-destructive">{errors.brand.siteName.message}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del logo</Label>
            <Input id="logoUrl" {...register("brand.logoUrl")} placeholder="https://ejemplo.com/logo.png" />
            <Input
              id="logoFile"
              type="file"
              accept="image/*"
              onChange={(event) => handleFileUpload(event, "logoUrl")}
            />
            <DeleteActionsGuard>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setValue("brand.logoUrl", "", { shouldDirty: true, shouldValidate: true })}
                >
                  <X className="h-4 w-4" />
                  Eliminar imagen
                </Button>
              )}
            </DeleteActionsGuard>
            <p className="text-xs text-muted-foreground">
              PNG o SVG recomendado. Puedes subir un archivo o proporcionar una URL.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="faviconUrl">URL del favicon</Label>
            <Input id="faviconUrl" {...register("brand.faviconUrl")} placeholder="https://ejemplo.com/favicon.ico" />
            <Input
              id="faviconFile"
              type="file"
              accept="image/*"
              onChange={(event) => handleFileUpload(event, "faviconUrl")}
            />
            <DeleteActionsGuard>
              {faviconUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setValue("brand.faviconUrl", "", { shouldDirty: true, shouldValidate: true })}
                >
                  <X className="h-4 w-4" />
                  Eliminar imagen
                </Button>
              )}
            </DeleteActionsGuard>
            <p className="text-xs text-muted-foreground">
              ICO, PNG o SVG. Puedes subir un archivo o proporcionar una URL.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="mb-2 text-sm font-medium">Vista previa</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-background">
                {logoUrl ? (
                  <img src={logoUrl} alt="Vista previa del logo" className="h-full w-full object-contain" />
                ) : (
                  <Sparkles className="h-8 w-8 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Logo</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-card">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Vista previa del favicon" className="h-full w-full object-contain" />
                ) : (
                  <Sparkles className="h-6 w-6 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Favicon</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ThemeSectionProps = SectionProps & {
  presets: { id: string; label: string; primary: string; accent: string; bg: string; text: string }[];
  themeMode: "light" | "dark" | "system";
  onThemeModeChange: (mode: "light" | "dark" | "system") => void;
  lastNonSystemModeRef: MutableRefObject<"light" | "dark">;
};

function ThemeSection({ control, setValue, presets, themeMode, onThemeModeChange, lastNonSystemModeRef }: ThemeSectionProps) {
  const colors = useWatch({ control, name: "theme.colors" }) ?? defaultValues.theme.colors;
  const autoThemeEnabled = themeMode === "system";

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Colores y tema</CardTitle>
        <CardDescription>Personaliza la paleta de colores y el tema de tu sitio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Presets de color</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <motion.button
                key={preset.id}
                type="button"
                onClick={() => {
                  setValue("theme.colors.primary", preset.primary, { shouldDirty: true });
                  setValue("theme.colors.accent", preset.accent, { shouldDirty: true });
                  setValue("theme.colors.bg", preset.bg, { shouldDirty: true });
                  setValue("theme.colors.text", preset.text, { shouldDirty: true });
                  setValue("theme.preset", preset.id, { shouldDirty: true });
                }}
                className="rounded-xl border-2 border-border p-4 text-left transition-colors hover:border-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="mb-2 grid grid-cols-4 gap-2">
                  <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: preset.primary }} />
                  <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: preset.accent }} />
                  <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: preset.bg }} />
                  <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: preset.text }} />
                </div>
                <p className="text-sm font-medium">{preset.label}</p>
              </motion.button>
            ))}
          </div>
        </div>

        <ColorField control={control} name="theme.colors.primary" label="Color primario" placeholder="#0f172a" />
        <ColorField control={control} name="theme.colors.text" label="Color de texto" placeholder="#020817" />

        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="autoTheme">Usar modo oscuro automático</Label>
            <p className="mt-1 text-xs text-muted-foreground">Cambia según las preferencias del sistema</p>
          </div>
          <Switch
            id="autoTheme"
            checked={autoThemeEnabled}
            onCheckedChange={(checked: boolean) => {
              const resolvedMode =
                themeMode === "system"
                  ? lastNonSystemModeRef.current ?? "light"
                  : themeMode;

              const nextMode = checked ? "system" : resolvedMode;
              if (!checked) {
                lastNonSystemModeRef.current = resolvedMode;
              }
              onThemeModeChange(nextMode);
            }}
          />
        </div>

        <ColorField control={control} name="theme.colors.bg" label="Color de fondo" placeholder="#ffffff" />
        <ColorField control={control} name="theme.colors.text" label="Color de texto" placeholder="#0f172a" />

        <div className="space-y-2 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">Vista previa de colores</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="h-16 rounded-lg" style={{ backgroundColor: colors.primary }} />
            <div className="h-16 rounded-lg" style={{ backgroundColor: colors.accent }} />
            <div className="h-16 rounded-lg border-2" style={{ backgroundColor: colors.bg }} />
            <div className="h-16 rounded-lg" style={{ backgroundColor: colors.text }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ColorFieldProps = {
  control: FormControl;
  name: "theme.colors.primary" | "theme.colors.accent" | "theme.colors.bg" | "theme.colors.text";
  label: string;
  placeholder: string;
};

function ColorField({ control, name, label, placeholder }: ColorFieldProps) {
  return (
    <Controller<SettingsFormData, ColorFieldProps["name"]>
      name={name}
      control={control}
      render={({ field }) => {
        const baseId = name.replace(/\./g, "-");
        const colorId = `${baseId}-color`;
        const textId = `${baseId}-text`;

        return (
          <div className="space-y-2">
            <Label htmlFor={textId}>{label}</Label>
            <div className="flex gap-2">
              <Input
                id={colorId}
                type="color"
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
                className="h-10 w-20"
              />
              <Input
                id={textId}
                ref={field.ref}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                placeholder={placeholder}
                className="flex-1"
              />
            </div>
          </div>
        );
      }}
    />
  );
}

function TypographySection({ watch, setValue }: SectionProps) {
  const fontFamily = watch("typography.fontFamily") ?? defaultValues.typography.fontFamily;
  const baseSize = watch("typography.baseSize") ?? defaultValues.typography.baseSize;
  const scale = watch("typography.scale") ?? defaultValues.typography.scale;
  const fontDefinition = getTypographyFont(fontFamily);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Tipografía</CardTitle>
        <CardDescription>Configura las fuentes y tamaños de texto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fontFamily">Familia de fuente</Label>
          <Select
            value={fontFamily}
            onValueChange={(value:any) =>
              setValue("typography.fontFamily", value as SettingsFormData["typography"]["fontFamily"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPOGRAPHY_FONT_OPTIONS.map((option:any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseSize">Tamaño base: {baseSize}px</Label>
          <Slider
            id="baseSize"
            min={12}
            max={24}
            step={1}
            value={[baseSize]}
            onValueChange={(value: number[]) =>
              setValue("typography.baseSize", value[0] ?? defaultValues.typography.baseSize, {
                shouldDirty: true,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scale">Escala tipográfica: {scale.toFixed(2)}</Label>
          <Slider
            id="scale"
            min={1}
            max={2}
            step={0.05}
            value={[scale]}
            onValueChange={(value: number[]) =>
              setValue("typography.scale", value[0] ?? defaultValues.typography.scale, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-4 rounded-lg bg-muted p-6">
          <p className="text-sm font-medium">Vista previa</p>
          <div
            className={fontDefinition.className}
            style={{ fontFamily: fontDefinition.cssVariable, fontSize: `${baseSize}px` }}
          >
            <h1 style={{ fontSize: `${baseSize * scale * scale * scale}px`, fontWeight: 700 }}>Título principal</h1>
            <h2 style={{ fontSize: `${baseSize * scale * scale}px`, fontWeight: 600 }}>Subtítulo secundario</h2>
            <p style={{ fontSize: `${baseSize}px`, lineHeight: 1.6 }}>
              Este es un ejemplo de texto de párrafo con el tamaño base configurado. La tipografía es fundamental para
              la legibilidad y la experiencia del usuario.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LayoutSection({ watch, setValue }: SectionProps) {
  const container = watch("layout.container") ?? defaultValues.layout.container;
  const spacing = watch("layout.spacing") ?? defaultValues.layout.spacing;
  const radius = watch("layout.radius") ?? defaultValues.layout.radius;
  const shadow = watch("layout.shadow") ?? defaultValues.layout.shadow;
  const buttonStyle = watch("layout.buttonStyle") ?? defaultValues.layout.buttonStyle;

  const shadowStyle = useMemo(() => {
    switch (shadow) {
      case "sm":
        return "0 1px 2px 0 rgb(0 0 0 / 0.05)";
      case "md":
        return "0 4px 6px -1px rgb(0 0 0 / 0.1)";
      case "lg":
        return "0 10px 15px -3px rgb(0 0 0 / 0.1)";
      default:
        return "none";
    }
  }, [shadow]);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Diseño</CardTitle>
        <CardDescription>Configura el ancho del contenedor, espaciado y estilos visuales.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="container">Ancho del contenedor</Label>
          <Select
            value={container}
            onValueChange={(value:any) => setValue("layout.container", value as SettingsFormData["layout"]["container"], { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeño (640px)</SelectItem>
              <SelectItem value="md">Mediano (768px)</SelectItem>
              <SelectItem value="lg">Grande (1024px)</SelectItem>
              <SelectItem value="full">Ancho completo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="spacing">Espaciado base: {spacing}</Label>
          <Slider
            id="spacing"
            min={0}
            max={10}
            step={1}
            value={[spacing]}
            onValueChange={(value: number[]) =>
              setValue("layout.spacing", value[0] ?? defaultValues.layout.spacing, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius">Radio de bordes: {radius.toFixed(2)}rem</Label>
          <Slider
            id="radius"
            min={0}
            max={2}
            step={0.05}
            value={[radius]}
            onValueChange={(value: number[]) =>
              setValue("layout.radius", value[0] ?? defaultValues.layout.radius, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shadow">Sombras</Label>
          <Select
            value={shadow}
            onValueChange={(value:any) => setValue("layout.shadow", value as SettingsFormData["layout"]["shadow"], { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin sombra</SelectItem>
              <SelectItem value="sm">Pequeña</SelectItem>
              <SelectItem value="md">Mediana</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="buttonStyle">Estilo de botones</Label>
          <Select
            value={buttonStyle}
            onValueChange={(value:any) =>
              setValue("layout.buttonStyle", value as SettingsFormData["layout"]["buttonStyle"], { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded">Redondeado</SelectItem>
              <SelectItem value="pill">Píldora</SelectItem>
              <SelectItem value="rectangular">Rectangular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 rounded-lg bg-muted p-6">
          <p className="text-sm font-medium">Vista previa</p>
          <div
            className="border bg-card p-4"
            style={{
              borderRadius: `${radius}rem`,
              boxShadow: shadowStyle,
              gap: `${spacing * 0.25}rem`,
            }}
          >
            <p className="mb-4 text-sm">Tarjeta de ejemplo</p>
            <Button
              type="button"
              style={{
                borderRadius:
                  buttonStyle === "pill" ? "9999px" : buttonStyle === "rectangular" ? "0.25rem" : `${radius}rem`,
              }}
            >
              Botón de ejemplo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NavbarSection({ watch, setValue }: SectionProps) {
  const links = watch("navbar.links") ?? defaultValues.navbar.links;
  const style = watch("navbar.style") ?? defaultValues.navbar.style;
  const position = watch("navbar.position") ?? defaultValues.navbar.position;
  const showSearch = watch("navbar.showSearch") ?? defaultValues.navbar.showSearch;

  const addLink = () => {
    const updated = [...links, { label: "Nuevo enlace", href: "#" }];
    setValue("navbar.links", updated, { shouldDirty: true });
  };

  const removeLink = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    setValue("navbar.links", updated, { shouldDirty: true });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Navegación</CardTitle>
        <CardDescription>Configura el estilo y contenido de la barra de navegación.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="navStyle">Estilo de navbar</Label>
            <Select
              value={style}
              onValueChange={(value:any) => setValue("navbar.style", value as SettingsFormData["navbar"]["style"], { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="transparent">Transparente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="navPosition">Posición</Label>
            <Select
              value={position}
              onValueChange={(value:any) =>
                setValue("navbar.position", value as SettingsFormData["navbar"]["position"], { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fija</SelectItem>
                <SelectItem value="static">Estática</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="showSearch">Mostrar búsqueda</Label>
            <p className="mt-1 text-xs text-muted-foreground">Incluir barra de búsqueda en el navbar</p>
          </div>
          <Switch
            id="showSearch"
            checked={showSearch}
            onCheckedChange={(checked: boolean) =>
              setValue("navbar.showSearch", checked, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enlaces del menú</Label>
            <Button type="button" size="sm" onClick={addLink}>
              Agregar enlace
            </Button>
          </div>

          <div className="space-y-2">
            {links.map((link, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Etiqueta"
                  value={link.label}
                  onChange={(event) => {
                    const updated = [...links];
                    updated[index] = { ...updated[index], label: event.target.value };
                    setValue("navbar.links", updated, { shouldDirty: true });
                  }}
                />
                <Input
                  placeholder="URL"
                  value={link.href}
                  onChange={(event) => {
                    const updated = [...links];
                    updated[index] = { ...updated[index], href: event.target.value };
                    setValue("navbar.links", updated, { shouldDirty: true });
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => removeLink(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroSection({ register, errors, watch, setValue }: SectionProps) {
  const enableCarousel = watch("hero.enableCarousel") ?? defaultValues.hero.enableCarousel;
  const speed = watch("hero.speed") ?? defaultValues.hero.speed;
  const particles = watch("hero.particles") ?? defaultValues.hero.particles;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Hero/Banner</CardTitle>
        <CardDescription>Configura el contenido y efectos de la sección hero.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="heroTitle">Título</Label>
          <Input id="heroTitle" {...register("hero.title")} placeholder="Bienvenido" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Subtítulo</Label>
          <Textarea id="heroSubtitle" {...register("hero.subtitle")} placeholder="Descripción breve" rows={3} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ctaLabel">Texto del botón CTA</Label>
            <Input id="ctaLabel" {...register("hero.ctaLabel")} placeholder="Comenzar" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctaHref">URL del botón CTA</Label>
            <Input id="ctaHref" {...register("hero.ctaHref")} placeholder="https://ejemplo.com" />
            {errors.hero?.ctaHref?.message && (
              <p className="text-sm text-destructive">{errors.hero.ctaHref.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="enableCarousel">Habilitar carrusel</Label>
            <p className="mt-1 text-xs text-muted-foreground">Mostrar múltiples imágenes en rotación</p>
          </div>
          <Switch
            id="enableCarousel"
            checked={enableCarousel}
            onCheckedChange={(checked: boolean) =>
              setValue("hero.enableCarousel", checked, { shouldDirty: true })
            }
          />
        </div>

        {enableCarousel && (
          <div className="space-y-2">
            <Label htmlFor="carouselSpeed">Velocidad del carrusel: {speed}s</Label>
            <Slider
              id="carouselSpeed"
              min={1}
              max={10}
              step={1}
              value={[speed]}
              onValueChange={(value: number[]) =>
                setValue("hero.speed", value[0] ?? defaultValues.hero.speed, { shouldDirty: true })
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="particles">Mostrar partículas suaves</Label>
            <p className="mt-1 text-xs text-muted-foreground">Efecto visual de fondo animado</p>
          </div>
          <Switch
            id="particles"
            checked={particles}
            onCheckedChange={(checked: boolean) =>
              setValue("hero.particles", checked, { shouldDirty: true })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentsSection({ watch, setValue }: SectionProps) {
  const cardStyle = watch("components.cardStyle") ?? defaultValues.components.cardStyle;
  const chipStyle = watch("components.chipStyle") ?? defaultValues.components.chipStyle;
  const tableDensity = watch("components.tableDensity") ?? defaultValues.components.tableDensity;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Contenido y componentes</CardTitle>
        <CardDescription>Configura el estilo de tarjetas, etiquetas y tablas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cardStyle">Diseño de tarjetas</Label>
          <Select
            value={cardStyle}
            onValueChange={(value:any) =>
              setValue("components.cardStyle", value as SettingsFormData["components"]["cardStyle"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="border">Con borde</SelectItem>
              <SelectItem value="shadow">Con sombra</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chipStyle">Estilo de chips/etiquetas</Label>
          <Select
            value={chipStyle}
            onValueChange={(value:any) =>
              setValue("components.chipStyle", value as SettingsFormData["components"]["chipStyle"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Sólido</SelectItem>
              <SelectItem value="outline">Contorno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tableDensity">Densidad de tablas</Label>
          <Select
            value={tableDensity}
            onValueChange={(value:any) =>
              setValue("components.tableDensity", value as SettingsFormData["components"]["tableDensity"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 rounded-lg bg-muted p-6">
          <p className="text-sm font-medium">Vista previa</p>
          <div className={`rounded-lg bg-card p-4 ${cardStyle === "border" ? "border-2" : "shadow-lg"}`}>
            <p className="mb-2 text-sm font-medium">Tarjeta de ejemplo</p>
            <div className="flex gap-2">
              <Badge variant={chipStyle === "solid" ? "default" : "outline"}>Etiqueta 1</Badge>
              <Badge variant={chipStyle === "solid" ? "default" : "outline"}>Etiqueta 2</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeoSection({ register, errors }: SimpleSectionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>SEO y Metadatos</CardTitle>
        <CardDescription>Configura los metadatos para optimización en motores de búsqueda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="defaultTitle">Título por defecto *</Label>
          <Input id="defaultTitle" {...register("seo.defaultTitle")} placeholder="Mi Sitio Web" />
          {errors.seo?.defaultTitle?.message && (
            <p className="text-sm text-destructive">{errors.seo.defaultTitle.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultDescription">Descripción por defecto *</Label>
          <Textarea
            id="defaultDescription"
            {...register("seo.defaultDescription")}
            placeholder="Descripción de tu sitio web"
            rows={3}
          />
          {errors.seo?.defaultDescription?.message && (
            <p className="text-sm text-destructive">{errors.seo.defaultDescription.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ogImage">Imagen Open Graph</Label>
          <Input id="ogImage" {...register("seo.ogImage")} placeholder="https://ejemplo.com/og-image.jpg" />
          <p className="text-xs text-muted-foreground">
            Imagen que aparece al compartir en redes sociales (1200x630px recomendado)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseSlug">Slug base</Label>
          <Input id="baseSlug" {...register("seo.baseSlug")} placeholder="mi-sitio" />
          <p className="text-xs text-muted-foreground">Usado para generar URLs amigables</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsSection({ register, watch, setValue }: SectionProps) {
  const loadOnCookieAccept = watch("integrations.loadOnCookieAccept") ?? defaultValues.integrations.loadOnCookieAccept;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Integraciones</CardTitle>
        <CardDescription>Configura las integraciones con servicios de terceros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="gaId">Google Analytics ID</Label>
          <Input id="gaId" {...register("integrations.gaId")} placeholder="G-XXXXXXXXXX" />
          <p className="text-xs text-muted-foreground">Formato: G-XXXXXXXXXX o UA-XXXXXXXXX-X</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaPixelId">Pixel de Meta (Facebook)</Label>
          <Input id="metaPixelId" {...register("integrations.metaPixelId")} placeholder="123456789012345" />
          <p className="text-xs text-muted-foreground">ID numérico de 15 dígitos</p>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="loadOnCookieAccept">Cargar scripts al aceptar cookies</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Los scripts de seguimiento solo se cargarán después de que el usuario acepte
            </p>
          </div>
          <Switch
            id="loadOnCookieAccept"
            checked={loadOnCookieAccept}
            onCheckedChange={(checked:any) => setValue("integrations.loadOnCookieAccept", checked, { shouldDirty: true })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SocialSection({ register, errors }: SimpleSectionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Redes sociales</CardTitle>
        <CardDescription>Agrega los enlaces a tus perfiles de redes sociales.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="facebook">Facebook</Label>
          <Input id="facebook" {...register("social.facebook")} placeholder="https://facebook.com/tupagina" />
          {errors.social?.facebook?.message && (
            <p className="text-sm text-destructive">{errors.social.facebook.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" {...register("social.instagram")} placeholder="https://instagram.com/tuusuario" />
          {errors.social?.instagram?.message && (
            <p className="text-sm text-destructive">{errors.social.instagram.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tiktok">TikTok</Label>
          <Input id="tiktok" {...register("social.tiktok")} placeholder="https://tiktok.com/@tuusuario" />
          {errors.social?.tiktok?.message && (
            <p className="text-sm text-destructive">{errors.social.tiktok.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="youtube">YouTube</Label>
          <Input id="youtube" {...register("social.youtube")} placeholder="https://youtube.com/@tucanal" />
          {errors.social?.youtube?.message && (
            <p className="text-sm text-destructive">{errors.social.youtube.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="x">X (Twitter)</Label>
          <Input id="x" {...register("social.x")} placeholder="https://x.com/tuusuario" />
          {errors.social?.x?.message && <p className="text-sm text-destructive">{errors.social.x.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacySection({ register, errors, watch, setValue }: SectionProps) {
  const cookieBanner = watch("privacy.cookieBanner") ?? defaultValues.privacy.cookieBanner;
  const cookieText = watch("privacy.cookieText") ?? defaultValues.privacy.cookieText;
  const acceptText = watch("privacy.acceptText") ?? defaultValues.privacy.acceptText;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Privacidad</CardTitle>
        <CardDescription>Configura el banner de cookies y políticas de privacidad.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="cookieBanner">Banner de cookies</Label>
            <p className="mt-1 text-xs text-muted-foreground">Mostrar aviso de uso de cookies</p>
          </div>
          <Switch
            id="cookieBanner"
            checked={cookieBanner}
            onCheckedChange={(checked: boolean) =>
              setValue("privacy.cookieBanner", checked, { shouldDirty: true })
            }
          />
        </div>

        {cookieBanner && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cookieText">Texto del banner</Label>
              <Textarea
                id="cookieText"
                {...register("privacy.cookieText")}
                placeholder="Este sitio utiliza cookies..."
                rows={3}
              />
              {errors.privacy?.cookieText?.message && (
                <p className="text-sm text-destructive">{errors.privacy.cookieText.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="acceptText">Texto del botón de aceptar</Label>
              <Input id="acceptText" {...register("privacy.acceptText")} placeholder="Aceptar" />
              {errors.privacy?.acceptText?.message && (
                <p className="text-sm text-destructive">{errors.privacy.acceptText.message}</p>
              )}
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">Vista previa</p>
              <div className="flex items-center justify-between gap-4 rounded-lg border-2 bg-card p-4">
                <p className="text-sm">{cookieText}</p>
                <Button size="sm">{acceptText}</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceSection({ register, errors, watch, setValue }: SectionProps) {
  const enabled = watch("maintenance.enabled") ?? defaultValues.maintenance.enabled;
  const message = watch("maintenance.message") ?? defaultValues.maintenance.message;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Modo mantenimiento</CardTitle>
        <CardDescription>Activa el modo mantenimiento para mostrar un mensaje a los visitantes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label htmlFor="maintenanceEnabled">Activar modo mantenimiento</Label>
            <p className="mt-1 text-xs text-muted-foreground">Los visitantes verán solo el mensaje de mantenimiento</p>
          </div>
          <Switch
            id="maintenanceEnabled"
            checked={enabled}
            onCheckedChange={(checked: boolean) =>
              setValue("maintenance.enabled", checked, { shouldDirty: true })
            }
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Mensaje para visitantes</Label>
              <Textarea
                id="maintenanceMessage"
                {...register("maintenance.message")}
                placeholder="Estamos realizando mantenimiento..."
                rows={4}
              />
              {errors.maintenance?.message?.message && (
                <p className="text-sm text-destructive">{errors.maintenance?.message?.message}</p>
              )}
            </div>

            <div className="space-y-4 rounded-lg bg-muted p-6">
              <p className="text-sm font-medium">Vista previa</p>
              <div className="rounded-lg border-2 bg-card p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                <p className="text-lg font-medium">{message}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PermissionsSection({ watch, setValue }: PermissionsSectionProps) {
  const { role } = useAuth();
  const isSuperAdminGlobal = role?.toUpperCase() === "SUPER_ADMIN_GLOBAL";
  const permissions = watch("permissions");
  const currentPermissions = permissions ?? defaultValues.permissions;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Permisos de usuarios</CardTitle>
        <CardDescription>
          Define a qué módulos puede acceder cada usuario de la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionModules.map((module) => {
          const inputId = `permissions-${module.key}`;

          return (
            <div
              key={module.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="space-y-1">
                <Label htmlFor={inputId} className="text-base font-medium">
                  {module.label}
                </Label>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
              <Checkbox
                id={inputId}
                checked={currentPermissions[module.key] ?? false}
                onCheckedChange={(checked:any) =>
                  setValue(
                    "permissions",
                    {
                      ...currentPermissions,
                      [module.key]: checked === true,
                    },
                    { shouldDirty: true },
                  )
                }
                aria-label={`Activar acceso a ${module.label}`}
              />
            </div>
          );
        })}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="permissions-hidePurchaseCost" className="text-base font-medium">
              Ocultar precios de compra
            </Label>
            <p className="text-sm text-muted-foreground">
              Evita mostrar el costo de compra en Productos e Inventario para mejorar la confidencialidad.
            </p>
          </div>
          <Checkbox
            id="permissions-hidePurchaseCost"
            checked={currentPermissions.hidePurchaseCost ?? false}
            onCheckedChange={(checked) =>
              setValue(
                "permissions",
                {
                  ...currentPermissions,
                  hidePurchaseCost: checked === true,
                },
                { shouldDirty: true },
              )
            }
            aria-label="Activar ocultamiento de precios de compra"
          />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="permissions-hideDeleteForEmployees" className="text-base font-medium">
              Ocultar eliminación para empleados
            </Label>
            <p className="text-sm text-muted-foreground">
              Quita los botones de eliminado para usuarios con rol Empleado.
            </p>
          </div>
          <Checkbox
            id="permissions-hideDeleteForEmployees"
            checked={currentPermissions.hideDeleteForEmployees ?? false}
            onCheckedChange={(checked) =>
              setValue(
                "permissions",
                {
                  ...currentPermissions,
                  hideDeleteForEmployees: checked === true,
                },
                { shouldDirty: true },
              )
            }
            aria-label="Ocultar eliminación para empleados"
          />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="permissions-hideDeleteForAdmins" className="text-base font-medium">
              Ocultar eliminación para administradores
            </Label>
            <p className="text-sm text-muted-foreground">
              Quita los botones de eliminado para usuarios con rol Administrador. Los super administradores globales
              y de organización siempre los verán.
            </p>
          </div>
          <Checkbox
            id="permissions-hideDeleteForAdmins"
            checked={currentPermissions.hideDeleteForAdmins ?? false}
            onCheckedChange={(checked) =>
              setValue(
                "permissions",
                {
                  ...currentPermissions,
                  hideDeleteForAdmins: checked === true,
                },
                { shouldDirty: true },
              )
            }
            aria-label="Ocultar eliminación para administradores"
          />
        </div>
        {isSuperAdminGlobal && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="space-y-1">
              <Label htmlFor="permissions-whatsapp" className="text-base font-medium">
                WhatsApp
              </Label>
              <p className="text-sm text-muted-foreground">
                Habilitar el módulo de mensajería y automatizaciones de WhatsApp.
              </p>
            </div>
            <Checkbox
              id="permissions-whatsapp"
              checked={currentPermissions.whatsapp ?? false}
              onCheckedChange={(checked) =>
                setValue(
                  "permissions",
                  {
                    ...currentPermissions,
                    whatsapp: checked === true,
                  },
                  { shouldDirty: true },
                )
              }
              aria-label="Activar módulo de WhatsApp"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { MaintenanceSection, PermissionsSection };
