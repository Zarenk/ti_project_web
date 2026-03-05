"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeSearch } from "@/lib/utils";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { useAuth } from "@/context/auth-context";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowLeftRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  Truck,
  User,
  Weight,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { UbigeoCombobox } from "@/components/ubigeo-combobox";
import { CatalogStepper, type StepDef } from "../../catalog/catalog-stepper";

import { getCompanyDetail } from "../../tenancy/tenancy.api";
import { getRegisteredClients, createClient, checkClientExists } from "../../clients/clients.api";
import { createProvider, checkProviderExists, getProviders } from "../../providers/providers.api";
import { createProduct } from "../../products/products.api";
import {
  lookupSunatDocument,
  type LookupResponse,
} from "../../sales/sales.api";
import {
  createShippingGuide,
  validateShippingGuide,
  type CreateGuidePayload,
} from "../transfers.api";
import {
  getAllStores,
  getProductsByStore,
  getSeriesByProductAndStore,
} from "../../inventory/inventory.api";
import { isSubscriptionBlockedError } from "@/lib/subscription-error";
import { SubscriptionBlockedDialog } from "@/components/subscription-blocked-dialog";

// ── Zod schema ────────────────────────────────────────────────
const itemSchema = z.object({
  codigo: z.string().min(1, "Requerido"),
  descripcion: z.string().min(1, "Requerido"),
  cantidad: z.coerce.number().min(0.01, "Mayor a 0"),
  unidadMedida: z.string().min(1, "Requerido"),
  isManual: z.boolean().optional().default(false),
  saveAsProduct: z.boolean().optional().default(false),
});

const guideFormSchema = z
  .object({
    tipoDocumentoRemitente: z.string().default("6"),
    numeroDocumentoRemitente: z.string().min(1, "Ingrese RUC"),
    razonSocialRemitente: z.string().min(1, "Ingrese razon social"),
    destinatarioTipoDoc: z.string().min(1, "Seleccione tipo"),
    destinatarioNumeroDoc: z.string().min(1, "Ingrese numero"),
    destinatarioRazonSocial: z.string().min(1, "Ingrese razon social"),
    motivoTrasladoCodigo: z.string().min(1, "Seleccione motivo"),
    motivoTraslado: z.string().optional(),
    fechaTraslado: z.string().min(1, "Seleccione fecha"),
    modalidadTraslado: z.string().default("01"),
    puntoPartida: z.string().min(1, "Ingrese punto de partida"),
    puntoPartidaUbigeo: z.string().min(6, "Ingrese ubigeo (6 digitos)"),
    puntoLlegada: z.string().min(1, "Ingrese punto de llegada"),
    puntoLlegadaUbigeo: z.string().min(6, "Ingrese ubigeo (6 digitos)"),
    transportistaTipoDoc: z.string().min(1, "Seleccione tipo"),
    transportistaNumeroDoc: z.string().min(1, "Ingrese numero"),
    transportistaRazonSocial: z.string().min(1, "Ingrese razon social"),
    transportistaPlaca: z.string().optional(),
    pesoBrutoTotal: z.coerce.number().min(0).optional(),
    pesoBrutoUnidad: z.string().default("KGM"),
    items: z.array(itemSchema).min(1, "Agregue al menos un item"),
  })
  .refine(
    (data) =>
      data.modalidadTraslado !== "01" || data.transportistaTipoDoc === "6",
    {
      message: "SUNAT requiere que el transportista tenga RUC para transporte publico",
      path: ["transportistaTipoDoc"],
    },
  );

type GuideFormValues = z.infer<typeof guideFormSchema>;

// ── Types ─────────────────────────────────────────────────────
type ClientItem = {
  id: number;
  name: string;
  type: string;
  typeNumber: string;
};

type ProductItem = {
  id: number;
  name: string;
  barcode?: string | null;
  description?: string | null;
};

type StoreItem = {
  id: number;
  name: string;
  adress?: string | null;
  ubigeo?: string | null;
  district?: string | null;
};

type TransferItemState = {
  productId: number;
  name: string;
  barcode?: string | null;
  stock: number;
  quantity: number;
  availableSerials: string[];
  selectedSerials: string[];
  loadingSerials: boolean;
};

type SavedTransportista = {
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  placa?: string;
};

// ── Catalogos SUNAT ───────────────────────────────────────────
const MOTIVOS_TRASLADO = [
  { code: "01", label: "Venta" },
  { code: "02", label: "Compra" },
  { code: "04", label: "Traslado entre establecimientos" },
  { code: "06", label: "Devolucion" },
  { code: "08", label: "Importacion" },
  { code: "09", label: "Exportacion" },
  { code: "13", label: "Otros" },
  { code: "14", label: "Venta sujeta a confirmacion" },
  { code: "17", label: "Traslado para transformacion" },
  { code: "18", label: "Traslado emisor itinerante" },
];

const TIPOS_DOCUMENTO = [
  { code: "6", label: "RUC" },
  { code: "1", label: "DNI" },
  { code: "4", label: "Carnet de extranjeria" },
  { code: "7", label: "Pasaporte" },
];

const MODALIDADES_TRANSPORTE = [
  { code: "01", label: "Transporte publico" },
  { code: "02", label: "Transporte privado" },
];

const UNIDADES_PESO = [
  { code: "KGM", label: "Kilogramos (KGM)" },
  { code: "TNE", label: "Toneladas (TNE)" },
  { code: "LBR", label: "Libras (LBR)" },
];

const UNIDADES_MEDIDA = [
  { code: "NIU", label: "Unidad" },
  { code: "KGM", label: "Kilogramo" },
  { code: "LTR", label: "Litro" },
  { code: "MTR", label: "Metro" },
  { code: "BX", label: "Caja" },
  { code: "DZN", label: "Docena" },
  { code: "GLL", label: "Galon" },
  { code: "TNE", label: "Tonelada" },
];

// Destinatario accepts all document types (SUNAT GRE supports RUC + DNI)
const TIPOS_DOCUMENTO_DESTINATARIO = TIPOS_DOCUMENTO;

type DestinatarioOption = {
  id: string;
  name: string;
  docType: string;
  docTypeLabel: string;
  docNumber: string;
  address?: string;
  source: "client" | "provider";
};

const DOC_TYPE_MAP: Record<string, string> = {
  RUC: "6",
  DNI: "1",
  "CARNET DE EXTRANJERIA": "4",
  PASAPORTE: "7",
};

// ── Transportista localStorage helpers ────────────────────────
const TRANSPORTISTAS_KEY = "guide_saved_transportistas";

