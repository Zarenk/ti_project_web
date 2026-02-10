"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Banknote, Barcode, CalendarIcon, Check, ChevronsUpDown, CreditCard, Landmark, Layers, Loader2, Plus, Save, Search, Smartphone, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { BACKEND_URL, cn, normalizeOptionValue, uploadPdfToServer } from '@/lib/utils'
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {jwtDecode} from 'jwt-decode';
import { getAuthToken } from "@/utils/auth-token";
import {  getStores } from '../../stores/stores.api'
import { getCategories } from '../../categories/categories.api'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from "date-fns/locale";
import AddClientDialog from '../components/AddClientDialog'
import { createSale, fetchSeriesByProductAndStore, generarYEnviarDocumento, getPaymentMethods, getProductsByStore, getSeriesByProductAndStore, getStockByProductAndStore, lookupSunatDocument, type LookupResponse, sendInvoiceToSunat } from '../sales.api'
import { AddSeriesDialog } from '../components/AddSeriesDialog'
import { SeriesModal } from '../components/SeriesModal'
import { StoreChangeDialog } from '../components/StoreChangeDialog'
import { getRegisteredClients } from '../../clients/clients.api'
import { updateProductPriceSell } from '../../inventory/inventory.api'
import { InvoiceDocument } from '../components/pdf/InvoiceDocument'
import QRCode from 'qrcode';
import { numeroALetrasCustom } from '../components/utils/numeros-a-letras'
import { pdf } from '@react-pdf/renderer';
import { PaymentMethodsModal } from '../components/PaymentMethodsSelector'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { useTenantSelection } from '@/context/tenant-selection-context'
import { useAuth } from '@/context/auth-context'
import { getCompanyDetail, type CompanyDetail } from '../../tenancy/tenancy.api'
import { UnauthenticatedError } from '@/utils/auth-fetch'
import { BrandLogo } from '@/components/BrandLogo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
// @ts-ignore
const Numalet = require('numalet');

// Función para obtener el userId del token JWT almacenado en localStorage
async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error('No se encontró un token de autenticación');
    return null;
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token); // Decodifica el token
    return decodedToken.sub; // Retorna el userId (sub es el estándar en JWT para el ID del usuario)
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
}

// Define el tipo para los métodos de pago seleccionados
type SelectedPayment = {
  paymentMethodId: number | null;
  amount: number;
  currency: string;
};
type PaymentMethodOption = { id: number; name: string };
const defaultPaymentMethods: PaymentMethodOption[] = [
  { id: -1, name: "EN EFECTIVO" },
  { id: -2, name: "TRANSFERENCIA" },
  { id: -3, name: "PAGO CON VISA" },
  { id: -4, name: "YAPE" },
  { id: -5, name: "PLIN" },
  { id: -6, name: "OTRO MEDIO DE PAGO" },
];
const getPaymentMethodIcon = (name: string) => {
  const upper = name.toUpperCase();
  if (upper.includes("EFECTIVO")) return <Banknote className="h-4 w-4" />;
  if (upper.includes("TRANSFERENCIA")) return <Landmark className="h-4 w-4" />;
  if (upper.includes("VISA")) return <BrandLogo src="/icons/visa.png" alt="Visa" className="h-4 w-4" />;
  if (upper.includes("YAPE")) return <BrandLogo src="/icons/yape.png" alt="Yape" className="h-4 w-4" />;
  if (upper.includes("PLIN")) return <BrandLogo src="/icons/plin.png" alt="Plin" className="h-4 w-4" />;
  if (upper.includes("TARJETA")) return <CreditCard className="h-4 w-4" />;
  if (upper.includes("APP") || upper.includes("BILLETERA")) return <Smartphone className="h-4 w-4" />;
  return null;
};

//definir el esquema de validacion
const salesSchema = z.object({
  name: z.string({}),
  description: z.string({}),
  createdAt: z.string().optional(), // Campo opcional
  price: z.number({}),
  quantity: z.number({}),
  category_name: z.string({}),
  client_name: z.string({}),
  client_type: z.string({}),
  client_typeNumber: z.string({}),
  store_name: z.string({}),
  store_adress: z.string({}),
  serie: z.string({}),
  nroCorrelativo: z.string({}),
  ruc: z.string({}),
  fecha_emision_comprobante: z.string({}),
  tipoComprobante: z.string({}),
  total_comprobante: z.string({}),
  tipo_moneda: z.string({}),
  stock: z.number({}),
})
//inferir el tipo de dato
export type SalesType = z.infer<typeof salesSchema>;

function buildDefaultSaleValues(sale?: any): SalesType {
  return {
    name: sale?.name ?? "",
    description: sale?.description ?? "",
    createdAt: sale?.createdAt ?? "",
    price: sale?.price ?? 1,
    quantity: sale?.quantity ?? 1,
    category_name: sale?.category_name ?? "",
    client_name: sale?.client_name ?? "",
    client_type: sale?.client_type ?? "",
    client_typeNumber: sale?.client_typeNumber ?? "",
    store_name: sale?.store_name ?? "",
    store_adress: sale?.store_adress ?? "",
    serie: sale?.serie ?? "",
    nroCorrelativo: sale?.nroCorrelativo ?? "",
    ruc: sale?.ruc ?? "",
    fecha_emision_comprobante: sale?.fecha_emision_comprobante ?? "",
    tipoComprobante: sale?.tipoComprobante ?? "",
    total_comprobante: sale?.total_comprobante ?? "",
    tipo_moneda: sale?.tipo_moneda ?? "PEN",
    stock: sale?.stock ?? 0,
  };
}