function getSavedTransportistas(): SavedTransportista[] {
  try {
    const raw = localStorage.getItem(TRANSPORTISTAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTransportista(t: SavedTransportista) {
  const list = getSavedTransportistas();
  const exists = list.findIndex(
    (x) => x.numeroDocumento === t.numeroDocumento,
  );
  if (exists >= 0) {
    list[exists] = t;
  } else {
    list.unshift(t);
  }
  localStorage.setItem(
    TRANSPORTISTAS_KEY,
    JSON.stringify(list.slice(0, 20)),
  );
}

// ── Address localStorage helpers ──────────────────────────────
type SavedAddress = {
  label: string;
  direccion: string;
  ubigeo: string;
  ubigeoLabel: string;
};

const ADDRESSES_KEY = "guide_saved_addresses";

function getSavedAddresses(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(ADDRESSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAddressToStorage(a: SavedAddress) {
  const list = getSavedAddresses();
  const exists = list.findIndex((x) => x.label === a.label);
  if (exists >= 0) {
    list[exists] = a;
  } else {
    list.unshift(a);
  }
  localStorage.setItem(ADDRESSES_KEY, JSON.stringify(list.slice(0, 20)));
}

function deleteSavedAddress(label: string) {
  const list = getSavedAddresses().filter((x) => x.label !== label);
  localStorage.setItem(ADDRESSES_KEY, JSON.stringify(list));
}

// ── Wizard steps ──────────────────────────────────────────────
const FORM_STEPS: StepDef[] = [
  { label: "Participantes", description: "Emisor y destinatario" },
  { label: "Traslado", description: "Motivo, fecha y tiendas" },
  { label: "Ruta", description: "Direcciones y transporte" },
  { label: "Productos", description: "Items y peso" },
];

// ── Form section wrapper ──────────────────────────────────────
function FormSection({
  icon: Icon,
  title,
  badge,
  step,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="border shadow-sm overflow-hidden w-full min-w-0 transition-all duration-300 hover:shadow-md animate-section-enter"
      style={{ animationDelay: `${step * 80}ms` }}
    >
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="rounded-lg bg-primary/10 p-1.5 flex-shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">{title}</span>
          {badge && (
            <Badge
              variant="outline"
              className="text-[10px] font-normal ml-auto"
            >
              {badge}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden pt-4">{children}</CardContent>
    </Card>
  );
}

// ── Inline error message ──────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive mt-1 animate-fade-in">{message}</p>
  );
}

// ── Page component ────────────────────────────────────────────
export default function NewGuidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selection } = useTenantSelection();
  const { userId } = useAuth();
  const initialMotivo = searchParams.get("motivo");
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // ── Data state ────────────────────────────────────────────
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [destinatarioOptions, setDestinatarioOptions] = useState<DestinatarioOption[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [savedTransportistas, setSavedTransportistas] = useState<
    SavedTransportista[]
  >([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressPartidaOpen, setAddressPartidaOpen] = useState(false);
  const [addressLlegadaOpen, setAddressLlegadaOpen] = useState(false);
  const [saveAddressDialog, setSaveAddressDialog] = useState<
    "partida" | "llegada" | null
  >(null);
  const [saveAddressLabel, setSaveAddressLabel] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [transportistaOpen, setTransportistaOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  // ── Inter-store transfer state ─────────────────────────────
  const [interStoreEnabled, setInterStoreEnabled] = useState(
    initialMotivo === "04",
  );
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [sourceStoreId, setSourceStoreId] = useState<number | null>(null);
  const [destinationStoreId, setDestinationStoreId] = useState<number | null>(
    null,
  );
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItemState[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  const [sourceStoreOpen, setSourceStoreOpen] = useState(false);
  const [destStoreOpen, setDestStoreOpen] = useState(false);
  const [storeProductSearchOpen, setStoreProductSearchOpen] = useState(false);
  const [storeProductSearch, setStoreProductSearch] = useState("");

  // ── SUNAT RUC lookup state ─────────────────────────────────
  const [sunatDialogOpen, setSunatDialogOpen] = useState(false);
  const [sunatRucValue, setSunatRucValue] = useState("");
  const [sunatSearchResult, setSunatSearchResult] =
    useState<LookupResponse | null>(null);
  const [sunatSearchError, setSunatSearchError] = useState<string | null>(null);
  const [sunatSearchLoading, setSunatSearchLoading] = useState(false);
  const [sunatSaving, setSunatSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuideFormValues>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: {
      tipoDocumentoRemitente: "6",
      destinatarioTipoDoc: "6",
      modalidadTraslado: "01",
      pesoBrutoUnidad: "KGM",
      fechaTraslado: format(new Date(), "yyyy-MM-dd"),
      ...(initialMotivo ? { motivoTrasladoCodigo: initialMotivo } : {}),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const motivoCode = watch("motivoTrasladoCodigo");

  // ── Reset form state when organization changes ──────────────
  useEffect(() => {
    if (!selection?.orgId) return;
    // Clear guide items added from previous org
    while (fields.length > 0) remove(0);
    // Clear inter-store transfer state
    setSourceStoreId(null);
    setDestinationStoreId(null);
    setTransferItems([]);
    setStoreProducts([]);
    setStores([]);
    // Clear SUNAT lookup state
    setSunatSearchResult(null);
    setSunatSearchError(null);
    setSunatRucValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.orgId]);

  // ── Load company data (auto-fill remitente + destinatario) ─
  useEffect(() => {
    async function loadCompany() {
      if (!selection?.companyId) return;
      try {
        const [company, storesData] = await Promise.all([
          getCompanyDetail(selection.companyId),
          getAllStores().catch(() => []),
        ]);
        if (company) {
          const ruc = company.sunatRuc || company.taxId || "";
          const name =
            company.sunatBusinessName || company.legalName || company.name || "";
          if (ruc) setValue("numeroDocumentoRemitente", ruc);
          if (name) setValue("razonSocialRemitente", name);
          // Auto-fill destinatario with same company data (most guides are self-transfers)
          setValue("destinatarioTipoDoc", "6");
          if (ruc) setValue("destinatarioNumeroDoc", ruc);
          if (name) setValue("destinatarioRazonSocial", name);

          // Auto-fill punto de partida: prefer first store (has ubigeo), fallback to company address
          const mainStore = Array.isArray(storesData) ? storesData[0] : null;
          if (mainStore?.adress) {
            setValue("puntoPartida", mainStore.adress);
            if (mainStore.ubigeo)
              setValue("puntoPartidaUbigeo", mainStore.ubigeo);
          } else if (company.sunatAddress) {
            setValue("puntoPartida", company.sunatAddress);
          }
        }
      } catch {
        // silent
      }
    }
    loadCompany();
  }, [selection?.companyId, setValue]);

  // ── Load clients + providers for destinatario combobox ────
  useEffect(() => {
    async function loadDestinatarios() {
      if (!selection?.orgId) return;
      try {
        const [clientsData, providersData] = await Promise.all([
          getRegisteredClients().catch(() => []),
          getProviders().catch(() => []),
        ]);
        const allClients = Array.isArray(clientsData) ? clientsData : [];
        const allProviders = Array.isArray(providersData) ? providersData : [];
        setClients(allClients);

        const docTypeLabelMap: Record<string, string> = { "6": "RUC", "1": "DNI", "4": "CE", "7": "PAS" };
        const options: DestinatarioOption[] = [];

        // Map clients
        for (const c of allClients) {
          if (!c.typeNumber) continue;
          const code = DOC_TYPE_MAP[c.type?.toUpperCase?.()] || "1";
          options.push({
            id: `client-${c.id}`,
            name: c.name,
            docType: code,
            docTypeLabel: docTypeLabelMap[code] || c.type || "DOC",
            docNumber: c.typeNumber,
            address: c.adress || undefined,
            source: "client",
          });
        }

        // Map providers
        for (const p of allProviders) {
          if (!p.documentNumber) continue;
          const code = DOC_TYPE_MAP[p.document?.toUpperCase?.()] || "6";
          // Skip if already added from clients (same docNumber)
          if (options.some((o) => o.docNumber === p.documentNumber)) continue;
          options.push({
            id: `provider-${p.id}`,
            name: p.name,
            docType: code,
            docTypeLabel: docTypeLabelMap[code] || p.document || "DOC",
            docNumber: p.documentNumber,
            address: p.adress || undefined,
            source: "provider",
          });
        }

        setDestinatarioOptions(options);
      } catch {
        // silent
      }
    }
    loadDestinatarios();
  }, [selection?.orgId]);

  // ── Load products ─────────────────────────────────────────
  useEffect(() => {
    async function loadProducts() {
      if (!selection?.orgId) return;
      try {
        const { authFetch } = await import("@/utils/auth-fetch");
        const res = await authFetch("/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      }
    }
    loadProducts();
  }, [selection?.orgId]);

  // ── Load saved transportistas + addresses ────────────────
  useEffect(() => {
    setSavedTransportistas(getSavedTransportistas());
    setSavedAddresses(getSavedAddresses());
  }, []);

  // ── Load stores when motivo = "04" ──────────────────────────
  useEffect(() => {
    if (motivoCode !== "04") {
      setInterStoreEnabled(false);
      setSourceStoreId(null);
      setDestinationStoreId(null);
      setTransferItems([]);
      setStores([]);
      return;
    }
    async function loadStores() {
      setLoadingStores(true);
      try {
        const data = await getAllStores();
        setStores(Array.isArray(data) ? data : []);
      } catch {
        setStores([]);
      } finally {
        setLoadingStores(false);
      }
    }
    setSourceStoreId(null);
    setDestinationStoreId(null);
    setTransferItems([]);
    setStoreProducts([]);
    loadStores();
  }, [motivoCode, selection?.orgId]);

  // ── Load products when source store changes ────────────────
  useEffect(() => {
    if (!sourceStoreId || !interStoreEnabled) {
      setStoreProducts([]);
      return;
    }
    async function loadProducts() {
      setLoadingStoreProducts(true);
      try {
        const data = await getProductsByStore(sourceStoreId!);
        setStoreProducts(Array.isArray(data) ? data : []);
      } catch {
        setStoreProducts([]);
      } finally {
        setLoadingStoreProducts(false);
      }
    }
    loadProducts();
  }, [sourceStoreId, interStoreEnabled, selection?.orgId]);

  // ── Auto-fill addresses when stores selected (motivo "04") ──
  useEffect(() => {
    if (motivoCode !== "04") return;
    if (sourceStoreId) {
      const store = stores.find((s) => s.id === sourceStoreId);
      if (store) {
        if (store.adress)
          setValue("puntoPartida", store.adress, { shouldValidate: true });
        if (store.ubigeo)
          setValue("puntoPartidaUbigeo", store.ubigeo, {
            shouldValidate: true,
          });
      }
    }
    if (destinationStoreId) {
      const store = stores.find((s) => s.id === destinationStoreId);
      if (store) {
        if (store.adress)
          setValue("puntoLlegada", store.adress, { shouldValidate: true });
        if (store.ubigeo)
          setValue("puntoLlegadaUbigeo", store.ubigeo, {
            shouldValidate: true,
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivoCode, sourceStoreId, destinationStoreId, stores]);

  // ── Filtered products for search ──────────────────────────
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = normalizeSearch(productSearch);
    return products
      .filter(
        (p) =>
          normalizeSearch(p.name).includes(q) ||
          (p.barcode && normalizeSearch(p.barcode).includes(q)) ||
          (p.description && normalizeSearch(p.description).includes(q)),
      )
      .slice(0, 30);
  }, [products, productSearch]);

  // ── Inter-store derived data ────────────────────────────────
  const selectedSourceStore = useMemo(
    () => stores.find((s) => s.id === sourceStoreId),
    [stores, sourceStoreId],
  );
  const selectedDestStore = useMemo(
    () => stores.find((s) => s.id === destinationStoreId),
    [stores, destinationStoreId],
  );
  const filteredStoreProducts = useMemo(() => {
    if (!storeProductSearch.trim()) return storeProducts.slice(0, 30);
    const q = storeProductSearch.toLowerCase();
    return storeProducts
      .filter((p: any) => {
        const name = (
          p.inventory?.product?.name ||
          p.name ||
          ""
        ).toLowerCase();
        const barcode = (
          p.inventory?.product?.barcode ||
          p.barcode ||
          ""
        ).toLowerCase();
        return name.includes(q) || barcode.includes(q);
      })
      .slice(0, 30);
  }, [storeProducts, storeProductSearch]);

  // ── Wizard step navigation ─────────────────────────────────
  function canReachWizardStep(index: number): boolean {
    if (index === currentStep) return false;
    // All steps are always reachable (no strict validation per step)
    return true;
  }

  function handleWizardStepClick(index: number) {
    if (!canReachWizardStep(index)) return;
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleWizardNext() {
    const next = currentStep + 1;
    if (next >= FORM_STEPS.length) return;
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleWizardBack() {
    const prev = currentStep - 1;
    if (prev < 0) return;
    setCurrentStep(prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Build payload ─────────────────────────────────────────
  const buildPayload = useCallback(
    (data: GuideFormValues): CreateGuidePayload => {
      const base: CreateGuidePayload = {
        tipoDocumentoRemitente: data.tipoDocumentoRemitente,
        numeroDocumentoRemitente: data.numeroDocumentoRemitente,
        razonSocialRemitente: data.razonSocialRemitente,
        puntoPartida: data.puntoPartida,
        puntoLlegada: data.puntoLlegada,
        motivoTraslado:
          MOTIVOS_TRASLADO.find((m) => m.code === data.motivoTrasladoCodigo)
            ?.label || data.motivoTrasladoCodigo,
        motivoTrasladoCodigo: data.motivoTrasladoCodigo,
        fechaTraslado: data.fechaTraslado,
        modalidadTraslado: data.modalidadTraslado,
        puntoPartidaDireccion: data.puntoPartida,
        puntoPartidaUbigeo: data.puntoPartidaUbigeo,
        puntoLlegadaDireccion: data.puntoLlegada,
        puntoLlegadaUbigeo: data.puntoLlegadaUbigeo,
        pesoBrutoTotal: data.pesoBrutoTotal || undefined,
        pesoBrutoUnidad: data.pesoBrutoUnidad,
        transportista: {
          tipoDocumento: data.transportistaTipoDoc,
          numeroDocumento: data.transportistaNumeroDoc,
          razonSocial: data.transportistaRazonSocial,
          numeroPlaca: data.transportistaPlaca || undefined,
        },
        destinatario: {
          tipoDocumento: data.destinatarioTipoDoc,
          numeroDocumento: data.destinatarioNumeroDoc,
          razonSocial: data.destinatarioRazonSocial,
        },
        items: data.items.map(({ isManual, saveAsProduct, ...rest }) => rest),
      };

      // Append inter-store transfer data when enabled
      if (
        interStoreEnabled &&
        sourceStoreId &&
        destinationStoreId &&
        transferItems.length > 0
      ) {
        base.isInterStore = true;
        base.sourceStoreId = sourceStoreId;
        base.destinationStoreId = destinationStoreId;
        base.userId = userId ?? undefined;
        base.transferItems = transferItems.map((ti) => ({
          productId: ti.productId,
          quantity: ti.quantity,
          serials:
            ti.selectedSerials.length > 0 ? ti.selectedSerials : undefined,
        }));
      }

      return base;
    },
    [interStoreEnabled, sourceStoreId, destinationStoreId, transferItems, userId],
  );

  // ── Handlers ──────────────────────────────────────────────
  const onValidate = handleSubmit(async (data) => {
    setValidating(true);
    try {
      const payload = buildPayload(data);
      const result = await validateShippingGuide(payload);
      setPreviewData(result);
      setPreviewOpen(true);
      toast.success("XML generado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error de validacion");
    } finally {
      setValidating(false);
    }
  });

  const onSubmit = handleSubmit(async (data) => {
    // Validate inter-store before submitting
    if (interStoreEnabled && sourceStoreId && destinationStoreId) {
      if (transferItems.length === 0) {
        toast.error("Agrega al menos un producto para transferir");
        return;
      }
      const overStock = transferItems.find((ti) => ti.quantity > ti.stock);
      if (overStock) {
        toast.error(
          `"${overStock.name}" excede el stock disponible (${overStock.stock})`,
        );
        return;
      }
      const zeroQty = transferItems.find((ti) => ti.quantity <= 0);
      if (zeroQty) {
        toast.error(`"${zeroQty.name}" debe tener cantidad mayor a 0`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(data);
      // Save transportista for future reuse
      saveTransportista({
        tipoDocumento: data.transportistaTipoDoc,
        numeroDocumento: data.transportistaNumeroDoc,
        razonSocial: data.transportistaRazonSocial,
        placa: data.transportistaPlaca || undefined,
      });
      const result = await createShippingGuide(payload);
      // Auto-save addresses for future reuse
      if (data.puntoPartida && data.puntoPartidaUbigeo) {
        const existing = getSavedAddresses();
        if (!existing.some((a) => a.direccion === data.puntoPartida && a.ubigeo === data.puntoPartidaUbigeo)) {
          saveAddressToStorage({
            label: data.puntoPartida.slice(0, 40),
            direccion: data.puntoPartida,
            ubigeo: data.puntoPartidaUbigeo,
            ubigeoLabel: data.puntoPartidaUbigeo,
          });
        }
      }
      if (data.puntoLlegada && data.puntoLlegadaUbigeo) {
        const existing = getSavedAddresses();
        if (!existing.some((a) => a.direccion === data.puntoLlegada && a.ubigeo === data.puntoLlegadaUbigeo)) {
          saveAddressToStorage({
            label: data.puntoLlegada.slice(0, 40),
            direccion: data.puntoLlegada,
            ubigeo: data.puntoLlegadaUbigeo,
            ubigeoLabel: data.puntoLlegadaUbigeo,
          });
        }
      }
      // Post-operation: save manual items as products (non-blocking)
      const itemsToSave = data.items.filter(
        (it) => it.isManual && it.saveAsProduct,
      );
      if (itemsToSave.length > 0) {
        for (const item of itemsToSave) {
          try {
            await createProduct({
              name: item.descripcion,
              price: 0,
              barcode: item.codigo || undefined,
            });
            toast.success(`Producto "${item.descripcion}" guardado en el sistema`);
          } catch (err: any) {
            const msg = err?.message || "Error desconocido";
            toast.warning(`No se pudo guardar "${item.descripcion}": ${msg}`);
          }
        }
      }

      if (result.estadoSunat === "ACEPTADO") {
        toast.success("Guía aceptada por SUNAT");
        router.push("/dashboard/transfers");
      } else if (result.codigoRespuesta === "98") {
        toast.warning(
          "SUNAT está procesando la guía. Puede verificar el estado luego.",
        );
        router.push("/dashboard/transfers");
      } else {
        toast.error(
          `SUNAT rechazó la guía (código ${result.codigoRespuesta}): ${result.descripcionRespuesta ?? "Error desconocido"}. Verifique que la serie y correlativo estén correctamente configurados en Empresas → Comprobantes.`,
          { duration: 12000 },
        );
      }
    } catch (err: any) {
      if (isSubscriptionBlockedError(err.message ?? '')) {
        setSubscriptionBlocked(true);
        return;
      }
      toast.error(err.message || "Error al enviar guia");
    } finally {
      setSubmitting(false);
    }
  });

  // ── Select destinatario → fill fields ─────────────────────
  function selectDestinatario(option: DestinatarioOption) {
    setValue("destinatarioTipoDoc", option.docType, { shouldValidate: true });
    setValue("destinatarioNumeroDoc", option.docNumber || "");
    setValue("destinatarioRazonSocial", option.name || "");
    // Auto-fill destination address if available
    if (option.address) {
      setValue("puntoLlegada", option.address, { shouldValidate: true });
    }
    setClientOpen(false);
  }

  // ── SUNAT RUC lookup handlers ──────────────────────────────
  async function handleSunatRucSearch() {
    const ruc = sunatRucValue.trim();
    if (!/^\d{11}$/.test(ruc)) {
      setSunatSearchError("Ingresa un RUC valido de 11 digitos.");
      setSunatSearchResult(null);
      return;
    }
    setSunatSearchLoading(true);
    setSunatSearchError(null);
    try {
      const result = await lookupSunatDocument(ruc);
      setSunatSearchResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al consultar RUC";
      setSunatSearchError(message);
      setSunatSearchResult(null);
    } finally {
      setSunatSearchLoading(false);
    }
  }

  async function handleSelectSunatResult(result: LookupResponse, saveAs?: "provider" | "client") {
    // Fill the form fields
    setValue("destinatarioTipoDoc", "6", { shouldValidate: true });
    setValue("destinatarioNumeroDoc", result.identifier || "");
    setValue("destinatarioRazonSocial", result.name || "");
    // Auto-fill destination address + ubigeo from SUNAT lookup
    if (result.address) {
      setValue("puntoLlegada", result.address, { shouldValidate: true });
    }
    if (result.ubigeo) {
      setValue("puntoLlegadaUbigeo", result.ubigeo, { shouldValidate: true });
    }

    // Save to system if requested
    if (saveAs) {
      setSunatSaving(true);
      try {
        if (saveAs === "provider") {
          const exists = await checkProviderExists(result.identifier);
          if (!exists) {
            await createProvider({
              name: result.name,
              description: result.name,
              document: "RUC",
              documentNumber: result.identifier,
              adress: result.address || "",
            });
            toast.success(`Proveedor "${result.name}" guardado en el sistema.`);
          } else {
            toast.info(`El proveedor con RUC ${result.identifier} ya existe.`);
          }
        } else {
          const exists = await checkClientExists(result.identifier);
          if (!exists) {
            await createClient({
              name: result.name,
              type: "RUC",
              typeNumber: result.identifier,
              adress: result.address || "",
            });
            // Refresh destinatario options
            try {
              const [cData, pData] = await Promise.all([
                getRegisteredClients().catch(() => []),
                getProviders().catch(() => []),
              ]);
              const docTypeLabelMap: Record<string, string> = { "6": "RUC", "1": "DNI", "4": "CE", "7": "PAS" };
              const opts: DestinatarioOption[] = [];
              for (const c of (Array.isArray(cData) ? cData : [])) {
                if (!c.typeNumber) continue;
                const code = DOC_TYPE_MAP[c.type?.toUpperCase?.()] || "1";
                opts.push({ id: `client-${c.id}`, name: c.name, docType: code, docTypeLabel: docTypeLabelMap[code] || c.type || "DOC", docNumber: c.typeNumber, address: c.adress || undefined, source: "client" });
              }
              for (const p of (Array.isArray(pData) ? pData : [])) {
                if (!p.documentNumber || opts.some((o) => o.docNumber === p.documentNumber)) continue;
                const code = DOC_TYPE_MAP[p.document?.toUpperCase?.()] || "6";
                opts.push({ id: `provider-${p.id}`, name: p.name, docType: code, docTypeLabel: docTypeLabelMap[code] || p.document || "DOC", docNumber: p.documentNumber, address: p.adress || undefined, source: "provider" });
              }
              setDestinatarioOptions(opts);
            } catch {}
            toast.success(`Cliente "${result.name}" guardado en el sistema.`);
          } else {
            toast.info(`El cliente con RUC ${result.identifier} ya existe.`);
          }
        }
      } catch (error: any) {
        const msg = error?.message || error?.response?.data?.message || "Error al guardar.";
        toast.error(msg);
      } finally {
        setSunatSaving(false);
      }
    } else {
      toast.success(`Destinatario: ${result.name}`);
    }

    setSunatDialogOpen(false);
    setSunatRucValue("");
    setSunatSearchResult(null);
    setSunatSearchError(null);
  }

  // ── Select transportista → fill fields ────────────────────
  function selectTransportista(t: SavedTransportista) {
    setValue("transportistaTipoDoc", t.tipoDocumento);
    setValue("transportistaNumeroDoc", t.numeroDocumento);
    setValue("transportistaRazonSocial", t.razonSocial);
    if (t.placa) setValue("transportistaPlaca", t.placa);
    setTransportistaOpen(false);
  }

  // ── Select saved address → fill fields ───────────────────
  function selectAddress(
    addr: SavedAddress,
    target: "partida" | "llegada",
  ) {
    if (target === "partida") {
      setValue("puntoPartida", addr.direccion, { shouldValidate: true });
      setValue("puntoPartidaUbigeo", addr.ubigeo, { shouldValidate: true });
      setAddressPartidaOpen(false);
    } else {
      setValue("puntoLlegada", addr.direccion, { shouldValidate: true });
      setValue("puntoLlegadaUbigeo", addr.ubigeo, { shouldValidate: true });
      setAddressLlegadaOpen(false);
    }
    toast.success(`Direccion cargada: ${addr.label}`);
  }

  function handleSaveAddress(target: "partida" | "llegada") {
    const direccion =
      target === "partida" ? watch("puntoPartida") : watch("puntoLlegada");
    const ubigeo =
      target === "partida"
        ? watch("puntoPartidaUbigeo")
        : watch("puntoLlegadaUbigeo");
    if (!direccion || !ubigeo) {
      toast.error("Llena la direccion y el ubigeo antes de guardar");
      return;
    }
    setSaveAddressDialog(target);
    setSaveAddressLabel(direccion.slice(0, 40));
  }

  function confirmSaveAddress() {
    if (!saveAddressDialog || !saveAddressLabel.trim()) return;
    const target = saveAddressDialog;
    const direccion =
      target === "partida" ? watch("puntoPartida") : watch("puntoLlegada");
    const ubigeo =
      target === "partida"
        ? watch("puntoPartidaUbigeo")
        : watch("puntoLlegadaUbigeo");
    const addr: SavedAddress = {
      label: saveAddressLabel.trim(),
      direccion,
      ubigeo,
      ubigeoLabel: ubigeo,
    };
    saveAddressToStorage(addr);
    setSavedAddresses(getSavedAddresses());
    setSaveAddressDialog(null);
    setSaveAddressLabel("");
    toast.success(`Direccion "${addr.label}" guardada`);
  }

  function handleDeleteAddress(label: string) {
    deleteSavedAddress(label);
    setSavedAddresses(getSavedAddresses());
    toast.success("Direccion eliminada");
  }

  // ── Add product as item ───────────────────────────────────
  function addProductAsItem(product: ProductItem) {
    append({
      codigo: product.barcode || String(product.id),
      descripcion: product.name,
      cantidad: 1,
      unidadMedida: "NIU",
      isManual: false,
      saveAsProduct: false,
    });
    setProductSearchOpen(false);
    setProductSearch("");
    toast.success(`${product.name} agregado`);
  }

  // ── Inter-store handlers ────────────────────────────────────
  function addTransferProduct(sp: any) {
    const product = sp.inventory?.product || sp;
    const productId = product.id || sp.productId || 0;
    const name = product.name || "";
    const barcode = product.barcode || null;
    const stock = sp.stock ?? 0;

    if (transferItems.some((ti) => ti.productId === productId)) {
      toast.error("Este producto ya fue agregado");
      return;
    }

    setTransferItems((prev) => [
      ...prev,
      {
        productId,
        name,
        barcode,
        stock,
        quantity: 1,
        availableSerials: [],
        selectedSerials: [],
        loadingSerials: false,
      },
    ]);

    // Also add to form items for SUNAT XML validation
    append({
      codigo: barcode || String(productId),
      descripcion: name,
      cantidad: 1,
      unidadMedida: "NIU",
      isManual: false,
      saveAsProduct: false,
    });

    setStoreProductSearchOpen(false);
    setStoreProductSearch("");
    toast.success(`${name} agregado`);
  }

  function removeTransferItem(index: number) {
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
    remove(index);
  }

  function updateTransferQuantity(index: number, qty: number) {
    const item = transferItems[index];
    if (!item) return;
    const clampedQty = Math.min(Math.max(0, qty), item.stock);
    setTransferItems((prev) =>
      prev.map((ti, i) => (i === index ? { ...ti, quantity: clampedQty } : ti)),
    );
    setValue(`items.${index}.cantidad`, clampedQty);
  }

  async function loadSerialsForItem(index: number) {
    if (!sourceStoreId) return;
    const item = transferItems[index];
    if (!item) return;

    setTransferItems((prev) =>
      prev.map((ti, i) =>
        i === index ? { ...ti, loadingSerials: true } : ti,
      ),
    );

    try {
      const serials = await getSeriesByProductAndStore(
        sourceStoreId,
        item.productId,
      );
      const available = Array.isArray(serials)
        ? serials.map((s: any) => s.serial || s)
        : [];
      setTransferItems((prev) =>
        prev.map((ti, i) =>
          i === index
            ? { ...ti, availableSerials: available, loadingSerials: false }
            : ti,
        ),
      );
    } catch {
      setTransferItems((prev) =>
        prev.map((ti, i) =>
          i === index ? { ...ti, loadingSerials: false } : ti,
        ),
      );
    }
  }

  function toggleSerialSelection(index: number, serial: string) {
    setTransferItems((prev) =>
      prev.map((ti, i) => {
        if (i !== index) return ti;
        const selected = ti.selectedSerials.includes(serial)
          ? ti.selectedSerials.filter((s) => s !== serial)
          : [...ti.selectedSerials, serial];
        return { ...ti, selectedSerials: selected };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 w-full min-w-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 animate-card-enter">
        <Link href="/dashboard/transfers">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Nueva Guia de Remision
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Guia de remision electronica para SUNAT
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex gap-1.5 text-xs">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          SUNAT
        </Badge>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* ── Stepper ──────────────────────────────────────── */}
        <Card className="border shadow-sm overflow-hidden w-full min-w-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <CatalogStepper
              steps={FORM_STEPS}
              currentStep={currentStep}
              onStepClick={handleWizardStepClick}
              canReachStep={canReachWizardStep}
            />
          </CardContent>
        </Card>

        {/* ── Step 0: Participantes ────────────────────────── */}
        <div className={currentStep !== 0 ? "hidden" : "flex flex-col gap-4"}>
        {/* ── 1. Remitente ────────────────────────────────── */}
        <FormSection
          icon={Building2}
          title="Remitente (Emisor)"
          badge="Auto-completado"
          step={1}
        >
          <p className="text-xs text-muted-foreground mb-3">
            Datos de tu empresa. Se completan automaticamente.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo Documento</Label>
              <Select
                defaultValue="6"
                onValueChange={(v) => setValue("tipoDocumentoRemitente", v)}
              >
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem
                      key={t.code}
                      value={t.code}
                      className="cursor-pointer"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">RUC / Documento *</Label>
              <Input
                placeholder="20519857538"
                className="bg-muted/30"
                {...register("numeroDocumentoRemitente")}
              />
              <FieldError
                message={errors.numeroDocumentoRemitente?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razon Social *</Label>
              <Input
                placeholder="EMPRESA S.A.C."
                className="bg-muted/30"
                {...register("razonSocialRemitente")}
              />
              <FieldError message={errors.razonSocialRemitente?.message} />
            </div>
          </div>
        </FormSection>

        {/* ── 2. Destinatario ─────────────────────────────── */}
        <FormSection
          icon={User}
          title="Destinatario"
          step={2}
        >
          <p className="text-xs text-muted-foreground mb-3">
            Pre-llenado con datos de tu empresa. Puedes cambiar el
            destinatario buscando un cliente/proveedor registrado o
            consultando un RUC en SUNAT.
          </p>
          {/* Client search + SUNAT lookup */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  type="button"
                  className="flex-1 justify-between cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Search className="h-3.5 w-3.5 flex-shrink-0" />
                    Buscar cliente o proveedor...
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)]"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Buscar por nombre, RUC o DNI..." />
                  <CommandList>
                    <CommandEmpty>
                      No se encontraron resultados.
                    </CommandEmpty>
                    <CommandGroup>
                      {destinatarioOptions.map((opt) => (
                        <CommandItem
                          key={opt.id}
                          value={`${opt.name} ${opt.docNumber}`}
                          onSelect={() => selectDestinatario(opt)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">
                                {opt.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {opt.docTypeLabel}: {opt.docNumber}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] flex-shrink-0 ${
                                opt.source === "provider"
                                  ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                                  : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {opt.source === "provider" ? "Prov" : "Cliente"}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer gap-2 flex-shrink-0 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => setSunatDialogOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              Buscar RUC en SUNAT
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo Documento *</Label>
              <Select
                value={watch("destinatarioTipoDoc") || "6"}
                onValueChange={(v) => setValue("destinatarioTipoDoc", v)}
              >
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue placeholder="RUC" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO_DESTINATARIO.map((t) => (
                    <SelectItem
                      key={t.code}
                      value={t.code}
                      className="cursor-pointer"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.destinatarioTipoDoc?.message} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                N° Documento *
              </Label>
              <Input
                placeholder={watch("destinatarioTipoDoc") === "1" ? "12345678" : "20000000001"}
                {...register("destinatarioNumeroDoc")}
              />
              <FieldError message={errors.destinatarioNumeroDoc?.message} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razon Social *</Label>
              <Input
                placeholder="DESTINATARIO S.A.C."
                {...register("destinatarioRazonSocial")}
              />
              <FieldError
                message={errors.destinatarioRazonSocial?.message}
              />
            </div>
          </div>
        </FormSection>
        </div>

        {/* ── Step 1: Traslado ─────────────────────────────── */}
        <div className={currentStep !== 1 ? "hidden" : "flex flex-col gap-4"}>
        {/* ── 3. Datos del traslado ───────────────────────── */}
        <FormSection icon={Truck} title="Datos del Traslado" step={3}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium">
                Motivo de Traslado *
              </Label>
              <Select
                value={motivoCode || ""}
                onValueChange={(v) => setValue("motivoTrasladoCodigo", v)}
              >
                <SelectTrigger className="cursor-pointer w-full overflow-hidden">
                  <SelectValue placeholder="Seleccione motivo...">
                    {motivoCode && (
                      <span className="truncate block">
                        <span className="font-mono text-xs mr-1">
                          {motivoCode}
                        </span>
                        {MOTIVOS_TRASLADO.find((m) => m.code === motivoCode)
                          ?.label || motivoCode}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_TRASLADO.map((m) => (
                    <SelectItem
                      key={m.code}
                      value={m.code}
                      className="cursor-pointer"
                    >
                      <span className="font-mono text-xs mr-1.5">
                        {m.code}
                      </span>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.motivoTrasladoCodigo?.message} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium">
                Fecha de Traslado *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start text-left font-normal cursor-pointer"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    {watch("fechaTraslado") ? (
                      format(
                        new Date(watch("fechaTraslado") + "T12:00:00"),
                        "dd 'de' MMMM, yyyy",
                        { locale: es },
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Seleccione fecha...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      watch("fechaTraslado")
                        ? new Date(watch("fechaTraslado") + "T12:00:00")
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        setValue("fechaTraslado", format(date, "yyyy-MM-dd"));
                      }
                    }}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FieldError message={errors.fechaTraslado?.message} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium">
                Modalidad de Transporte
              </Label>
              <Select
                defaultValue="01"
                onValueChange={(v) => setValue("modalidadTraslado", v)}
              >
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES_TRANSPORTE.map((m) => (
                    <SelectItem
                      key={m.code}
                      value={m.code}
                      className="cursor-pointer"
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        {/* ── 4. Entre Tiendas (motivo 04) ─────────────── */}
        {motivoCode === "04" && (
          <FormSection
            icon={ArrowLeftRight}
            title="Entre Tiendas"
            badge="Opcional"
            step={4}
          >
            {/* Toggle */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium">
                  Automatizar movimiento de inventario
                </p>
                <p className="text-xs text-muted-foreground">
                  Mueve stock y series entre tiendas al enviar la guia
                </p>
              </div>
              <Switch
                checked={interStoreEnabled}
                onCheckedChange={setInterStoreEnabled}
                className="cursor-pointer flex-shrink-0"
              />
            </div>

            {/* Store selectors */}
            {interStoreEnabled && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                {loadingStores ? (
                  <div className="flex items-center justify-center gap-2 p-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Cargando tiendas...
                    </span>
                  </div>
                ) : stores.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-6 rounded-lg border border-dashed text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No hay tiendas registradas. Crea tiendas en el modulo de
                      Tiendas primero.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Source Store */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-orange-400" />
                          Tienda Origen
                        </Label>
                        <Popover
                          open={sourceStoreOpen}
                          onOpenChange={setSourceStoreOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              type="button"
                              className="w-full justify-between cursor-pointer text-sm font-normal"
                            >
                              <span className="truncate">
                                {selectedSourceStore?.name ||
                                  "Seleccionar tienda..."}
                              </span>
                              <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="p-0 w-[var(--radix-popover-trigger-width)]"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Buscar tienda..." />
                              <CommandList>
                                <CommandEmpty>No encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {stores
                                    .filter((s) => s.id !== destinationStoreId)
                                    .map((store) => (
                                      <CommandItem
                                        key={store.id}
                                        value={`${store.name} ${store.adress || ""}`}
                                        onSelect={() => {
                                          setSourceStoreId(store.id);
                                          setSourceStoreOpen(false);
                                          setTransferItems([]);
                                          setValue("items", []);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className="font-medium text-sm truncate">
                                            {store.name}
                                          </span>
                                          {store.adress && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                              {store.adress}
                                            </span>
                                          )}
                                          {store.ubigeo && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                              {store.ubigeo}
                                              {store.district
                                                ? ` · ${store.district}`
                                                : ""}
                                            </span>
                                          )}
                                        </div>
                                        {store.id === sourceStoreId && (
                                          <CheckCircle2 className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                                        )}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedSourceStore && (
                          <div className="text-[10px] text-muted-foreground p-2 rounded bg-muted/50 space-y-0.5">
                            {selectedSourceStore.adress && (
                              <p className="break-words">
                                Dir: {selectedSourceStore.adress}
                              </p>
                            )}
                            {selectedSourceStore.ubigeo && (
                              <p>Ubigeo: {selectedSourceStore.ubigeo}</p>
                            )}
                            {!selectedSourceStore.adress &&
                              !selectedSourceStore.ubigeo && (
                                <p className="text-amber-600">
                                  Sin direccion ni ubigeo configurado
                                </p>
                              )}
                          </div>
                        )}
                      </div>

                      {/* Destination Store */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-blue-400" />
                          Tienda Destino
                        </Label>
                        <Popover
                          open={destStoreOpen}
                          onOpenChange={setDestStoreOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              type="button"
                              className="w-full justify-between cursor-pointer text-sm font-normal"
                            >
                              <span className="truncate">
                                {selectedDestStore?.name ||
                                  "Seleccionar tienda..."}
                              </span>
                              <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="p-0 w-[var(--radix-popover-trigger-width)]"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Buscar tienda..." />
                              <CommandList>
                                <CommandEmpty>No encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {stores
                                    .filter((s) => s.id !== sourceStoreId)
                                    .map((store) => (
                                      <CommandItem
                                        key={store.id}
                                        value={`${store.name} ${store.adress || ""}`}
                                        onSelect={() => {
                                          setDestinationStoreId(store.id);
                                          setDestStoreOpen(false);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className="font-medium text-sm truncate">
                                            {store.name}
                                          </span>
                                          {store.adress && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                              {store.adress}
                                            </span>
                                          )}
                                          {store.ubigeo && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                              {store.ubigeo}
                                              {store.district
                                                ? ` · ${store.district}`
                                                : ""}
                                            </span>
                                          )}
                                        </div>
                                        {store.id === destinationStoreId && (
                                          <CheckCircle2 className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                                        )}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedDestStore && (
                          <div className="text-[10px] text-muted-foreground p-2 rounded bg-muted/50 space-y-0.5">
                            {selectedDestStore.adress && (
                              <p className="break-words">
                                Dir: {selectedDestStore.adress}
                              </p>
                            )}
                            {selectedDestStore.ubigeo && (
                              <p>Ubigeo: {selectedDestStore.ubigeo}</p>
                            )}
                            {!selectedDestStore.adress &&
                              !selectedDestStore.ubigeo && (
                                <p className="text-amber-600">
                                  Sin direccion ni ubigeo configurado
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Swap stores button */}
                    {sourceStoreId && destinationStoreId && (
                      <div className="flex items-center justify-center gap-3 py-2 text-xs text-muted-foreground animate-in fade-in-0 duration-300">
                        <Badge variant="outline" className="text-xs gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          {selectedSourceStore?.name}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full cursor-pointer border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 hover:scale-110 active:scale-90"
                          onClick={() => {
                            const prevSource = sourceStoreId;
                            const prevDest = destinationStoreId;
                            setSourceStoreId(prevDest);
                            setDestinationStoreId(prevSource);
                            setTransferItems([]);
                            setValue("items", []);
                            toast.success("Tiendas intercambiadas");
                          }}
                        >
                          <ArrowLeftRight className="h-4 w-4 text-primary" />
                        </Button>
                        <Badge variant="outline" className="text-xs gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          {selectedDestStore?.name}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </FormSection>
        )}
        </div>

        {/* ── Step 2: Ruta ─────────────────────────────────── */}
        <div className={currentStep !== 2 ? "hidden" : "flex flex-col gap-4"}>
        {/* ── 5. Direcciones ──────────────────────────────── */}
        <FormSection icon={MapPin} title="Direcciones" step={5}>
          {/* Saved addresses selector — shared for both sections */}
          {savedAddresses.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
              <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Direcciones guardadas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {savedAddresses.map((addr) => (
                  <div key={addr.label} className="group flex items-center gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs cursor-pointer rounded-r-none border-r-0 gap-1.5"
                      onClick={() => {
                        // If partida is empty, fill partida; otherwise fill llegada
                        const target =
                          !watch("puntoPartida") || !watch("puntoPartidaUbigeo")
                            ? "partida"
                            : "llegada";
                        selectAddress(addr, target);
                      }}
                    >
                      <BookmarkCheck className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{addr.label}</span>
                      <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">
                        {addr.ubigeo}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-6 p-0 cursor-pointer rounded-l-none opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={() => handleDeleteAddress(addr.label)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Punto de Partida */}
            <div className="space-y-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  <p className="text-xs font-semibold">Punto de Partida</p>
                </div>
                {watch("puntoPartida") && watch("puntoPartidaUbigeo") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] cursor-pointer gap-1 text-muted-foreground hover:text-primary"
                    onClick={() => handleSaveAddress("partida")}
                  >
                    <Bookmark className="h-3 w-3" />
                    Guardar
                  </Button>
                )}
              </div>
              {/* Quick-load saved address for partida */}
              {savedAddresses.length > 0 && (
                <Popover
                  open={addressPartidaOpen}
                  onOpenChange={setAddressPartidaOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      type="button"
                      className="w-full justify-between cursor-pointer text-xs font-normal text-muted-foreground hover:text-foreground h-8"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <BookmarkCheck className="h-3 w-3 flex-shrink-0" />
                        Cargar direccion guardada...
                      </span>
                      <ChevronsUpDown className="h-3 w-3 flex-shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar direccion..." />
                      <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                          {savedAddresses.map((addr) => (
                            <CommandItem
                              key={addr.label}
                              value={`${addr.label} ${addr.direccion}`}
                              onSelect={() =>
                                selectAddress(addr, "partida")
                              }
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-medium text-xs truncate">
                                  {addr.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {addr.direccion}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-muted-foreground ml-auto flex-shrink-0">
                                {addr.ubigeo}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Direccion *</Label>
                <Input
                  placeholder="Av. Principal 123, Lima"
                  {...register("puntoPartida")}
                />
                <FieldError message={errors.puntoPartida?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Distrito (Ubigeo) *</Label>
                <UbigeoCombobox
                  value={watch("puntoPartidaUbigeo") || ""}
                  onSelect={(code) =>
                    setValue("puntoPartidaUbigeo", code, {
                      shouldValidate: true,
                    })
                  }
                  placeholder="Buscar distrito de partida..."
                />
                <FieldError message={errors.puntoPartidaUbigeo?.message} />
              </div>
            </div>
            {/* Punto de Llegada */}
            <div className="space-y-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <p className="text-xs font-semibold">Punto de Llegada</p>
                </div>
                {watch("puntoLlegada") && watch("puntoLlegadaUbigeo") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] cursor-pointer gap-1 text-muted-foreground hover:text-primary"
                    onClick={() => handleSaveAddress("llegada")}
                  >
                    <Bookmark className="h-3 w-3" />
                    Guardar
                  </Button>
                )}
              </div>
              {/* Quick-load saved address for llegada */}
              {savedAddresses.length > 0 && (
                <Popover
                  open={addressLlegadaOpen}
                  onOpenChange={setAddressLlegadaOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      type="button"
                      className="w-full justify-between cursor-pointer text-xs font-normal text-muted-foreground hover:text-foreground h-8"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <BookmarkCheck className="h-3 w-3 flex-shrink-0" />
                        Cargar direccion guardada...
                      </span>
                      <ChevronsUpDown className="h-3 w-3 flex-shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar direccion..." />
                      <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                          {savedAddresses.map((addr) => (
                            <CommandItem
                              key={addr.label}
                              value={`${addr.label} ${addr.direccion}`}
                              onSelect={() =>
                                selectAddress(addr, "llegada")
                              }
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-medium text-xs truncate">
                                  {addr.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {addr.direccion}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-muted-foreground ml-auto flex-shrink-0">
                                {addr.ubigeo}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Direccion *</Label>
                <Input
                  placeholder="Jr. Destino 456, Arequipa"
                  {...register("puntoLlegada")}
                />
                <FieldError message={errors.puntoLlegada?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Distrito (Ubigeo) *</Label>
                <UbigeoCombobox
                  value={watch("puntoLlegadaUbigeo") || ""}
                  onSelect={(code) =>
                    setValue("puntoLlegadaUbigeo", code, {
                      shouldValidate: true,
                    })
                  }
                  placeholder="Buscar distrito de llegada..."
                />
                <FieldError message={errors.puntoLlegadaUbigeo?.message} />
              </div>
            </div>
          </div>
        </FormSection>

        {/* ── Save Address Dialog ──────────────────────────── */}
        <Dialog
          open={saveAddressDialog !== null}
          onOpenChange={(open) => {
            if (!open) setSaveAddressDialog(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Guardar direccion</DialogTitle>
              <DialogDescription>
                Dale un nombre para identificar esta direccion rapidamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nombre / Etiqueta</Label>
                <Input
                  placeholder="Ej: Almacen Lima, Oficina Arequipa..."
                  value={saveAddressLabel}
                  onChange={(e) => setSaveAddressLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmSaveAddress();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setSaveAddressDialog(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={confirmSaveAddress}
                  disabled={!saveAddressLabel.trim()}
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 6. Transportista ────────────────────────────── */}
        <FormSection icon={Truck} title="Transportista" step={6}>
          {/* Saved transportistas search */}
          {savedTransportistas.length > 0 && (
            <div className="mb-4">
              <Label className="text-xs font-medium mb-1.5 block">
                Transportistas guardados
              </Label>
              <Popover
                open={transportistaOpen}
                onOpenChange={setTransportistaOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    type="button"
                    className="w-full justify-between cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Search className="h-3.5 w-3.5 flex-shrink-0" />
                      Buscar transportista guardado...
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[var(--radix-popover-trigger-width)]"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o RUC..." />
                    <CommandList>
                      <CommandEmpty>No encontrado.</CommandEmpty>
                      <CommandGroup>
                        {savedTransportistas.map((t) => (
                          <CommandItem
                            key={t.numeroDocumento}
                            value={`${t.razonSocial} ${t.numeroDocumento}`}
                            onSelect={() => selectTransportista(t)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-medium text-sm truncate">
                                {t.razonSocial}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t.numeroDocumento}
                                {t.placa ? ` · Placa: ${t.placa}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo Documento *</Label>
              <Select
                value={watch("transportistaTipoDoc") || ""}
                onValueChange={(v) => setValue("transportistaTipoDoc", v)}
              >
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem
                      key={t.code}
                      value={t.code}
                      className="cursor-pointer"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.transportistaTipoDoc?.message} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Numero Documento *
              </Label>
              <Input
                placeholder="20123456789"
                {...register("transportistaNumeroDoc")}
              />
              <FieldError message={errors.transportistaNumeroDoc?.message} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razon Social *</Label>
              <Input
                placeholder="TRANSPORTES S.A.C."
                {...register("transportistaRazonSocial")}
              />
              <FieldError
                message={errors.transportistaRazonSocial?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Placa</Label>
              <Input
                placeholder="ABC-123"
                {...register("transportistaPlaca")}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Los datos del transportista se guardan automaticamente al enviar la
            guia.
          </p>
        </FormSection>
        </div>

        {/* ── Step 3: Productos ────────────────────────────── */}
        <div className={currentStep !== 3 ? "hidden" : "flex flex-col gap-4"}>
        {/* ── 7. Items ────────────────────────────────────── */}
        <FormSection
          icon={Package}
          title={
            interStoreEnabled && sourceStoreId
              ? "Productos a Transferir"
              : "Items a Transportar"
          }
          badge={
            interStoreEnabled && sourceStoreId
              ? `Stock de ${selectedSourceStore?.name || "tienda"}`
              : undefined
          }
          step={7}
        >
          {errors.items?.root && (
            <div className="flex items-center gap-2 text-xs text-destructive mb-3 p-2 rounded-md bg-destructive/5 border border-destructive/10">
              <span>{errors.items.root.message}</span>
            </div>
          )}

          {/* ── Inter-store stock-aware items ─────────────── */}
          {interStoreEnabled && sourceStoreId ? (
            <>
              {/* Stock-aware product picker */}
              <div className="mb-4">
                <Popover
                  open={storeProductSearchOpen}
                  onOpenChange={setStoreProductSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className="cursor-pointer gap-2 w-full justify-start text-sm font-normal text-muted-foreground hover:text-foreground"
                    >
                      <Search className="h-3.5 w-3.5 flex-shrink-0" />
                      {loadingStoreProducts
                        ? "Cargando productos..."
                        : `Buscar producto en ${selectedSourceStore?.name || "tienda"}...`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nombre o codigo..."
                        value={storeProductSearch}
                        onValueChange={setStoreProductSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {loadingStoreProducts
                            ? "Cargando..."
                            : "No se encontraron productos con stock."}
                        </CommandEmpty>
                        <CommandGroup
                          heading={`${filteredStoreProducts.length} productos con stock`}
                        >
                          {filteredStoreProducts.map((sp: any) => {
                            const product = sp.inventory?.product || sp;
                            const productId = product.id || sp.productId || 0;
                            const already = transferItems.some(
                              (ti) => ti.productId === productId,
                            );
                            return (
                              <CommandItem
                                key={sp.id || productId}
                                value={String(sp.id || productId)}
                                onSelect={() =>
                                  !already && addTransferProduct(sp)
                                }
                                className={`cursor-pointer ${already ? "opacity-50" : ""}`}
                              >
                                <div className="flex items-center gap-2.5 w-full min-w-0">
                                  <div className="rounded bg-primary/10 p-1 flex-shrink-0">
                                    <Package className="h-3 w-3 text-primary" />
                                  </div>
                                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <span className="font-medium text-sm truncate">
                                      {product.name}
                                    </span>
                                    {product.barcode && (
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {product.barcode}
                                      </span>
                                    )}
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] flex-shrink-0"
                                  >
                                    Stock: {sp.stock ?? 0}
                                  </Badge>
                                  {already ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Transfer items table */}
              {transferItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border border-dashed text-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Busca productos de {selectedSourceStore?.name} para
                    transferir.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="min-w-[180px] text-xs font-semibold">
                          Producto
                        </TableHead>
                        <TableHead className="min-w-[70px] text-xs font-semibold text-center">
                          Stock
                        </TableHead>
                        <TableHead className="min-w-[90px] text-xs font-semibold">
                          Cantidad
                        </TableHead>
                        <TableHead className="min-w-[110px] text-xs font-semibold">
                          Series
                        </TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((ti, index) => (
                        <TableRow
                          key={`${ti.productId}-${index}`}
                          className="animate-row-enter"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="p-1.5">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-medium text-sm truncate">
                                {ti.name}
                              </span>
                              {ti.barcode && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {ti.barcode}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="p-1.5 text-center">
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono"
                            >
                              {ti.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              min={1}
                              max={ti.stock}
                              value={ti.quantity}
                              onChange={(e) =>
                                updateTransferQuantity(
                                  index,
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-sm w-20"
                            />
                            {ti.quantity > ti.stock && (
                              <p className="text-[10px] text-destructive mt-0.5">
                                Excede stock
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs cursor-pointer gap-1.5"
                                  onClick={() => {
                                    if (ti.availableSerials.length === 0) {
                                      loadSerialsForItem(index);
                                    }
                                  }}
                                >
                                  {ti.loadingSerials ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Package className="h-3 w-3" />
                                  )}
                                  {ti.selectedSerials.length > 0
                                    ? `${ti.selectedSerials.length} sel.`
                                    : "Series"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-60 p-0"
                                align="start"
                              >
                                {ti.availableSerials.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-muted-foreground">
                                    {ti.loadingSerials
                                      ? "Cargando series..."
                                      : "Sin series disponibles"}
                                  </div>
                                ) : (
                                  <div className="max-h-48 overflow-y-auto">
                                    <div className="p-2 border-b">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {ti.availableSerials.length} series
                                        disponibles
                                      </p>
                                    </div>
                                    {ti.availableSerials.map((serial) => {
                                      const isSelected =
                                        ti.selectedSerials.includes(serial);
                                      return (
                                        <button
                                          key={serial}
                                          type="button"
                                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono cursor-pointer hover:bg-muted/50 transition-colors ${
                                            isSelected
                                              ? "bg-primary/5 text-primary"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            toggleSerialSelection(
                                              index,
                                              serial,
                                            )
                                          }
                                        >
                                          <div
                                            className={`h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                              isSelected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-muted-foreground/30"
                                            }`}
                                          >
                                            {isSelected && (
                                              <CheckCircle2 className="h-2.5 w-2.5" />
                                            )}
                                          </div>
                                          <span className="truncate">
                                            {serial}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                              onClick={() => removeTransferItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
          <>
          {/* Product search */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <Popover
              open={productSearchOpen}
              onOpenChange={setProductSearchOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="cursor-pointer gap-2 flex-1 justify-start text-sm font-normal text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-3.5 w-3.5 flex-shrink-0" />
                  Buscar producto del inventario...
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)]"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por nombre o codigo..."
                    value={productSearch}
                    onValueChange={setProductSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                    <CommandGroup heading={`${filteredProducts.length} productos`}>
                      {filteredProducts.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={String(p.id)}
                          onSelect={() => addProductAsItem(p)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 w-full min-w-0">
                            <div className="rounded bg-primary/10 p-1 flex-shrink-0">
                              <Package className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">
                                {p.name}
                              </span>
                              {p.barcode && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {p.barcode}
                                </span>
                              )}
                            </div>
                            <Plus className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
              onClick={() =>
                append({
                  codigo: "",
                  descripcion: "",
                  cantidad: 1,
                  unidadMedida: "NIU",
                  isManual: true,
                  saveAsProduct: false,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Item manual
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border border-dashed text-center">
              <Package className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Agrega productos del inventario o items manuales.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[100px] text-xs font-semibold">
                    Codigo
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold">
                    Descripcion
                  </TableHead>
                  <TableHead className="min-w-[80px] text-xs font-semibold">
                    Cantidad
                  </TableHead>
                  <TableHead className="min-w-[130px] text-xs font-semibold">
                    Unidad
                  </TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow
                    key={field.id}
                    className="animate-row-enter"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="p-1.5">
                      <Input
                        placeholder="Codigo"
                        className="h-9 text-sm"
                        {...register(`items.${index}.codigo`)}
                      />
                      <FieldError
                        message={errors.items?.[index]?.codigo?.message}
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input
                        placeholder="Descripcion del producto"
                        className="h-9 text-sm"
                        {...register(`items.${index}.descripcion`)}
                      />
                      <FieldError
                        message={errors.items?.[index]?.descripcion?.message}
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="h-9 text-sm"
                        {...register(`items.${index}.cantidad`)}
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Select
                        defaultValue={field.unidadMedida || "NIU"}
                        onValueChange={(v) =>
                          setValue(`items.${index}.unidadMedida`, v)
                        }
                      >
                        <SelectTrigger className="h-9 cursor-pointer text-sm w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_MEDIDA.map((u) => (
                            <SelectItem
                              key={u.code}
                              value={u.code}
                              className="cursor-pointer"
                            >
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <div className="flex items-center gap-0.5">
                        {(field as any).isManual && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={watch(`items.${index}.saveAsProduct`) ? "Se guardará como producto" : "Guardar como producto"}
                            className={`h-9 w-9 cursor-pointer rounded-full transition-colors ${
                              watch(`items.${index}.saveAsProduct`)
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                            onClick={() => {
                              const current = watch(`items.${index}.saveAsProduct`);
                              setValue(`items.${index}.saveAsProduct`, !current);
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
          </>
          )}
        </FormSection>

        {/* ── 8. Peso ─────────────────────────────────────── */}
        <FormSection icon={Weight} title="Peso Bruto" badge="Opcional" step={8}>
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Peso Total</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("pesoBrutoTotal")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unidad</Label>
              <Select
                defaultValue="KGM"
                onValueChange={(v) => setValue("pesoBrutoUnidad", v)}
              >
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_PESO.map((u) => (
                    <SelectItem
                      key={u.code}
                      value={u.code}
                      className="cursor-pointer"
                    >
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>
        </div>

        {/* ── Wizard Navigation ─────────────────────────────── */}
        <Card className="border shadow-sm overflow-hidden w-full min-w-0">
          <CardContent className="flex flex-col gap-3 p-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleWizardBack}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Paso {currentStep + 1} de {FORM_STEPS.length}
              </span>

              {currentStep < FORM_STEPS.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer gap-1.5 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleWizardNext}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="w-[100px]" />
              )}
            </div>

            {/* Submit actions — only visible on last step */}
            {currentStep === FORM_STEPS.length - 1 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center pt-2 border-t animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <p className="text-xs text-muted-foreground">
                  Valida el XML antes de enviar para asegurar que los datos son
                  correctos.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                  <Link href="/dashboard/transfers">
                    <Button
                      type="button"
                      variant="ghost"
                      className="cursor-pointer w-full sm:w-auto rounded-full"
                    >
                      Cancelar
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer gap-2 w-full sm:w-auto rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={validating}
                    onClick={onValidate}
                  >
                    {validating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Validar XML
                  </Button>
                  <Button
                    type="submit"
                    className="cursor-pointer gap-2 w-full sm:w-auto rounded-full shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar a SUNAT
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* ── XML Preview Dialog ──────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Vista Previa XML
            </DialogTitle>
            <DialogDescription>
              XML generado y firmado digitalmente.
              {previewData?.zipFileName && (
                <>
                  {" "}
                  Archivo:{" "}
                  <code className="text-xs">{previewData.zipFileName}</code>
                  {previewData.zipSize && (
                    <> ({(previewData.zipSize / 1024).toFixed(1)} KB)</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono border max-h-[50vh]">
            {previewData?.xmlPreview || "Sin datos"}
          </pre>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setPreviewOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              className="cursor-pointer gap-2 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={submitting}
              onClick={onSubmit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar a SUNAT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SUNAT RUC Lookup Dialog ────────────────────── */}
      <Dialog
        open={sunatDialogOpen}
        onOpenChange={(open) => {
          setSunatDialogOpen(open);
          if (!open) {
            setSunatRucValue("");
            setSunatSearchResult(null);
            setSunatSearchError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Consultar RUC en SUNAT
            </DialogTitle>
            <DialogDescription>
              Ingresa el RUC del destinatario para consultar sus datos en
              SUNAT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0">
            <div className="flex gap-2">
              <Input
                value={sunatRucValue}
                onChange={(e) => setSunatRucValue(e.target.value)}
                placeholder="Ej: 20519857538"
                className="font-mono"
                autoFocus
                maxLength={11}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSunatRucSearch();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSunatRucSearch}
                disabled={sunatSearchLoading}
                className="cursor-pointer flex-shrink-0"
              >
                {sunatSearchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {sunatSearchError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full min-w-0 overflow-hidden">
                <p className="text-sm text-destructive break-words">
                  {sunatSearchError}
                </p>
              </div>
            )}

            {sunatSearchResult && (
              <div className="rounded-lg border animate-in fade-in-0 slide-in-from-bottom-2 duration-300 overflow-hidden">
                {/* Company info */}
                <div className="p-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-semibold text-sm break-words">
                      {sunatSearchResult.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      RUC: {sunatSearchResult.identifier}
                    </p>
                    {sunatSearchResult.address && (
                      <p className="text-xs text-muted-foreground break-words">
                        {sunatSearchResult.address}
                      </p>
                    )}
                    {sunatSearchResult.status && (
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] mt-1"
                      >
                        {sunatSearchResult.status}{" "}
                        {sunatSearchResult.condition
                          ? `· ${sunatSearchResult.condition}`
                          : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t bg-muted/30 px-3 py-2 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Seleccionar y guardar como:
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 cursor-pointer gap-1.5 h-8 text-xs"
                      disabled={sunatSaving}
                      onClick={() => handleSelectSunatResult(sunatSearchResult)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      Solo usar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 cursor-pointer gap-1.5 h-8 text-xs"
                      disabled={sunatSaving}
                      onClick={() => handleSelectSunatResult(sunatSearchResult, "provider")}
                    >
                      {sunatSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : <Building2 className="h-3.5 w-3.5 flex-shrink-0" />}
                      Proveedor
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 cursor-pointer gap-1.5 h-8 text-xs"
                      disabled={sunatSaving}
                      onClick={() => handleSelectSunatResult(sunatSearchResult, "client")}
                    >
                      {sunatSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : <User className="h-3.5 w-3.5 flex-shrink-0" />}
                      Cliente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!sunatSearchResult && !sunatSearchError && !sunatSearchLoading && (
              <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-dashed text-center">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Ingresa un RUC de 11 digitos y presiona buscar.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <SubscriptionBlockedDialog
        open={subscriptionBlocked}
        onOpenChange={setSubscriptionBlocked}
        feature="guías de remisión"
      />
    </div>
  );
}