const renderStatusChip = (filled: boolean, optional = false) => (
  <span
    className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      filled
        ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
        : optional
        ? "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300"
        : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
    }`}
  >
    {filled ? "Listo" : optional ? "Opcional" : "Requerido"}
  </span>
)

export function SalesForm({sales, categories}: {sales: any; categories: any}) {

  const initialValues = useMemo(() => buildDefaultSaleValues(sales), [sales]);
  const form = useForm<SalesType>({
    resolver: zodResolver(salesSchema),
    defaultValues: initialValues,
  });
  // Estado para los productos
  const [products, setProducts] = useState<
    { id: number; name: string; price: number; description: string; categoryId: number; category_name: string; stock: number }[]
  >([]); 

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);
  const { selection, version } = useTenantSelection();
  const { userId } = useAuth();

  // Extraer funciones y estados del formulario
  const { handleSubmit, register, setValue, formState: {errors} } = form;
  useEffect(() => {
    console.log("Errores del formulario:", errors);
  }, [errors]);

  useEffect(() => {
    setCurrency(initialValues.tipo_moneda || "PEN");
    setSelectedDate(
      initialValues.fecha_emision_comprobante
        ? new Date(initialValues.fecha_emision_comprobante)
        : new Date(),
    );
    setCreatedAt(initialValues.createdAt ? new Date(initialValues.createdAt) : null);
  }, [initialValues]);

  // Estado para manejar el archivo PDF
  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el PDF GENERADO A PARTIR DE LA VENTA
  const [showPDF, setShowPDF] = useState(false); // Controla si se muestra el PDF
  const [pdfData, setPdfData] = useState<any>(null); // Almacena los datos para el PDF

  // Función para abrir el PDF en una nueva ventana
  const openPDFInNewWindow = async (documentData: JSX.Element) => {
    const blob = await pdf(documentData).toBlob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl);
  };

  // Estado para pagos
  const [payments, setPayments] = useState<SelectedPayment[]>([]); // Define el tipo explícito
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethodOption[]>(defaultPaymentMethods);
  const [quickPaymentMethodId, setQuickPaymentMethodId] = useState<number | null>(null);
  const [autoSyncPayment, setAutoSyncPayment] = useState(false);

  // Estado para manejar el modal de métodos de pago
  const [forceOpenPaymentModal, setForceOpenPaymentModal] = useState(false);

  // MODAL PARA SELECCIONAR SERIES
  const [isDialogOpenSeries, setIsDialogOpenSeries] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  
  // Estado para manejar el modal de series
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false); // Controla la apertura del modal  
  const [currentSeries, setCurrentSeries] = useState<string[]>([]); // Series del producto actual
  
  // Estado para manejar el combobox de series
const [availableSeries, setAvailableSeries] = useState<string[]>([]); // Series disponibles
const [selectedSeries, setSelectedSeries] = useState<string[]>([]); // Series seleccionadas en el modal
const saleReferenceIdRef = useRef<string | null>(null);
const getSaleReferenceId = () => {
  if (saleReferenceIdRef.current) {
    return saleReferenceIdRef.current;
  }
  const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackId;
  saleReferenceIdRef.current = generated;
  return generated;
};

  // Estado para controlar la superposición de carga al registrar la venta
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSunatDialogOpen, setIsSunatDialogOpen] = useState(false);
  const [sunatSearchValue, setSunatSearchValue] = useState("");
  const [sunatSearchResults, setSunatSearchResults] = useState<LookupResponse[]>([]);
  const [sunatSearchError, setSunatSearchError] = useState<string | null>(null);
  const [sunatSearchLoading, setSunatSearchLoading] = useState(false);
  
  // Estado para controlar el diálogo de confirmación del boton REGISTRAR VENTA
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estado para controlar el AlertDialog de precio 0
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false); // Controla la apertura del AlertDialog
  const [productWithZeroPrice, setProductWithZeroPrice] = useState<{ id: number; name: string } | null>(null); // Almacena el producto con precio 0
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [priceAlertValue, setPriceAlertValue] = useState<string>("");
  
  // Estado para manejar el modal de detalle de producto en pantallas pequeñas
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);

  // COMBOBOX DE PRODUCTOS
  const [open, setOpen] = React.useState(false)
  const [value, setValueProduct] = React.useState("")
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  // Estado para manejar la tienda seleccionada
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [activeCompany, setActiveCompany] = useState<CompanyDetail | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const normalizedBackendUrl = useMemo(
    () => BACKEND_URL.replace(/\/$/, ''),
    [],
  );
  const companyLogoUrl = useMemo(() => {
    const raw = activeCompany?.logoUrl?.trim();
    if (!raw) {
      return null;
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    return `${normalizedBackendUrl}/${raw.replace(/^\/+/, '')}`;
  }, [activeCompany?.logoUrl, normalizedBackendUrl]);

  useEffect(() => {
    if (!isPriceAlertOpen || !productWithZeroPrice) return;
    const target = products.find((product) => product.id === productWithZeroPrice.id);
    const currentPrice = typeof target?.price === "number" ? target.price : 0;
    setPriceAlertValue(currentPrice > 0 ? String(currentPrice) : "");
  }, [isPriceAlertOpen, productWithZeroPrice, products]);

  // Estado para rastrear si el combobox de tiendas ha sido tocado
  const [isStoreChangeDialogOpen, setIsStoreChangeDialogOpen] = useState(false); // Controla la apertura del AlertDialog
  const [pendingStore, setPendingStore] = useState<string | null>(null); // Almacena la tienda seleccionada temporalmente

  // CONTROLAR LA MONEDA
  const [currency, setCurrency] = useState<string>(initialValues.tipo_moneda || "PEN");

  // COMBOBOX DE COMPROBANTE
  const [openInvoice, setOpenInvoice] = useState(false); // Controla si el combobox está abierto
  const [valueInvoice, setValueInvoice] = useState(""); // Almacena el valor seleccionado

  // Estado para controlar si el combobox de clientes está habilitado
  const [isClientDisabled, setIsClientDisabled] = useState(true);

  // Estados para agregar un producto al datatable
  const [selectedProducts, setSelectedProducts] = useState<
    { id: number; name: string; price: number; quantity: number; category_name: string, series?: string[], newSeries?: string }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{ id: number; name: string; price: number; categoryId: number; category_name: string; series?: string[] } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [stock, setStock] = useState<number>(0);
  const totalProductsAmount = useMemo(
    () => selectedProducts.reduce((sum, product) => sum + (product.price || 0) * (product.quantity || 0), 0),
    [selectedProducts],
  );
  const getMostUsedPaymentMethodId = (
    usage: Record<string, number>,
    fallback: number | null,
  ) => {
    const entries = Object.entries(usage);
    if (entries.length === 0) {
      return fallback ?? null;
    }
    let bestId = fallback ?? Number(entries[0][0]);
    let bestCount = -Infinity;
    for (const [key, value] of entries) {
      const id = Number(key);
      if (!Number.isFinite(id)) {
        continue;
      }
      if (value > bestCount) {
        bestId = id;
        bestCount = value;
      }
    }
    return Number.isFinite(bestId) ? bestId : fallback ?? null;
  };
  const handleQuickPaymentSelect = (methodId: number | null) => {
    if (methodId === null) {
      setQuickPaymentMethodId(null);
      setAutoSyncPayment(false);
      setPayments([]);
      setLastQuickPaymentMethodId(null);
      persistSalesContext({ lastQuickPaymentMethodId: null });
      return;
    }
    setQuickPaymentMethodId(methodId);
    setAutoSyncPayment(true);
    setLastQuickPaymentMethodId(methodId);
    persistSalesContext({ lastQuickPaymentMethodId: methodId });
    const nextAmount = Number(totalProductsAmount.toFixed(2));
    if (nextAmount > 0) {
      setPayments([
        {
          paymentMethodId: methodId,
          amount: nextAmount,
          currency,
        },
      ]);
    }
  };

  const NAME_COLUMN_MIN_WIDTH = 120;
  const NAME_COLUMN_MAX_WIDTH = 420;
  const [nameColumnWidth, setNameColumnWidth] = useState<number>(140);
  const productTableContainerRef = useRef<HTMLDivElement | null>(null);
  const nameColumnResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const nameColumnDraftWidthRef = useRef<number>(nameColumnWidth);

  useEffect(() => {
    nameColumnDraftWidthRef.current = nameColumnWidth;
    if (productTableContainerRef.current) {
      productTableContainerRef.current.style.setProperty('--name-column-width', `${nameColumnWidth}px`);
    }
  }, [nameColumnWidth]);

  useEffect(() => {
    if (payments.length > 1 && autoSyncPayment) {
      setAutoSyncPayment(false);
    }
  }, [payments.length, autoSyncPayment]);

  useEffect(() => {
    if (!autoSyncPayment) {
      return;
    }
    if (!quickPaymentMethodId) {
      return;
    }
    const nextAmount = Number(totalProductsAmount.toFixed(2));
    if (nextAmount <= 0) {
      if (payments.length > 0) {
        setPayments([]);
      }
      return;
    }
    if (
      payments.length === 1 &&
      payments[0]?.paymentMethodId === quickPaymentMethodId &&
      Number(payments[0]?.amount ?? 0) === nextAmount &&
      payments[0]?.currency === currency
    ) {
      return;
    }
    setPayments([
      {
        paymentMethodId: quickPaymentMethodId,
        amount: nextAmount,
        currency,
      },
    ]);
  }, [autoSyncPayment, quickPaymentMethodId, totalProductsAmount, currency, payments]);

  const handleNameColumnMouseMove = useCallback((event: MouseEvent) => {
    if (!nameColumnResizeStateRef.current) {
      return;
    }
    const delta = event.clientX - nameColumnResizeStateRef.current.startX;
    const nextWidth = Math.min(
      NAME_COLUMN_MAX_WIDTH,
      Math.max(NAME_COLUMN_MIN_WIDTH, nameColumnResizeStateRef.current.startWidth + delta),
    );
    nameColumnDraftWidthRef.current = nextWidth;
    productTableContainerRef.current?.style.setProperty('--name-column-width', `${nextWidth}px`);
  }, []);

  const stopNameColumnResize = useCallback(() => {
    if (!nameColumnResizeStateRef.current) {
      return;
    }
    nameColumnResizeStateRef.current = null;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleNameColumnMouseMove);
    document.removeEventListener('mouseup', stopNameColumnResize);
    setNameColumnWidth(nameColumnDraftWidthRef.current);
  }, [handleNameColumnMouseMove]);

  const startNameColumnResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      nameColumnResizeStateRef.current = {
        startX: event.clientX,
        startWidth: nameColumnDraftWidthRef.current,
      };
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleNameColumnMouseMove);
      document.addEventListener('mouseup', stopNameColumnResize);
    },
    [handleNameColumnMouseMove, stopNameColumnResize],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleNameColumnMouseMove);
      document.removeEventListener('mouseup', stopNameColumnResize);
      nameColumnResizeStateRef.current = null;
    };
  }, [handleNameColumnMouseMove, stopNameColumnResize]);

  const nameColumnWidthStyle = useMemo(
    () => ({
      width: `var(--name-column-width, ${nameColumnWidth}px)`,
      maxWidth: `var(--name-column-width, ${nameColumnWidth}px)`,
    }),
    [nameColumnWidth],
  );

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      const price = typeof product.price === 'number' ? product.price : 0;
      const qty = typeof product.quantity === 'number' ? product.quantity : 0;
      return sum + price * qty;
    }, 0);
  }, [selectedProducts]);

  const normalizedCurrency = (currency ?? "PEN") as "PEN" | "USD" | "EUR";

  const totalAmountInWords = useMemo(() => {
    if (selectedProducts.length === 0) {
      return '';
    }

    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const integerPart = Math.floor(roundedTotal);
    const cents = Math.round((roundedTotal % 1) * 100)
      .toString()
      .padStart(2, '0');

    const currencyLabels: Record<string, { singular: string; plural: string }> = {
      PEN: { singular: 'SOL', plural: 'SOLES' },
      USD: { singular: 'DÓLAR AMERICANO', plural: 'DÓLARES AMERICANOS' },
      EUR: { singular: 'EURO', plural: 'EUROS' },
    };

    const currencyLabel = currencyLabels[normalizedCurrency] ?? {
      singular: 'MONEDA',
      plural: 'MONEDAS',
    };

    const currencyText = integerPart === 1 ? currencyLabel.singular : currencyLabel.plural;

    const literal = numeroALetrasCustom(roundedTotal, normalizedCurrency)
      .replace('IMPORTE EN LETRAS:', '')
      .trim();

    const [amountWords] = literal.split(` ${currencyText} CON `);

    if (!amountWords) {
      return `SON ${literal}`;
    }

    return `SON ${amountWords} CON ${cents}/100 ${currencyText}`;
  }, [normalizedCurrency, selectedProducts.length, totalAmount]);

  // VARIABLES DE CALENDAR
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialValues.fecha_emision_comprobante
      ? new Date(initialValues.fecha_emision_comprobante)
      : new Date(),
  );
  const [openCalendar, setOpenCalendar] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(
    initialValues.createdAt ? new Date(initialValues.createdAt) : null,
  );

  // COMBOBOX DE TIENDAS
  const [stores, setStores] = useState<{ id: number; 
    name: string, description: string, adress: string }[]>([]); // Estado para as tiendas
  const [openStore, setOpenStore] = React.useState(false)
  const [valueStore, setValueStore] = React.useState("")

  // COMBOBOX DE Clientes
  const [isDialogOpenClient, setIsDialogOpenClient] = useState(false); // Controla la apertura del diálogo
  const [clients, setClients] = useState<{ id: number; 
    name: string, type: string, typeNumber: string }[]>([]); // Estado para los proveedores
  // Cargar los clientes al montar el componente
  const [openClient, setOpenClient] = React.useState(false)
  const [valueClient, setValueClient] = React.useState("")
  const salesContextKey = useMemo(() => {
    if (!userId || !selection.orgId) return null;
    const companyKey = selection.companyId ?? 0;
    return `sales-context:v1:${userId}:${selection.orgId}:${companyKey}`;
  }, [userId, selection.orgId, selection.companyId]);
  const [lastInvoiceType, setLastInvoiceType] = useState<string>("");
  const [invoiceTypeUsage, setInvoiceTypeUsage] = useState<Record<string, number>>({});
  const lastInvoiceTypeRef = useRef(lastInvoiceType);
  const invoiceTypeUsageRef = useRef(invoiceTypeUsage);
  const [lastStoreId, setLastStoreId] = useState<number | null>(null);
  const [recentClientIds, setRecentClientIds] = useState<number[]>([]);
  const [recentProductIds, setRecentProductIds] = useState<number[]>([]);
  const [lastQuickPaymentMethodId, setLastQuickPaymentMethodId] = useState<number | null>(null);
  const [paymentMethodUsage, setPaymentMethodUsage] = useState<Record<string, number>>({});
  const appliedDefaultsRef = useRef({
    invoice: false,
    store: false,
    client: false,
    product: false,
    payment: false,
  });
  const paymentMethodUsageRef = useRef(paymentMethodUsage);
  const lastProductOutOfStockNoticeRef = useRef(false);
  const preferredInvoiceType = useMemo(() => {
    const entries = Object.entries(invoiceTypeUsage);
    if (entries.length === 0) {
      return lastInvoiceType;
    }
    let bestType = lastInvoiceType || entries[0][0];
    let bestCount = -Infinity;
    for (const [key, value] of entries) {
      if (value > bestCount) {
        bestType = key;
        bestCount = value;
      }
    }
    return bestType;
  }, [invoiceTypeUsage, lastInvoiceType]);
  const preferredQuickPaymentMethodId = useMemo(() => {
    const entries = Object.entries(paymentMethodUsage);
    if (entries.length === 0) {
      return lastQuickPaymentMethodId;
    }
    let bestId = lastQuickPaymentMethodId ?? Number(entries[0][0]);
    let bestCount = -Infinity;
    for (const [key, value] of entries) {
      const id = Number(key);
      if (!Number.isFinite(id)) {
        continue;
      }
      if (value > bestCount) {
        bestId = id;
        bestCount = value;
      }
    }
    return bestId ?? null;
  }, [paymentMethodUsage, lastQuickPaymentMethodId]);
  const [categoriesState, setCategoriesState] = useState(categories ?? []);
  useEffect(() => {
    setCategoriesState(categories ?? []);
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const methodsFromBackend = (await getPaymentMethods()) ?? [];
        const combined = [...defaultPaymentMethods, ...methodsFromBackend];
        const unique = Array.from(new Map(combined.map((method) => [method.name, method])).values());
        if (!cancelled) {
          setPaymentMethodsList(unique);
        }
      } catch {
        if (!cancelled) {
          setPaymentMethodsList(defaultPaymentMethods);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setCategoriesState([]);
    async function fetchCategoriesByTenant() {
      try {
        const nextCategories = await getCategories();
        if (!cancelled) {
          setCategoriesState(Array.isArray(nextCategories) ? nextCategories : []);
        }
      } catch (error) {
        console.error("Error al obtener las categorías:", error);
        if (!cancelled) {
          setCategoriesState([]);
        }
      }
    }
    fetchCategoriesByTenant();
    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveCompany() {
      if (!selection?.companyId) {
        setActiveCompany(null);
        setIsCompanyLoading(false);
        return;
      }

      setIsCompanyLoading(true);
      try {
        const details = await getCompanyDetail(selection.companyId);
        if (!cancelled) {
          setActiveCompany(details);
        }
      } catch (error) {
        console.error("Error al obtener la empresa seleccionada:", error);
        if (!cancelled) {
          setActiveCompany(null);
        }
      } finally {
        if (!cancelled) {
          setIsCompanyLoading(false);
        }
      }
    }

    loadActiveCompany();

    return () => {
      cancelled = true;
    };
  }, [selection?.companyId, version]);

  const getCommandValue = (raw: unknown) =>
    typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";

  const currentTipoComprobante =
    form.watch("tipoComprobante") || valueInvoice || "";
  const canUseSunatLookup = ["FACTURA", "BOLETA"].includes(
    (currentTipoComprobante ?? "").toUpperCase(),
  );

  const resetSunatDialog = () => {
    setSunatSearchValue("");
    setSunatSearchResults([]);
    setSunatSearchError(null);
    setSunatSearchLoading(false);
  };

  const handleOpenSunatDialog = () => {
    if (!canUseSunatLookup) {
      toast.error("Disponible solo para Boleta o Factura.");
      return;
    }
    const currentDocument = form.getValues("client_typeNumber")?.trim() ?? "";
    setSunatSearchValue(currentDocument);
    setSunatSearchResults([]);
    setSunatSearchError(null);
    setIsSunatDialogOpen(true);
  };

  const handleSunatSearch = async () => {
    const documentValue = sunatSearchValue.trim();
    if (!/^\d{8}$|^\d{11}$/.test(documentValue)) {
      setSunatSearchError(
        "Ingresa un DNI (8 dígitos) o RUC (11 dígitos) para buscar.",
      );
      setSunatSearchResults([]);
      return;
    }

    setSunatSearchLoading(true);
    setSunatSearchError(null);
    try {
      const result = await lookupSunatDocument(documentValue);
      setSunatSearchResults([result]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo consultar el documento.";
      setSunatSearchError(message);
      setSunatSearchResults([]);
    } finally {
      setSunatSearchLoading(false);
    }
  };

  const handleSelectSunatResult = (result: LookupResponse) => {
    form.setValue("client_name", result.name ?? "");
    form.setValue("client_type", result.type === "RUC" ? "RUC" : "DNI");
    form.setValue("client_typeNumber", result.identifier ?? "");
    toast.success("Datos del cliente cargados desde SUNAT.");
    setIsSunatDialogOpen(false);
    resetSunatDialog();
  };

  const normalizedSelectedProductValue = useMemo(() => normalizeOptionValue(value), [value]);
  const normalizedSelectedStoreValue = useMemo(() => normalizeOptionValue(valueStore), [valueStore]);
  const normalizedSelectedClientValue = useMemo(() => normalizeOptionValue(valueClient), [valueClient]);

  const selectedProductOption = useMemo(
    () =>
      value
        ? products.find((product) => normalizeOptionValue(product.name) === normalizedSelectedProductValue) ?? null
        : null,
    [products, normalizedSelectedProductValue, value],
  );

  const selectedStoreOption = useMemo(
    () =>
      valueStore
        ? stores.find((store) => normalizeOptionValue(store.name) === normalizedSelectedStoreValue) ?? null
        : null,
    [stores, normalizedSelectedStoreValue, valueStore],
  );

  const selectedClientOption = useMemo(
    () =>
      valueClient
        ? clients.find((client) => normalizeOptionValue(client.name) === normalizedSelectedClientValue) ?? null
        : null,
    [clients, normalizedSelectedClientValue, valueClient],
  );

  const displayedProductName = selectedProductOption?.name ?? value ?? "";
  const displayedStoreName = selectedStoreOption?.name ?? valueStore ?? "";
  const displayedClientName = selectedClientOption?.name ?? valueClient ?? ""
  const recentClientSet = useMemo(
    () => new Set<number>(recentClientIds.filter((id) => typeof id === "number")),
    [recentClientIds],
  );
  const recentProductSet = useMemo(
    () => new Set<number>(recentProductIds.filter((id) => typeof id === "number")),
    [recentProductIds],
  );
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (valueInvoice === "FACTURA") {
        return client.type === "RUC";
      }
      if (valueInvoice === "BOLETA") {
        return client.type !== "RUC";
      }
      return true;
    });
  }, [clients, valueInvoice]);
  const orderedClients = useMemo(() => {
    if (recentClientIds.length === 0) {
      return filteredClients;
    }
    const recent = recentClientIds
      .map((id) => filteredClients.find((client) => client.id === id))
      .filter(Boolean) as any[];
    const rest = filteredClients.filter((client) => !recentClientSet.has(client.id));
    return [...recent, ...rest];
  }, [filteredClients, recentClientIds, recentClientSet]);
  const lastRecentProductId = recentProductIds.length > 0 ? recentProductIds[0] : null;
  const suggestedOutOfStockProduct = useMemo(() => {
    if (!selectedStoreId || !lastRecentProductId) {
      return null;
    }
    const candidate = products.find((product) => product.id === lastRecentProductId) ?? null;
    if (!candidate) {
      return null;
    }
    return (candidate.stock ?? 0) <= 0 ? candidate : null;
  }, [products, lastRecentProductId, selectedStoreId]);
  const orderedProducts = useMemo(() => {
    let baseProducts =
      selectedStoreId && !showOutOfStock
        ? products.filter((product) => (product.stock ?? 0) > 0)
        : products;
    if (suggestedOutOfStockProduct) {
      baseProducts = baseProducts.filter((product) => product.id !== suggestedOutOfStockProduct.id);
    }
    if (recentProductIds.length === 0) {
      return baseProducts;
    }
    const recent = recentProductIds
      .map((id) => baseProducts.find((product) => product.id === id))
      .filter(Boolean) as any[];
    const rest = baseProducts.filter((product) => !recentProductSet.has(product.id));
    return [...recent, ...rest];
  }, [
    products,
    recentProductIds,
    recentProductSet,
    selectedStoreId,
    showOutOfStock,
    suggestedOutOfStockProduct,
  ]);
  const persistSalesContext = useCallback(
    (next: Partial<{
      lastInvoiceType: string;
      invoiceTypeUsage: Record<string, number>;
      lastStoreId: number | null;
      recentClientIds: number[];
      recentProductIds: number[];
      lastQuickPaymentMethodId: number | null;
      paymentMethodUsage: Record<string, number>;
    }>) => {
      if (!salesContextKey || typeof window === "undefined") {
        return;
      }
      const payload = {
        lastInvoiceType,
        invoiceTypeUsage,
        lastStoreId,
        recentClientIds,
        recentProductIds,
        lastQuickPaymentMethodId,
        paymentMethodUsage,
        ...next,
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(salesContextKey, JSON.stringify(payload));
      } catch (error) {
        console.warn("No se pudo guardar el contexto de ventas:", error);
      }
    },
    [
      salesContextKey,
      lastInvoiceType,
      invoiceTypeUsage,
      lastStoreId,
      recentClientIds,
      recentProductIds,
      lastQuickPaymentMethodId,
      paymentMethodUsage,
    ],
  );

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {

  const userId = await getUserIdFromToken(); // Obtén el userId del token

      if (!userId) {
        toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
        return;
      }
      if (payments.length === 0) {
        toast.error("Debe agregar al menos un método de pago antes de registrar la venta.");
        return;
      }
      if (selectedProducts.length === 0) {
        toast.error("Debe agregar al menos un producto antes de registrar la venta.");
        return;
      }

      // Calcular el total de productos
      const totalProductos = selectedProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
      }, 0);

      // Calcular el total de los métodos de pago
      const totalPagos = payments.reduce((sum, payment) => {
        return sum + payment.amount;
      }, 0);

      // Validar que ambos totales sean iguales (permite pequeña tolerancia)
      const precision = 0.01;
      if (Math.abs(totalProductos - totalPagos) > precision) {
        toast.error(`El monto ingresado en los métodos de pago no coincide con el total de productos.
      Total productos: S/ ${totalProductos.toFixed(2)}
      Total metodo de pagos: S/ ${totalPagos.toFixed(2)}.
      Por favor revise.`);
        setForceOpenPaymentModal(true); // 👈 fuerza la apertura del modal
        return;
      }

    setIsSubmitting(true);

    try{
        // Validar que la tienda exista
        const storeId = stores.find((store) => store.name === data.store_name)?.id; // Encuentra el ID de la tienda seleccionada       
        if (!storeId) {
          toast.error("Debe seleccionar una tienda válida.");
          return;
        } 
           
        // Validar que el cliente exista, excepto si el tipo de comprobante es "SIN COMPROBANTE"
        let clientId = null;
        if (data.tipoComprobante === "SIN COMPROBANTE") {
          // Seleccionar automáticamente el cliente "SIN CLIENTE"
          const sinCliente = clients.find((client) => client.name === "Sin Cliente");
          if (sinCliente) {
            clientId = sinCliente.id;
          } else {
            clientId = null;
            //toast.error("No se encontró el cliente predeterminado 'Sin Ciente'.");
            //return;
          }
        } else {
          // Validar que el cliente exista, excepto si el nombre del cliente es "Sin Cliente"
          if (data.client_name !== "Sin Cliente") {
            clientId = clients.find((client) => client.typeNumber === data.client_typeNumber)?.id;
            if (!clientId) {
              toast.error("Debe seleccionar un cliente válido.");
              return;
            }
          }
          else{
            const sinClient = clients.find((client) => client.name === "Sin Cliente");
            if (sinClient) {
              clientId = sinClient.id;
            } else {
              toast.error("No se encontró el cliente predeterminado 'Sin Cliente'.");
              return;
            }
          }
        }

        // Asegurarse de que clientId no sea null
        if (clientId === null) {
          //toast.error("El cliente no es válido.");
          //return;         
        }

        // Validar que todos los productos tengan valores válidos
        selectedProducts.forEach((product) => {
          if (product.price === undefined || product.quantity === undefined) {
            throw new Error(`El producto "${product.name}" tiene datos incompletos.`);
          }
        });

        // Calcular el total
        const total = selectedProducts.reduce((sum, product) => {
          const productTotal = product.price * product.quantity;
          return sum + (isNaN(productTotal) ? 0 : productTotal); // Asegurarse de que no se sumen valores NaN
        }, 0);


        // Transformar los productos seleccionados al formato esperado
        const transformedDetails = selectedProducts.map((product) => ({
          productId: product.id, // Usar `id` como `productId`
          quantity: product.quantity,
          price: Number(product.price),
          series: product.series || [], // Incluir las series seleccionadas
        }));

        let comprobante: string | null = null;
        let serieInvoice: string | null = null;
        let correlativoInvoice: string | null = null;

        if (data.tipoComprobante === "FACTURA") {
          comprobante = "invoice";
        } else if (data.tipoComprobante === "BOLETA") {
          comprobante = "boleta";
        } else if (data.tipoComprobante === "SIN COMPROBANTE") {
          // Si el tipo de comprobante es "SIN COMPROBANTE", no hacer nada
          console.log("No se requiere comprobante para 'SIN COMPROBANTE'.");
        } else {
          // Si el tipo de comprobante no es válido, lanzar un error
          throw new Error("El tipo de comprobante no es válido.");
        }
        
        // Verificar si comprobante es válido antes de llamar a generarYEnviarDocumento
        if (comprobante) {
          const { respuesta } = await generarYEnviarDocumento({ documentType: comprobante });
          if (!respuesta) {
            throw new Error("La respuesta del backend no contiene los datos esperados.");
          }
          serieInvoice = respuesta.serie; // Obtén la serie de la respuesta o del formulario
          correlativoInvoice = respuesta.correlativo;

          console.log("Serie:", serieInvoice, "Correlativo:", correlativoInvoice);
        } else {
          console.log("No se generó ningún documento porque el tipo de comprobante es 'SIN COMPROBANTE'.");
        }

        let tipoDocumentoFormatted;
        if(data.client_type === "CARNET DE EXTRANJERIA"){
          tipoDocumentoFormatted = 'CE';
        }
        else{
          tipoDocumentoFormatted = data.client_type;
        }

        const payload = {         
          userId,
          storeId,
          clientId,
          total,
          description: data.description,
          payments,
          details: transformedDetails,
          tipoMoneda: data.tipo_moneda,
          source: 'POS',
          referenceId: getSaleReferenceId(),
          ...(data.tipoComprobante !== "SIN COMPROBANTE" && { // Solo incluir si no es "SIN COMPROBANTE"
            tipoComprobante: data.tipoComprobante,
          }),
        };

        const createdSale = await createSale(payload);
        console.log("Datos recibidos en createSale:", payload);

        if (!createdSale || !createdSale.id) {
          throw new Error("No se pudo obtener el ID de la venta creada.");
        }

        const paymentMethodIds = payments
          .map((payment) => payment.paymentMethodId)
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
        if (paymentMethodIds.length > 0) {
          setPaymentMethodUsage((prev) => {
            const next = { ...prev };
            for (const id of paymentMethodIds) {
              const key = String(id);
              next[key] = (next[key] ?? 0) + 1;
            }
            const mostUsedId = getMostUsedPaymentMethodId(next, paymentMethodIds[0] ?? null);
            setLastQuickPaymentMethodId(mostUsedId);
            persistSalesContext({
              paymentMethodUsage: next,
              lastQuickPaymentMethodId: mostUsedId,
            });
            return next;
          });
        }
 
        saleReferenceIdRef.current = null;
        toast.success("Se registro la informacion correctamente."); // Notificaci??n de ?xito
 

        if(data.tipoComprobante != "SIN COMPROBANTE"){
          // Llamar al endpoint para enviar la factura a la SUNAT
          const emitterBusinessName =
            activeCompany?.sunatBusinessName?.trim() ||
            activeCompany?.legalName?.trim() ||
            activeCompany?.name?.trim() ||
            data.store_name;

          const emitterAddress =
            activeCompany?.sunatAddress?.trim() || data.store_adress || "";

          const emitterPhone = activeCompany?.sunatPhone?.trim() || null;

          const emitterRuc =
            activeCompany?.sunatRuc?.trim() ||
            activeCompany?.taxId?.trim() ||
            "";

          const invoicePayload = {
            saleId: createdSale.id,
            companyId: activeCompany?.id ?? selection?.companyId ?? null,
            serie: serieInvoice,
            correlativo: correlativoInvoice,
            documentType: comprobante,
            tipoMoneda: data.tipo_moneda,
            total: Number(total),
            fechaEmision: createdAt ? createdAt.toISOString() : new Date().toISOString(),
            logoUrl: companyLogoUrl,
            primaryColor: activeCompany?.primaryColor ?? null,
            secondaryColor: activeCompany?.secondaryColor ?? null,
            cliente: {
              razonSocial: data.client_name,
              ruc: data.client_typeNumber,
              dni: data.client_typeNumber,
              nombre: data.client_name,
              tipoDocumento: tipoDocumentoFormatted,
            },
            emisor: {
              razonSocial: emitterBusinessName,
              address: emitterAddress,
              adress: emitterAddress,
              phone: emitterPhone,
              ruc: emitterRuc,
              logoUrl: companyLogoUrl,
              primaryColor: activeCompany?.primaryColor ?? null,
              secondaryColor: activeCompany?.secondaryColor ?? null,
            },
            items: selectedProducts.map((product) => ({
              cantidad: Number(product.quantity),
              descripcion: product.name,
              series: product.series || [], // Pasar las series al documento
              precioUnitario: Number(product.price),
              subtotal: Number((product.price * product.quantity) / 1.18), // Subtotal sin IGV
              igv: Number((product.price * product.quantity) - (product.price * product.quantity) / 1.18), // IGV
              total: Number(product.price * product.quantity), // Total con IGV
            })),
          };

          console.log("Payload para SUNAT:", invoicePayload);

          const sunatResponse = await sendInvoiceToSunat(invoicePayload);
          console.log("Respuesta de la SUNAT:", sunatResponse);

          // Luego dentro de onSubmit, después de calcular `total`:
          const totalTexto = numeroALetrasCustom(total, 'PEN'); // 'PEN' | 'USD'
          console.log("Importe en letras:", totalTexto); // Verificar el resultado

          // Generar el código QR
          const qrData = `Representación impresa de la ${data.tipoComprobante.toUpperCase()} ELECTRÓNICA\nN° ${data.serie}-${data.nroCorrelativo}`;
          const qrCode = await QRCode.toDataURL(qrData);

          // ✅ Mostrar el PDF en nueva ventana
          await openPDFInNewWindow(
            <InvoiceDocument
              data={{ ...invoicePayload, serie: serieInvoice, correlativo: correlativoInvoice }}
              qrCode={qrCode}
              importeEnLetras={totalTexto}
            />
          );

          const blob = await pdf(
            <InvoiceDocument
              data={{ ...invoicePayload, serie: serieInvoice, correlativo: correlativoInvoice }}
              qrCode={qrCode}
              importeEnLetras={totalTexto}
            />
          ).toBlob();
          
          await uploadPdfToServer({
            blob,
            ruc: 20519857538,
            tipoComprobante: comprobante ?? "SIN_COMPROBANTE", // "boleta" o "invoice"
            serie: serieInvoice!,
            correlativo: correlativoInvoice!,
          });

          setShowPDF(true);

          if (sunatResponse.message && sunatResponse.message.toLowerCase().includes("exitosamente")) {
            toast.success("Factura enviada a la SUNAT correctamente.");
          } else if (sunatResponse.message) {
            toast.error(`Error al enviar la factura a la SUNAT: ${sunatResponse.message}`);
          } else {
            toast.error("Error desconocido al enviar la factura a la SUNAT.");
          }
        }

        router.push("/dashboard/sales");
        router.refresh();
    }
    catch(error: any){
      if (error instanceof UnauthenticatedError) {
        toast.error("Tu sesion expiro. Inicia sesion nuevamente antes de registrar la venta.");
      } else {
        console.error("Error al registrar la venta o enviar la factura:", error);
        const message = error instanceof Error ? error.message : "Ocurrio un error al guardar la venta.";
        toast.error(message);
      }
    }
    finally {
      setIsSubmitting(false);
    }
  })    
  //

  // Manejar el cambio en el combobox de tipoComprobante
  const handleTipoComprobanteChange = (currentValue: string) => {
    if (!currentValue) {
      return;
    }
    setValueInvoice(currentValue); // Actualiza el estado local
    form.setValue("tipoComprobante", currentValue); // Actualiza el formulario
    setOpenInvoice(false); // Cierra el combobox
    setLastInvoiceType(currentValue);
    setInvoiceTypeUsage((prev) => {
      const next = {
        ...prev,
        [currentValue]: (prev[currentValue] ?? 0) + 1,
      };
      persistSalesContext({ lastInvoiceType: currentValue, invoiceTypeUsage: next });
      return next;
    });

    // Habilitar o deshabilitar el combobox de clientes según el valor seleccionado
    if (currentValue === "SIN COMPROBANTE") {
      setIsClientDisabled(true); // Deshabilita el combobox de clientes
    } else {
      setIsClientDisabled(false); // Habilita el combobox de clientes
    }

    // Limpiar los campos relacionados con el cliente
    setValueClient(""); // Limpia el valor del combobox de cliente
    form.setValue("client_name", ""); // Limpia el nombre del cliente
    form.setValue("client_type", ""); // Limpia el tipo de documento
    form.setValue("client_typeNumber", ""); // Limpia el número de documento
  };
  //

  // Manejar el cambio en el combobox de Tiendas
  const handleStoreChange = (storeIdentifier: string) => {
    const normalizedIdentifier = normalizeOptionValue(storeIdentifier);
    const nextStore =
      stores.find((store) => normalizeOptionValue(store.name) === normalizedIdentifier) ?? null;

    if (!nextStore) {
      console.error("Tienda no encontrada:", storeIdentifier);
      return;
    }

    setValueStore(nextStore.name || "");
    setSelectedStoreId(nextStore.id);
    setValue("store_name", nextStore.name || "");
    setValue("store_adress", nextStore.adress || "");
    setLastStoreId(nextStore.id);
    persistSalesContext({ lastStoreId: nextStore.id });

    setSelectedProducts([]);
    setCurrentProduct(null);
    setQuantity(1);
    setStock(0);
    setValueProduct("");
    setValue("category_name", "");
    setValue("price", 0);
    setValue("description", "");
    setOpenStore(false);
    lastProductOutOfStockNoticeRef.current = false;
    setShowOutOfStock(false);
  };
  //

  const recordRecentClient = (clientId: number) => {
    setRecentClientIds((prev) => {
      const next = [clientId, ...prev.filter((id) => id !== clientId)].slice(0, 10);
      persistSalesContext({ recentClientIds: next });
      return next;
    });
  };

  const recordRecentProduct = (productId: number) => {
    setRecentProductIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 10);
      persistSalesContext({ recentProductIds: next });
      return next;
    });
  };

  const selectProductForSale = async (selectedProduct: any) => {
    if (!selectedProduct) {
      return;
    }

    setValueProduct(selectedProduct.name || "");
    if (typeof selectedProduct.id === "number") {
      recordRecentProduct(selectedProduct.id);
    }

    const existingProduct = selectedProducts.find((item) => item.id === selectedProduct.id);
    let simulatedStock = existingProduct
      ? selectedProduct.stock - existingProduct.quantity
      : selectedProduct.stock;

    if (selectedStoreId) {
      try {
        const series = await getSeriesByProductAndStore(selectedStoreId, selectedProduct.id);

        setCurrentProduct({
          ...selectedProduct,
          series,
        });

        const realStock = await getStockByProductAndStore(selectedStoreId, selectedProduct.id);

        simulatedStock = existingProduct
          ? realStock - existingProduct.quantity
          : realStock;

        setStock(simulatedStock > 0 ? simulatedStock : 0);

        if (realStock <= 0) {
          toast("Stock no disponible en esta tienda.", {
            description: "Selecciona otra tienda o registra un ingreso de inventario.",
          });
        }

        if (selectedProduct.price === 0 || selectedProduct.price === null) {
          setProductWithZeroPrice({
            id: selectedProduct.id,
            name: selectedProduct.name,
          });
          setIsPriceAlertOpen(true);
          return;
        }
      } catch (error) {
        console.error("Error al obtener el stock del producto:", error);
        setCurrentProduct({
          ...selectedProduct,
          series: [],
        });
        setStock(0);
      }
    } else {
      console.warn("No se ha seleccionado una tienda");
      setCurrentProduct(null);
      setStock(0);
    }

    const category = categoriesState.find((cat: any) => cat.id === selectedProduct.categoryId);

    setValue(
      "category_name",
      category?.name || selectedProduct.category_name || "Sin categoria",
    );
    setValue("price", selectedProduct.price || 0);
    setValue("description", selectedProduct.description || "");
    setOpen(false);
  };

  // Función para eliminar un producto del datatable
  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  };
  //

  // Funcion para agregar productos al datatable
  const addProduct = () => {
    if (!currentProduct) {
      toast.error("No se ha seleccionado ningun producto.");
      return;
    }

    // 🔒 Validar si el precio es 0 o null
    if (!currentProduct.price || currentProduct.price === 0) {
      toast.error("Este producto no tiene un precio asignado. Vuelva a seleccionarlo e ingrese un precio válido.");
      return;
    }

    if (stock < 1) {
      toast.error("El stock disponible para este producto es 0. No se puede agregar más.");
      return;
    }
  
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      return;
    }

    if (quantity > stock) {
      toast.error("La cantidad no puede ser mayor al stock disponible.");
      return;
    }

    if (selectedSeries.length !== quantity) {
      // Si el producto no tiene series, continuar sin validar las series
      console.log("series:", currentProduct.series)
      if (currentProduct.series && currentProduct.series.length > 0){
        toast.error("Debe seleccionar tantas series como la cantidad ingresada.");
        return;
      }else{
        // Si el producto no tiene series, continuar sin validar las series
      console.log("El producto no tiene series, se permite agregarlo sin seleccionarlas.")
      }
    }

    let categoryName = form.getValues("category_name");

    // Verifica si el producto ya está en la lista
    const existingProduct = selectedProducts.find(
      (product) => product.id === currentProduct.id
    );
  
    // Calcula el stock restante después de considerar los productos ya agregados
    const remainingStock = existingProduct
    ? stock - existingProduct.quantity
    : stock;

    if (existingProduct) {
    // Si el producto ya existe, actualiza la cantidad
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === currentProduct.id
          ? { ...product,
            quantity: product.quantity + quantity, 
            series: [...(product.series || []), ...selectedSeries], // Agregar series
          }
          : product
      )
    );
        toast.success("Cantidad actualizada para el producto existente.");
      } else {
      // Si el producto no existe, agrégalo
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          quantity,
          category_name: categoryName || "Sin categoria", // Incluye el nombre de la categoría
          series: selectedSeries, // Agregar series
        },
      ]);
      toast.success("Producto agregado al detalle.");
    }

    // Actualiza el stock simulado
    setStock(remainingStock - quantity); // Actualiza el stock simulado
  
    // Limpia el producto actual y la cantidad
    setCurrentProduct(null);
    setQuantity(1);
    // Limpia los inputs relacionados
    setValue("category_name", "");
    setValue("price", 0);
    setValue("description", "");
    setStock(0);
    // Limpia el combobox
    setValueProduct(""); // Restablece el valor del combobox
    setOpen(false); // Cierra el combobox
    // **Limpia las series**
    setSeries([]); // Resetea el estado de las series
    // Limpia las series seleccionadas
    setSelectedSeries([]);
  };
  //

  // Cargar los productos cuando se selecciona una tienda
  useEffect(() => {
    let cancelled = false;

    async function fetchProductsByStore() {
      if (!selectedStoreId) {
        setProducts([]);
        return;
      }

      try {
        const products = await getProductsByStore(selectedStoreId);
        if (cancelled) return;
        const formattedProducts = products
          .map((item: any) => {
            const product = item?.inventory?.product;
            if (!product) return null;

            const category = product.category;
            return {
              id: product.id,
              name: product.name,
              price: product.priceSell ?? 0,
              description: product.description ?? '',
              categoryId: product.categoryId ?? null,
              category_name: category?.name ?? 'Sin categoría',
              stock: item?.stock ?? product.stock ?? 0,
            };
          })
          .filter(Boolean);

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Error al obtener los productos por tienda:', error);
        if (!cancelled) {
          setProducts([]);
        }
      }
    }

    fetchProductsByStore();
    return () => {
      cancelled = true;
    };
  }, [selectedStoreId, version]); // Ejecutar cuando cambie la tienda seleccionada    
  //

  // Cargar los clientes según el tenant
  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const response = await getRegisteredClients();
        if (!cancelled) {
          setClients(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        console.error('Error al obtener los clientes:', error);
        if (!cancelled) {
          setClients([]);
        }
      }
    }

    setClients([]);
    setValueClient('');
    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [version]);
  //

  // Cargar tiendas según el tenant
  useEffect(() => {
    let cancelled = false;

    async function fetchStoresData() {
      try {
        const storesResponse = await getStores();
        if (!cancelled) {
          setStores(Array.isArray(storesResponse) ? storesResponse : []);
        }
      } catch (error) {
        console.error('Error al obtener las tiendas:', error);
        if (!cancelled) {
          setStores([]);
        }
      }
    }

    setStores([]);
    setValueStore('');
    setSelectedStoreId(null);
    fetchStoresData();

    return () => {
      cancelled = true;
    };
  }, [version]);

  // Actualizar el valor del formulario cuando cambie el estado local
  useEffect(() => {
    form.setValue("tipo_moneda", currency, { shouldValidate: true });
  }, [currency, form]);
  //

  useEffect(() => {
    setShowPDF(false);
    setPdfData(null);
    setPayments([]);
    setForceOpenPaymentModal(false);
    setQuickPaymentMethodId(null);
    setAutoSyncPayment(false);
    setLastQuickPaymentMethodId(null);
    setPaymentMethodUsage({});
    setIsDialogOpen(false);
    setIsDialogOpenSeries(false);
    setIsSeriesModalOpen(false);
    setSeries([]);
    setAvailableSeries([]);
    setSelectedSeries([]);
    setCurrentSeries([]);
    setCurrentProduct(null);
    setSelectedProducts([]);
    setQuantity(1);
    setStock(0);
    setActiveProductIndex(null);
    setProductWithZeroPrice(null);
    setIsPriceAlertOpen(false);
    setOpen(false);
    setOpenStore(false);
    setOpenClient(false);
    setOpenInvoice(false);
    setValueProduct('');
    setValueStore('');
    setValueClient('');
    setSelectedStoreId(null);
    setPendingStore(null);
    setIsStoreChangeDialogOpen(false);
    setCurrency('PEN');
    setValueInvoice('');
    setIsClientDisabled(true);
    setSelectedDate(new Date());
    setCreatedAt(null);
    setStores([]);
    setProducts([]);
    setClients([]);
    form.reset(buildDefaultSaleValues());
    appliedDefaultsRef.current = {
      invoice: false,
      store: false,
      client: false,
      product: false,
      payment: false,
    };
  }, [version, form]);

  useEffect(() => {
    lastInvoiceTypeRef.current = lastInvoiceType;
  }, [lastInvoiceType]);

  useEffect(() => {
    invoiceTypeUsageRef.current = invoiceTypeUsage;
  }, [invoiceTypeUsage]);

  useEffect(() => {
    paymentMethodUsageRef.current = paymentMethodUsage;
  }, [paymentMethodUsage]);

  useEffect(() => {
    if (!salesContextKey || typeof window === "undefined") {
      setLastInvoiceType("");
      setInvoiceTypeUsage({});
      setLastStoreId(null);
      setRecentClientIds([]);
      setRecentProductIds([]);
      setLastQuickPaymentMethodId(null);
      setPaymentMethodUsage({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(salesContextKey);
      if (!raw) {
        if (!lastInvoiceTypeRef.current && Object.keys(invoiceTypeUsageRef.current).length === 0) {
          setLastInvoiceType("");
          setInvoiceTypeUsage({});
        }
        setLastStoreId(null);
        setRecentClientIds([]);
        setRecentProductIds([]);
        setLastQuickPaymentMethodId(null);
        setPaymentMethodUsage({});
        return;
      }
      const parsed = JSON.parse(raw);
      setLastInvoiceType(typeof parsed?.lastInvoiceType === "string" ? parsed.lastInvoiceType : "");
      if (parsed?.invoiceTypeUsage && typeof parsed.invoiceTypeUsage === "object") {
        const nextUsage: Record<string, number> = {};
        for (const [key, value] of Object.entries(parsed.invoiceTypeUsage)) {
          if (typeof value === "number" && Number.isFinite(value)) {
            nextUsage[key] = value;
          }
        }
        setInvoiceTypeUsage(nextUsage);
      } else {
        setInvoiceTypeUsage({});
      }
      setLastStoreId(typeof parsed?.lastStoreId === "number" ? parsed.lastStoreId : null);
      setRecentClientIds(
        Array.isArray(parsed?.recentClientIds)
          ? parsed.recentClientIds.filter((id: unknown) => typeof id === "number")
          : [],
      );
      setRecentProductIds(
        Array.isArray(parsed?.recentProductIds)
          ? parsed.recentProductIds.filter((id: unknown) => typeof id === "number")
          : [],
      );
      setLastQuickPaymentMethodId(
        typeof parsed?.lastQuickPaymentMethodId === "number" ? parsed.lastQuickPaymentMethodId : null,
      );
      if (parsed?.paymentMethodUsage && typeof parsed.paymentMethodUsage === "object") {
        const nextUsage: Record<string, number> = {};
        for (const [key, value] of Object.entries(parsed.paymentMethodUsage)) {
          if (typeof value === "number" && Number.isFinite(value)) {
            nextUsage[key] = value;
          }
        }
        setPaymentMethodUsage(nextUsage);
      } else {
        setPaymentMethodUsage({});
      }
    } catch (error) {
      console.warn("No se pudo leer el contexto de ventas:", error);
      if (!lastInvoiceTypeRef.current && Object.keys(invoiceTypeUsageRef.current).length === 0) {
        setLastInvoiceType("");
        setInvoiceTypeUsage({});
      }
      setLastStoreId(null);
      setRecentClientIds([]);
      setRecentProductIds([]);
      setLastQuickPaymentMethodId(null);
      setPaymentMethodUsage({});
    }
  }, [salesContextKey]);

  useEffect(() => {
    if (!salesContextKey || typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(salesContextKey);
      if (
        !raw &&
        (lastInvoiceTypeRef.current ||
          Object.keys(invoiceTypeUsageRef.current).length > 0 ||
          Object.keys(paymentMethodUsageRef.current).length > 0)
      ) {
        persistSalesContext({
          lastInvoiceType: lastInvoiceTypeRef.current,
          invoiceTypeUsage: invoiceTypeUsageRef.current,
          paymentMethodUsage: paymentMethodUsageRef.current,
        });
      }
    } catch (error) {
      console.warn("No se pudo sincronizar el contexto de ventas:", error);
    }
  }, [salesContextKey, persistSalesContext]);

  useEffect(() => {
    if (!salesContextKey) {
      return;
    }

    if (!appliedDefaultsRef.current.invoice) {
      if (!valueInvoice && preferredInvoiceType) {
        handleTipoComprobanteChange(preferredInvoiceType);
        appliedDefaultsRef.current.invoice = true;
      } else if (valueInvoice) {
        appliedDefaultsRef.current.invoice = true;
      }
    }

    if (!appliedDefaultsRef.current.store && stores.length > 0) {
      if (lastStoreId) {
        const store = stores.find((item) => item.id === lastStoreId);
        if (store && !valueStore) {
          handleStoreChange(store.name || "");
        }
      }
      appliedDefaultsRef.current.store = true;
    }

    if (!appliedDefaultsRef.current.client && clients.length > 0) {
      if (!preferredInvoiceType || valueInvoice === preferredInvoiceType) {
        if (!valueClient && !isClientDisabled && recentClientIds.length > 0) {
          const filteredClients = clients.filter((client) => {
            if (valueInvoice === "FACTURA") {
              return client.type === "RUC";
          }
          if (valueInvoice === "BOLETA") {
            return client.type !== "RUC";
          }
          return true;
        });
        const recentClient = recentClientIds
          .map((id) => filteredClients.find((client) => client.id === id))
          .find(Boolean);
          if (recentClient) {
            setValueClient(recentClient.name || "");
            setValue("client_name", recentClient.name || "");
            setValue("client_type", recentClient.type || "");
            setValue("client_typeNumber", recentClient.typeNumber || "");
          }
        }
      }
      appliedDefaultsRef.current.client = true;
    }

    if (!appliedDefaultsRef.current.product && products.length > 0) {
      if (!value && recentProductIds.length > 0 && selectedStoreId) {
        const recentProducts = recentProductIds
          .map((id) => products.find((product) => product.id === id))
          .filter(Boolean) as Array<{ id: number; stock?: number }>;
        const availableProduct = recentProducts.find((product) => (product.stock ?? 0) > 0);
        if (availableProduct) {
          void selectProductForSale(availableProduct);
        } else if (!lastProductOutOfStockNoticeRef.current) {
          toast("El último producto usado no tiene stock.", {
            description: "Selecciona otro producto o registra inventario.",
          });
          lastProductOutOfStockNoticeRef.current = true;
        }
      }
      appliedDefaultsRef.current.product = true;
    }
    if (!appliedDefaultsRef.current.payment) {
      let applied = false;
      if (payments.length === 0) {
        const candidateId =
          typeof preferredQuickPaymentMethodId === "number"
            ? preferredQuickPaymentMethodId
            : typeof lastQuickPaymentMethodId === "number"
            ? lastQuickPaymentMethodId
            : null;
        if (typeof candidateId === "number") {
          const exists = paymentMethodsList.some((method) => method.id === candidateId);
          if (exists) {
            handleQuickPaymentSelect(candidateId);
            applied = true;
          }
        }
      } else {
        applied = true;
      }
      if (quickPaymentMethodId !== null) {
        applied = true;
      }
      if (applied) {
        appliedDefaultsRef.current.payment = true;
      }
    }
  }, [
    salesContextKey,
    preferredInvoiceType,
    lastStoreId,
    recentClientIds,
    recentProductIds,
    selectedStoreId,
    stores,
    clients,
    products,
    payments.length,
    lastQuickPaymentMethodId,
    preferredQuickPaymentMethodId,
    paymentMethodsList,
    quickPaymentMethodId,
    valueStore,
    valueClient,
    value,
    valueInvoice,
    isClientDisabled,
    handleStoreChange,
    handleTipoComprobanteChange,
    setValue,
  ]);

  return (
    <div className="container mx-auto w-full max-w-4xl grid sm:max-w-md md:max-w-lg lg:max-w-4xl">
      {isSubmitting && (
        <div
          aria-live="assertive"
          aria-busy="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-4 text-card-foreground shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold uppercase tracking-[0.35em]">Cargando...</p>
          </div>
        </div>
      )}
      <form className='relative flex flex-col gap-2' onSubmit={onSubmit}>
        <TooltipProvider delayDuration={150}>
          <fieldset disabled={isSubmitting} className="contents">                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 flex-col border rounded-md p-2">                  
                        <Label className="text-sm font-medium mb-2">
                          <div className="flex items-center">
                            <span>Tipo de Comprobante</span>
                            {renderStatusChip(Boolean(form.getValues("tipoComprobante")))}
                          </div>
                        </Label>
                        <Popover open={openInvoice} onOpenChange={setOpenInvoice}>
                          <PopoverTrigger asChild>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openInvoice}
                                  className="w-[260px] justify-between text-xs cursor-pointer"
                                >
                                  {valueInvoice || "Selecciona un tipo de comprobante..."}
                                  <ChevronsUpDown className="opacity-50" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Selecciona el tipo de comprobante</TooltipContent>
                            </Tooltip>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar tipo de comprobante..." />
                              <CommandList>
                                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                <CommandGroup>
                                    {["SIN COMPROBANTE", "BOLETA", "FACTURA"].map((type) => (
                                    <CommandItem
                                      key={type}
                                      value={type}
                                      className="cursor-pointer transition-colors hover:bg-accent/60 rounded-sm px-1"
                                      onSelect={(currentValue) => {

                                        if (currentValue === valueInvoice) {
                                          setOpenInvoice(false); // Solo cierra el Popover
                                          return;
                                        }

                                        // Llama a la función handleTipoComprobanteChange
                                        handleTipoComprobanteChange(currentValue); // Actualiza el estado de habilitación del combobox de clientes
                                      }}
                                    >
                                      {type}
                                      <Check
                                        className={cn(
                                          "ml-auto",
                                          valueInvoice === type ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                        ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                      </Popover>
                      <div className="flex justify-between gap-1">                       
                          <Label className="text-sm font-medium py-2 mr-20 sm:mr-12 md:mr-0 xl:mr-12">Fecha de Comprobante</Label>
                      </div>
                      <div className="flex gap-1">                                                                     
                        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                          <PopoverTrigger asChild>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-[260px] justify-start text-left font-normal cursor-pointer",
                                    !selectedDate && "text-muted-foreground"
                                  )}
                                >
                                <CalendarIcon />
                                {selectedDate
                                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) // Mostrar la fecha en español
                                : "Selecciona una fecha"}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Define la fecha de emisión del comprobante</TooltipContent>
                            </Tooltip>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate || undefined}
                              onSelect={(date) => {
                                setSelectedDate(date || null); // Actualiza la fecha seleccionada
                                setCreatedAt(date || null); // Actualiza el estado de createdAt
                                setValue("createdAt", date ? date.toISOString() : ""); // Actualiza el formulario
                                setOpenCalendar(false); // Cierra el Popover
                              }}
                              locale={es}
                              disabled={(date) => {
                                const today = new Date();
                                const twoDaysAgo = new Date();
                                twoDaysAgo.setDate(today.getDate() - 3); // Calcula la fecha de hace dos días
                                return date > today || date < twoDaysAgo; // Deshabilita fechas futuras y más de dos días atrás
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        </div>
                        <div className="flex justify-between gap-1">
                          <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Moneda</Label>
                            <Select
                              value={currency} // Vincula el estado local
                              onValueChange={(value:any) => {
                                setCurrency(value); // Actualiza el estado local
                                form.setValue("tipo_moneda", value, { shouldValidate: true }); // Actualiza el formulario
                               }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectTrigger className="cursor-pointer transition-transform duration-150 hover:scale-[1.02]">
                                    <SelectValue placeholder="Selecciona una moneda" />
                                  </SelectTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Seleccionar moneda
                                </TooltipContent>
                              </Tooltip>
                              <SelectContent>
                                <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                <SelectItem value="USD">Dólares (USD)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col flex-grow">
                            <Label className="text-sm font-medium py-2">Ingrese Metodo de Pago</Label>
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                  <div className="flex w-full min-w-0 flex-col gap-1">
                                    <Select
                                      disabled={payments.length > 1}
                                      value={quickPaymentMethodId !== null ? String(quickPaymentMethodId) : ""}
                                      onValueChange={(value: string) => handleQuickPaymentSelect(Number(value))}
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <SelectTrigger className="w-full min-w-0 sm:min-w-[180px] cursor-pointer transition-transform duration-150 hover:scale-[1.02]">
                                            {(() => {
                                              if (payments.length > 1) {
                                                return (
                                                  <span className="flex min-w-0 items-center gap-2" data-slot="select-value">
                                                    <CreditCard className="h-4 w-4" />
                                                    <span className="truncate">Varios</span>
                                                  </span>
                                                );
                                              }
                                              const selectedMethod =
                                                quickPaymentMethodId !== null
                                                  ? paymentMethodsList.find(
                                                      (method) => method.id === quickPaymentMethodId
                                                    )
                                                  : null;
                                              if (!selectedMethod) {
                                                return <SelectValue placeholder="Metodo rapido" />;
                                              }
                                              return (
                                                <span className="flex min-w-0 items-center gap-2" data-slot="select-value">
                                                  {getPaymentMethodIcon(selectedMethod.name)}
                                                  <span className="truncate">{selectedMethod.name}</span>
                                                </span>
                                              );
                                            })()}
                                          </SelectTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          Seleccionar metodo de pago
                                        </TooltipContent>
                                      </Tooltip>
                                      <SelectContent>
                                  {paymentMethodsList.map((method) => (
                                    <SelectItem key={method.id} value={String(method.id)} textValue={method.name}>
                                      <span className="flex items-center gap-2">
                                        {getPaymentMethodIcon(method.name)}
                                        <span className="truncate">{method.name}</span>
                                        {preferredQuickPaymentMethodId === method.id && (
                                          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                            Más usado
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                      </SelectContent>
                                    </Select>
                                    {autoSyncPayment && payments.length === 1 && (
                                      <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                                        Monto autocompletado
                                      </span>
                                    )}
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto sm:self-start inline-flex items-center gap-2 cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
                                    onClick={() => {
                                      setAutoSyncPayment(false);
                                      setForceOpenPaymentModal(true);
                                    }}
                                  >
                                    <Layers className="h-4 w-4" />
                                    <span>Dividir pago</span>
                                  </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      Dividir el pago en varios metodos
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            <PaymentMethodsModal
                              hideTrigger
                              value={payments}
                              onChange={(nextPayments) => {
                                setPayments(nextPayments);
                                setAutoSyncPayment(false);
                              }}
                              selectedProducts={selectedProducts}
                              forceOpen={forceOpenPaymentModal}
                              onOpenChange={(open) => {
                                setForceOpenPaymentModal(false);
                                if (open) {
                                  setAutoSyncPayment(false);
                                }
                              }}
                            />
                          </div>
                        </div>
                    </div>
       
                    <div className="flex-1 flex flex-col border rounded-md p-2">
                        <Label htmlFor="provider-combobox" className="text-sm font-medium mb-2">
                          <div className="flex items-center">
                            <span>Ingrese un Cliente:</span>
                            {renderStatusChip(Boolean(form.getValues("client_name")), true)}
                          </div>
                        </Label>
                        <div className="flex justify-between gap-1">
                          <Popover open={openClient} onOpenChange={setOpenClient}>
                              <PopoverTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openClient}
                                      className="w-[260px] justify-between cursor-pointer"
                                      disabled={isClientDisabled}
                                    >
                                      {displayedClientName || "Selecciona un cliente..."}
                                      <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Selecciona el cliente que realizará la compra</TooltipContent>
                                </Tooltip>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar cliente..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                    <CommandGroup>
                                      {orderedClients.map((client) => {
                                          const normalizedClientName = normalizeOptionValue(client.name);
                                          const isSelected = normalizedClientName === normalizedSelectedClientValue;
                                          const commandValue = getCommandValue(client.name);

                                          return (
                                            <CommandItem
                                              key={client.id ?? client.name}
                                              value={commandValue}
                                              className="cursor-pointer transition-colors hover:bg-accent/60 rounded-sm px-1"
                                              onSelect={() => {
                                                if (isSelected) {
                                                  setOpenClient(false);
                                                  return;
                                                }

                                                setValueClient(client.name || "");
                                                setValue("client_name", client.name || "");
                                                setValue("client_type", client.type || "");
                                                setValue("client_typeNumber", client.typeNumber || "");
                                                if (typeof client.id === "number") {
                                                  recordRecentClient(client.id);
                                                }
                                                setOpenClient(false);
                                              }}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span>{client.name}</span>
                                                {recentClientSet.has(client.id) && (
                                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                    Reciente
                                                  </span>
                                                )}
                                              </div>
                                              <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    className="sm:w-auto sm:ml-2 ml-0 bg-green-700 hover:bg-green-800 text-white cursor-pointer"
                                    type="button"
                                    disabled={isClientDisabled}
                                    onClick={() => setIsDialogOpenClient(true)}
                                  >
                                    <Save className="w-6 h-6" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Registrar un nuevo cliente durante la venta</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="sm:w-auto text-muted-foreground"
                                    onClick={handleOpenSunatDialog}
                                    disabled={!canUseSunatLookup || isSubmitting}
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {canUseSunatLookup
                                    ? "Buscar clientes en SUNAT"
                                    : "Disponible solo cuando el comprobante es Boleta o Factura"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <AddClientDialog
                            isOpen={isDialogOpenClient}
                            onClose={() => setIsDialogOpenClient(false)}
                            setClients={setClients}
                            setValue={form.setValue} // Pasar la función para actualizar el formulario principal
                            updateTipoComprobante={(tipoComprobante: string) => {
                              handleTipoComprobanteChange(tipoComprobante);
                            }}
                            />   
                            <Dialog
                              open={isSunatDialogOpen}
                              onOpenChange={(open) => {
                                setIsSunatDialogOpen(open)
                                if (!open) {
                                  resetSunatDialog()
                                }
                              }}
                            >
                              <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Buscar clientes en SUNAT</DialogTitle>
                                  <DialogDescription>
                                    Ingresa un DNI (8 dígitos) o RUC (11 dígitos) para obtener los datos oficiales y doble clic en el resultado para aplicarlos.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex gap-2">
                                    <Input
                                      value={sunatSearchValue}
                                      onChange={(event) => setSunatSearchValue(event.target.value)}
                                      placeholder="DNI o RUC"
                                      autoFocus
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault()
                                          void handleSunatSearch()
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleSunatSearch}
                                      disabled={sunatSearchLoading}
                                    >
                                      {sunatSearchLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Search className="h-4 w-4 mr-2" />
                                          Buscar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  {sunatSearchError ? (
                                    <p className="text-sm text-destructive">{sunatSearchError}</p>
                                  ) : null}
                                  <div className="border rounded-md max-h-64 overflow-y-auto">
                                    {sunatSearchResults.length === 0 ? (
                                      <p className="p-4 text-sm text-muted-foreground">
                                        Ingresa un documento y presiona Buscar para ver resultados.
                                      </p>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Documento</TableHead>
                                            <TableHead>Nombre o Razón Social</TableHead>
                                            <TableHead>Dirección</TableHead>
                                            <TableHead>Estado</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {sunatSearchResults.map((result) => (
                                            <TableRow
                                              key={result.identifier}
                                              className="cursor-pointer hover:bg-muted/60"
                                              onDoubleClick={() => handleSelectSunatResult(result)}
                                            >
                                              <TableCell className="whitespace-nowrap font-medium">
                                                {result.identifier}
                                              </TableCell>
                                              <TableCell>{result.name}</TableCell>
                                              <TableCell>{result.address ?? "—"}</TableCell>
                                              <TableCell>{result.status ?? "—"}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <Label className="text-sm font-medium py-2">Nombre del Cliente</Label>
                          <Input {...register("client_name")} readOnly></Input>     
                          <div className="flex justify-between gap-1">
                            <div className="flex flex-col flex-grow">
                              <Label className="text-sm font-medium py-2">Tipo de Documento</Label>
                              <Input {...register("client_type")} readOnly />
                            </div>
                            <div className="flex flex-col flex-grow">
                              <Label className="text-sm font-medium py-2">N° de Documento</Label>
                              <Input {...register("client_typeNumber")} readOnly />
                            </div>
                          </div>
                        </div>
                                 
                        <div className="flex-1 flex flex-col border border-gray-600 rounded-md p-2">
                        <Label htmlFor="store-combobox" className="text-sm font-medium mb-2">
                          <div className="flex items-center">
                            <span>Ingrese una Tienda:</span>
                            {renderStatusChip(Boolean(form.getValues("store_name")))}
                          </div>
                        </Label>   
                        <div className="flex justify-between gap-1">
                          <Popover open={openStore} onOpenChange={setOpenStore}>
                              <PopoverTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openStore}
                                      className="w-[260px] justify-between cursor-pointer"
                                    >
                                      {displayedStoreName || "Seleccione una Tienda..."}
                                      <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Selecciona la tienda para la venta</TooltipContent>
                                </Tooltip>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar tienda..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron tiendas.</CommandEmpty>
                                    <CommandGroup>
                                      {stores.map((store) => {
                                        const normalizedStoreName = normalizeOptionValue(store.name);
                                        const isSelected = normalizedStoreName === normalizedSelectedStoreValue;
                                        const commandValue = getCommandValue(store.name);

                                        return (
                                          <CommandItem
                                              key={store.id ?? store.name}
                                                value={commandValue}
                                                className="cursor-pointer transition-colors hover:bg-accent/60 rounded-sm px-1"
                                            onSelect={() => {
                                              if (isSelected) {
                                                setOpenStore(false);
                                                return;
                                              }

                                              if (selectedProducts.length > 0) {
                                                setPendingStore(store.name || "");
                                                setIsStoreChangeDialogOpen(true);
                                                return;
                                              }

                                              handleStoreChange(store.name || "");
                                            }}
                                          >
                                            {store.name}
                                            <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>         
                            <StoreChangeDialog
                              isOpen={isStoreChangeDialogOpen}
                              onClose={() => setIsStoreChangeDialogOpen(false)}
                              onConfirm={() => {
                                if (pendingStore) {
                                  handleStoreChange(pendingStore); // Cambia la tienda
                                }
                                setPendingStore(null); // Limpia la tienda pendiente
                              }}
                            />             
                          </div>
                          <Label className="text-sm font-medium py-2">Tienda</Label>
                          <Input {...register("store_name")} readOnly></Input>
                          <Label className="text-sm font-medium py-2">Direccion de la tienda</Label>
                          <Input {...register("store_adress")} readOnly></Input>        
                        </div>
                        <div className='flex-1 flex-col border border-gray-600 rounded-md p-2'> 
                          <Label htmlFor="product-combobox" className="text-sm font-medium mb-2">
                            <div className="flex items-center">
                              <span>Ingrese un producto:</span>
                              {renderStatusChip(selectedProducts.length > 0)}
                            </div>
                          </Label>
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between cursor-pointer"
                                      >
                                        <span className="truncate max-w-[80%] block">
                                          {displayedProductName || "Selecciona un producto..."}
                                        </span>
                                        <ChevronsUpDown className="opacity-50" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Selecciona un producto para agregarlo a la venta</TooltipContent>
                                  </Tooltip>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  {selectedStoreId && (
                                    <div className="flex items-center justify-between border-b px-2 py-1 text-[11px] text-muted-foreground">
                                      <span>
                                        {showOutOfStock ? "Mostrando sin stock" : "Ocultando sin stock"}
                                      </span>
                                      <button
                                        type="button"
                                        className="rounded px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                                        onClick={() => setShowOutOfStock((prev) => !prev)}
                                      >
                                        {showOutOfStock ? "Ocultar sin stock" : "Ver sin stock"}
                                      </button>
                                    </div>
                                  )}
                                  <CommandInput 
                                  placeholder="Buscar producto..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                    {suggestedOutOfStockProduct && (
                                      <CommandGroup heading="Sugerido (sin stock)">
                                        <CommandItem
                                          key={`suggested-${suggestedOutOfStockProduct.id}`}
                                          value={getCommandValue(suggestedOutOfStockProduct.name)}
                                          className="cursor-not-allowed rounded-sm px-1 opacity-60"
                                          onSelect={() => {
                                            toast("Producto sin stock", {
                                              description: "Selecciona otro producto o registra inventario.",
                                            });
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>{suggestedOutOfStockProduct.name}</span>
                                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                                              Ultimo usado sin stock
                                            </span>
                                          </div>
                                          <Check className="ml-auto opacity-0" />
                                        </CommandItem>
                                      </CommandGroup>
                                    )}
                                    <CommandGroup>
                                      {orderedProducts.map((product) => {
                                        const normalizedProductName = normalizeOptionValue(product.name);
                                        const isSelected = normalizedProductName === normalizedSelectedProductValue;
                                        const commandValue = getCommandValue(product.name);
                                        const isOutOfStock = Boolean(selectedStoreId) && (product.stock ?? 0) <= 0;
                                        const isSuggestedOutOfStock = isOutOfStock && lastRecentProductId === product.id;

                                        return (
                                          <CommandItem
                                            key={product.id ?? product.name}
                                            value={commandValue}
                                            className={cn(
                                              "rounded-sm px-1 transition-colors",
                                              isOutOfStock ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/60",
                                            )}
                                            onSelect={async () => {
                                              if (isOutOfStock) {
                                                toast("Producto sin stock", {
                                                  description: "Selecciona otro producto o registra inventario.",
                                                });
                                                return;
                                              }
                                              if (isSelected) {
                                                setOpen(false);
                                                return;
                                              }

                                              await selectProductForSale(product);
                                            }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span>{product.name}</span>
                                              {recentProductSet.has(product.id) && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                  Reciente
                                                </span>
                                              )}
                                              {isSuggestedOutOfStock && (
                                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                                                  Ultimo usado sin stock
                                                </span>
                                              )}
                                              {!isSuggestedOutOfStock && isOutOfStock && (
                                                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                                                  Sin stock
                                                </span>
                                              )}
                                            </div>
                                            <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 cursor-pointer border-emerald-700 bg-emerald-700 text-white transition-transform duration-150 hover:scale-[1.02] hover:border-emerald-800 hover:bg-emerald-800 dark:border-emerald-300 dark:bg-emerald-300 dark:text-emerald-950 dark:hover:border-emerald-200 dark:hover:bg-emerald-200"
                                    onClick={addProduct}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Agregar producto</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {/* Botón para abrir el modal */}
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 cursor-pointer border-sky-700 bg-sky-700 text-white transition-transform duration-150 hover:scale-[1.02] hover:border-sky-800 hover:bg-sky-800 dark:border-sky-300 dark:bg-sky-300 dark:text-sky-950 dark:hover:border-sky-200 dark:hover:bg-sky-200"
                                    type="button" // Asegúrate de que el botón no envíe el formulario
                                    onClick={async () => {
                                      if (!currentProduct || !selectedStoreId) {
                                        toast.error("Debe seleccionar un producto y una tienda primero.");
                                        return;
                                      }
                                  
                                      try {
                                        const series = await fetchSeriesByProductAndStore(selectedStoreId, currentProduct.id);
                                        const existingProduct = selectedProducts.find((product) => product.id === currentProduct.id);
                                  
                                        // Filtrar las series ya utilizadas
                                        const remainingSeries = existingProduct
                                          ? series.filter((serie: string) => !existingProduct.series?.includes(serie))
                                          : series;
                                  
                                        setAvailableSeries(remainingSeries); // Establece las series disponibles
                                        setIsDialogOpenSeries(true); // Abre el modal
                                      } catch (error) {
                                        console.error("Error al cargar las series:", error);
                                      }
                                    }}
                                  >
                                    <Barcode className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Series</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AddSeriesDialog
                            isOpen={isDialogOpenSeries}
                            onClose={() => setIsDialogOpenSeries(false)}
                            availableSeries={availableSeries}
                            selectedSeries={selectedSeries}
                            setSelectedSeries={setSelectedSeries}
                            quantity={quantity}
                            />                                        
                                                  
                          </div>                                      
                          <Label className="text-sm font-medium py-2">Categoria</Label>
                          <Input {...register("category_name")} readOnly ></Input>
                          <Label className="text-sm font-medium py-2">Precio de Venta</Label>
                          <Input {...register("price", { valueAsNumber: true })} readOnly
                          step="0.01" // Permite valores con decimales
                          min={0} // Asegura que no se ingresen valores negativos
                          >                        
                          </Input>
                          <Label className="text-sm font-medium py-2">Descripcion</Label>
                          <Input {...register("description")} readOnly></Input>
                          <div className="flex justify-start gap-1">
                            <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Cantidad</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text" // Usamos "text" para tener control total sobre la validaci?n
                                placeholder="Cantidad"
                                className="h-9 flex-1 text-sm"
                                value={quantity.toString()} // Convertimos el valor a string para mostrarlo correctamente
                                maxLength={10} // Limitar a 10 caracteres
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Permitir solo n?meros y un ?nico punto decimal
                                  if (/^\d*\.?\d*$/.test(value) && value.length <= 10) {
                                    setQuantity(Number(value)); // Actualizamos el estado con el valor ingresado
                                  }
                                }}
                                onBlur={() => {
                                  // Validar y convertir el valor a n?mero al salir del campo
                                  const numericValue = parseFloat(String(quantity));
                                  if (!isNaN(numericValue) && numericValue > 0) {
                                    setQuantity(numericValue); // Asegurarnos de que el valor sea un n?mero v?lido
                                  } else {
                                    setQuantity(1); // Restablecer a 1 si el valor no es v?lido
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 cursor-pointer border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700 dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950 dark:hover:border-rose-300 dark:hover:bg-rose-300"
                                      aria-label="Disminuir cantidad"
                                      onClick={() => {
                                        setQuantity((prev) => {
                                          const current = Number(prev) || 0;
                                          return Math.max(1, current - 1);
                                        });
                                      }}
                                    >
                                      -
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Disminuir cantidad
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 cursor-pointer border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:border-emerald-300 dark:hover:bg-emerald-300"
                                      aria-label="Aumentar cantidad"
                                      onClick={() => {
                                        setQuantity((prev) => {
                                          const current = Number(prev) || 0;
                                          return Math.max(1, current + 1);
                                        });
                                      }}
                                    >
                                      +
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Aumentar cantidad
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            </div>
                            <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Stock</Label>
                            <Input
                              type="text" // Usamos "text" para tener control total sobre la validación
                              placeholder="Stock"
                              value={stock !== undefined ? stock.toString() : "0"} // Convertimos el valor a string para mostrarlo correctamente
                              readOnly // Hace que el campo sea de solo lectura
                            />   
                            </div>
                          </div>                     
                        </div>
                  </div>

                    {/* Datatable para mostrar los productos seleccionados */}
                    <div
                      ref={productTableContainerRef}
                      className="border px-1 sm:px-2 overflow-x-auto max-w-full max-h-[280px] overflow-y-auto sm:max-h-none sm:overflow-y-visible"
                    >
                      <Table className="w-full min-w-[280px] sm:min-w-[620px] text-xs sm:text-sm table-auto">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="relative text-left truncate py-1.5 sm:py-2" style={nameColumnWidthStyle}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">Nombre</span>
                                <span
                                  role="separator"
                                  aria-orientation="horizontal"
                                  aria-label="Ajustar ancho de la columna Nombre"
                                  className="ml-1 inline-flex h-4 w-1 cursor-col-resize select-none rounded bg-muted-foreground/50 transition-colors hover:bg-muted-foreground"
                                  onMouseDown={startNameColumnResize}
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-left hidden sm:table-cell w-[140px] truncate py-1.5 sm:py-2">Categoria</TableHead>
                            <TableHead className="text-left w-[56px] truncate py-1.5 sm:py-2">Cant.</TableHead>
                            <TableHead className="text-left w-[64px] truncate py-1.5 sm:py-2">Prec.</TableHead>
                            <TableHead className="text-left w-[76px] truncate py-1.5 sm:py-2">Total</TableHead>
                            <TableHead className="text-left hidden md:table-cell w-[120px] truncate py-1.5 sm:py-2">Series</TableHead>
                            <TableHead className="text-left w-[52px] truncate py-1.5 sm:py-2">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProducts.map((product, index) => {
                            const rowTotal = Number(product.price ?? 0) * Number(product.quantity ?? 0);

                            return (
                              <TableRow
                                key={product.id}
                                className="cursor-pointer sm:cursor-default"
                                onClick={() => {
                                  if (window.innerWidth < 640) {
                                    setActiveProductIndex(index);
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                                    setActiveProductIndex(index);
                                  }
                                }}
                              >
                                <TableCell
                                  className="font-semibold truncate whitespace-nowrap overflow-hidden text-[11px] sm:text-xs"
                                  style={nameColumnWidthStyle}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate">{product.name}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{product.name}</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell truncate text-xs">
                                  {product.category_name}
                                </TableCell>
                                <TableCell className="w-[52px] sm:w-[80px] py-1.5 align-top">
                                  <div className="hidden sm:block">
                                    <Input
                                      type="number"
                                      value={product.quantity}
                                      min={1}
                                      onChange={(e) => {
                                        const updatedQuantity = parseInt(e.target.value, 10);
                                        if (updatedQuantity > 0) {
                                          setSelectedProducts((prev) =>
                                            prev.map((p, i) =>
                                              i === index ? { ...p, quantity: updatedQuantity } : p
                                            )
                                          );
                                        }
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="h-8 sm:h-9 w-full text-xs sm:text-sm"
                                    />
                                  </div>
                                  <div className="sm:hidden text-[11px] font-medium leading-tight">
                                    {product.quantity}
                                    <p className="text-[10px] text-muted-foreground">Toca para editar</p>
                                  </div>
                                </TableCell>
                                <TableCell className="w-[60px] sm:w-[90px] py-1.5 align-top">
                                  <div className="hidden sm:block">
                                    <Input
                                      type="number"
                                      value={product.price}
                                      min={0}
                                      step="0.01"
                                      onChange={(e) => {
                                        const updatedPrice = parseFloat(e.target.value);
                                        if (updatedPrice >= 0) {
                                          setSelectedProducts((prev) =>
                                            prev.map((p, i) =>
                                              i === index ? { ...p, price: updatedPrice } : p
                                            )
                                          );
                                        }
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="h-8 sm:h-9 w-full text-xs sm:text-sm"
                                    />
                                  </div>
                                  <div className="sm:hidden text-[11px] font-medium leading-tight">
                                    S/. {Number(product.price ?? 0).toFixed(2)}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[72px] sm:w-[100px] truncate text-[11px] sm:text-xs">
                                  S/ {rowTotal.toFixed(2)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs">
                                  <div
                                    className="cursor-pointer text-blue-500 underline"
                                    onClick={() => {
                                      if (product.series && product.series.length > 0) {
                                        setCurrentSeries(product.series); // Establece las series del producto actual
                                        setIsSeriesModalOpen(true); // Abre el modal
                                      } else {
                                        toast.error("Este producto no tiene series asociadas.");
                                      }
                                    }}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                  >
                                    {product.series && product.series.length > 0
                                      ? `${product.series.length} series`
                                      : "Sin series"}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[44px] sm:w-[60px] py-1.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="h-8 sm:h-9 px-1 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeProduct(product.id);
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                      >
                                        <X className="w-4 h-4" color="red" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Eliminar este producto de la venta</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <SeriesModal
                      isOpen={isSeriesModalOpen}
                      onClose={() => setIsSeriesModalOpen(false)}
                      series={currentSeries}
                    />

                    {selectedProducts.length > 0 && totalAmountInWords && (
                      <div className="mt-4 w-full rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                          Monto Total: {totalAmountInWords}
                        </p>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          Total: {normalizedCurrency === 'USD' ? '$' : 'S/.'}{' '}
                          {totalAmount.toFixed(2)}
                        </p>
                      </div>
                    )}   

                    <ProductDetailModal
                      product={
                        activeProductIndex !== null
                          ? selectedProducts[activeProductIndex] ?? null
                          : null
                      }
                      onClose={() => setActiveProductIndex(null)}
                      onUpdate={({ quantity, price }) => {
                        if (activeProductIndex === null) return
                        setSelectedProducts((prev) =>
                          prev.map((product, productIndex) =>
                            productIndex === activeProductIndex
                              ? { ...product, quantity, price }
                              : product
                          )
                        )
                      }}
                      onRemove={() => {
                        if (activeProductIndex === null) return
                        removeProduct(selectedProducts[activeProductIndex].id)
                        setActiveProductIndex(null)
                      }}
                      onManageSeries={() => {
                        if (activeProductIndex === null) return
                        const product = selectedProducts[activeProductIndex]
                        if (product.series && product.series.length > 0) {
                          setCurrentSeries(product.series)
                          setIsSeriesModalOpen(true)
                          setActiveProductIndex(null)
                        } else {
                          toast.error("Este producto no tiene series asociadas.")
                        }
                      }}
                    />                   

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            Registrar Venta
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Abre la confirmaci?n para registrar la venta
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button className="cursor-pointer bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          type="button" // Evita que el bot?n env?e el formulario
                          onClick={() => {
                        form.reset({
                            name: "",
                            description: "",
                            price: 1,
                            quantity:1 ,
                            category_name: "",
                            client_name: "",
                            client_type: "", 
                            client_typeNumber: "", 
                            store_name: "",
                            store_adress: "",      
                            ruc: "",
                            fecha_emision_comprobante: "",
                            tipoComprobante: "",
                            serie: "",
                            total_comprobante: "",
                        })
                        // Limpia los estados relacionados con productos y proveedores
                        setSelectedProducts([]); // Limpia la lista de productos seleccionados en el datatable
                        setCurrentProduct(null); // Limpia el producto actual
                        setQuantity(1); // Restablece la cantidad a 1
                        setStock(0); // Restablece el stock

                        // Limpia los combobox
                        setValueProduct(""); // Limpia el valor del combobox de productos
                        setValueClient(""); // Limpia el valor del combobox de clientes
                        setValueStore(""); // Limpia el valor del combobox de tiendas
                        setValueInvoice(""); // Limpia el valor del combobox de tipo de comprobantes

                        // Restablece el calendario al d?a de hoy
                        const today = new Date();
                        setSelectedDate(today); // Actualiza el estado del calendario
                        form.setValue("fecha_emision_comprobante", today.toISOString().split("T")[0]); // Actualiza el valor del formulario

                        // Restablece la moneda a "SOLES (PEN)"
                        setCurrency("PEN"); // Actualiza el estado de la moneda
                        form.setValue("tipo_moneda", "PEN"); // Actualiza el valor del formulario

                        // Cierra los popovers de los combobox
                        setOpen(false); // Cierra el combobox de productos
                        setOpenClient(false); // Cierra el combobox de clientes
                        setOpenStore(false); // Cierra el combobox de tiendas
                        setOpenInvoice(false); // Cierra el combobox de tipo de comprobantes
                    }}  // Restablece los campos del formulario
                          >
                            Limpiar 
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Restablece todos los campos del formulario a sus valores iniciales
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                          className="cursor-pointer bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                          type="button" // Evita que el bot?n env?e el formulario
                          onClick={() => router.back()} // Regresa a la p?gina anterior
                          >
                            Volver
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Regresa a la vista anterior sin guardar
                        </TooltipContent>
                      </Tooltip>
                    </div>
                      {/* Di?logo de confirmaci?n */}
                      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Registro</AlertDialogTitle>
                            <AlertDialogDescription>?Est?s seguro de que deseas registrar esta venta?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogCancel onClick={() => setIsDialogOpen(false)} className="cursor-pointer">
                                  Cancelar
                                </AlertDialogCancel>
                              </TooltipTrigger>
                              <TooltipContent>
                                Cancelar el registro de la venta
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogAction className="cursor-pointer"
                                  onClick={() => {
                                    setIsDialogOpen(false); // Cerrar el di?logo
                                    onSubmit(); // Llamar a la funci?n de env?o
                                  }}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </TooltipTrigger>
                              <TooltipContent>
                                Confirmar y registrar la venta
                              </TooltipContent>
                            </Tooltip>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* AlertDialog Previo Venta */}
                      <AlertDialog open={isPriceAlertOpen} onOpenChange={setIsPriceAlertOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Precio de Venta Requerido</AlertDialogTitle>
                            <AlertDialogDescription>
                              El producto <strong>{productWithZeroPrice?.name}</strong> tiene un precio de venta de <strong>0</strong>. Por favor, ingrese un precio v?lido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex flex-col gap-2 mt-4">
                            <Label className="text-sm font-medium">Nuevo Precio de Venta</Label>
                            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1">
                              <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="Ingrese un precio"
                                className="h-8 flex-1 border-0 bg-transparent px-0 text-sm [appearance:textfield] focus-visible:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={priceAlertValue}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setPriceAlertValue(raw);
                                  const newPrice = parseFloat(raw);
                                  if (!Number.isNaN(newPrice) && newPrice > 0) {
                                    setProducts((prev) =>
                                      prev.map((product) =>
                                        product.id === productWithZeroPrice?.id
                                          ? { ...product, price: newPrice }
                                          : product
                                      )
                                    );

                                    setCurrentProduct((prev) =>
                                      prev && prev.id === productWithZeroPrice?.id
                                        ? { ...prev, price: newPrice }
                                        : prev
                                    );

                                    setValue("price", newPrice);
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-rose-500/60 text-rose-700 hover:border-rose-500/80 hover:text-rose-800 dark:border-rose-400/40 dark:text-rose-200 dark:hover:border-rose-300/70 dark:hover:text-rose-100"
                                  aria-label="Disminuir precio de venta"
                                  onClick={() => {
                                    const current = Number(priceAlertValue);
                                    const safeCurrent = Number.isFinite(current) ? current : 0;
                                    const next = Math.max(0, safeCurrent - 1);
                                    setPriceAlertValue(String(next));
                                    setProducts((prev) =>
                                      prev.map((product) =>
                                        product.id === productWithZeroPrice?.id
                                          ? { ...product, price: next }
                                          : product
                                      )
                                    );
                                    setCurrentProduct((prev) =>
                                      prev && prev.id === productWithZeroPrice?.id
                                        ? { ...prev, price: next }
                                        : prev
                                    );
                                    setValue("price", next);
                                  }}
                                >
                                  -
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-emerald-500/60 text-emerald-700 hover:border-emerald-500/80 hover:text-emerald-800 dark:border-emerald-400/40 dark:text-emerald-200 dark:hover:border-emerald-300/70 dark:hover:text-emerald-100"
                                  aria-label="Aumentar precio de venta"
                                  onClick={() => {
                                    const current = Number(priceAlertValue);
                                    const safeCurrent = Number.isFinite(current) ? current : 0;
                                    const next = safeCurrent + 1;
                                    setPriceAlertValue(String(next));
                                    setProducts((prev) =>
                                      prev.map((product) =>
                                        product.id === productWithZeroPrice?.id
                                          ? { ...product, price: next }
                                          : product
                                      )
                                    );
                                    setCurrentProduct((prev) =>
                                      prev && prev.id === productWithZeroPrice?.id
                                        ? { ...prev, price: next }
                                        : prev
                                    );
                                    setValue("price", next);
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogCancel
                                  onClick={() => setIsPriceAlertOpen(false)}
                                  disabled={isUpdatingPrice}
                                  className="cursor-pointer"
                                >
                                  Cancelar
                                </AlertDialogCancel>
                              </TooltipTrigger>
                              <TooltipContent>
                                Cancelar sin actualizar el precio
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogAction
                                  className="cursor-pointer"
                                  disabled={isUpdatingPrice}
                                  onClick={async () => {
                                    if (productWithZeroPrice) {
                                      const updatedProduct = products.find(
                                        (product) => product.id === productWithZeroPrice.id
                                      );
                                      if (!updatedProduct || updatedProduct.price <= 0) {
                                        toast.error("Debe ingresar un precio v?lido antes de continuar.");
                                        return;
                                      }
                                      setIsUpdatingPrice(true);
                                      try {
                                        await updateProductPriceSell(updatedProduct.id, updatedProduct.price);
                                        setCurrentProduct({
                                          ...updatedProduct,
                                          series: [],
                                        });
                                        setValueProduct(updatedProduct.name);
                                      } catch (error) {
                                        toast.error("No se pudo actualizar el precio de venta. Int?ntalo nuevamente.");
                                        return;
                                      } finally {
                                        setIsUpdatingPrice(false);
                                      }
                                    }
                                    setIsPriceAlertOpen(false);
                                  }}
                                >
                                  {isUpdatingPrice ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Guardando...
                                    </span>
                                  ) : (
                                    "Confirmar"
                                  )}
                                </AlertDialogAction>
                              </TooltipTrigger>
                              <TooltipContent>
                                Confirmar el nuevo precio y continuar
                              </TooltipContent>
                            </Tooltip>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    
          </fieldset>
        </TooltipProvider>
      </form>
    </div>
  )
}

export default SalesForm
