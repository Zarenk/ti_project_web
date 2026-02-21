'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVerticalConfig } from '@/hooks/use-vertical-config';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { cn } from '@/lib/utils';
import { PageGuideButton } from "@/components/page-guide-dialog"
import { QUOTES_GUIDE_STEPS } from "./quotes-guide-steps"
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  ChevronDown,
  ChevronUp,
  Check,
  Cpu,
  FileText,
  HardDrive,
  Info,
  LayoutGrid,
  MemoryStick,
  Monitor,
  Printer,
  Signal,
  Sparkles,
  Tag,
  User,
  Weight,
  Zap,
  Battery,
  MoreHorizontal,
  Eye,
  Send,
  Mail,
  History,
  Save,
  X,
  Plus,
  Minus,
  Landmark,
  Trash2,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import {
  getQuoteCatalog,
  getQuoteClients,
  getQuoteMeta,
  getQuoteById,
  createQuoteDraft,
  updateQuoteDraft,
  issueQuote,
  sendQuoteWhatsApp,
  type QuoteCatalog,
  type QuoteCategoryKey,
  type QuoteClient,
  type QuoteOption,
  type QuoteDraftPayload,
  type QuoteDetail,
  type QuoteItemPayload,
  getBankAccounts,
  saveBankAccounts,
  type BankAccount,
} from './quotes.api';
import { getStores } from '@/app/dashboard/stores/stores.api';
import { createClient } from '@/app/dashboard/clients/clients.api';
import { QuotePdfDocument } from './QuotePdfDocument';
import { QuoteActionButtons } from './components/quote-action-buttons';
import { QuoteConfigurationPanel } from './components/quote-configuration-panel';
import { QuoteContextBar } from './components/quote-context-bar';
import { QuoteSummaryPanel } from './components/quote-summary-panel';
import { QuoteProductCatalog } from './components/quote-product-catalog';
import type {
  StoreOption,
  SelectionMap,
  QuoteDraft,
} from './types/quote-types';
import {
  isServiceOrWarranty,
  isQuantityEditable,
  getStockLimit,
  normalizeFilterText,
  TAB_LABELS,
} from './types/quote-types';

export default function QuotesPage() {
  const router = useRouter();
  const { info: verticalInfo } = useVerticalConfig();
  const { selection: tenantSelection } = useTenantSelection();
  const [catalog, setCatalog] = useState<QuoteCatalog | null>(null);
  const [tab, setTab] = useState<QuoteCategoryKey>('pc');
  const [meta, setMeta] = useState<Awaited<
    ReturnType<typeof getQuoteMeta>
  > | null>(null);
  const [selection, setSelection] = useState<SelectionMap>({});
  const [clientName, setClientName] = useState('');
  const [contactName, setContactName] = useState('');
  const [clientDocType, setClientDocType] = useState('');
  const [clientDocNumber, setClientDocNumber] = useState('');
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [clients, setClients] = useState<QuoteClient[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    {},
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [validity, setValidity] = useState('15 días');
  const [currency, setCurrency] = useState('PEN');
  const [conditions, setConditions] = useState('');
  const [pcCategoryFilter, setPcCategoryFilter] = useState('all');
  const [pcProductFilter, setPcProductFilter] = useState('');
  const [hardwareCategoryFilter, setHardwareCategoryFilter] = useState('all');
  const [hardwareProductFilter, setHardwareProductFilter] = useState('');
  const deferredPcFilter = useDeferredValue(pcProductFilter);
  const deferredHwFilter = useDeferredValue(hardwareProductFilter);
  const [taxRate, setTaxRate] = useState(0.18);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [limitByStock, setLimitByStock] = useState(true);
  const [showImagesInPdf, setShowImagesInPdf] = useState(false);
  const [hideSpecsInPdf, setHideSpecsInPdf] = useState(true);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isIssuingQuote, setIsIssuingQuote] = useState(false);
  const [serverQuoteId, setServerQuoteId] = useState<number | null>(null);
  const [serverQuoteStatus, setServerQuoteStatus] = useState<
    QuoteDetail['status'] | null
  >(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isSavingBankAccounts, setIsSavingBankAccounts] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDocType, setNewClientDocType] = useState('DNI');
  const [newClientDocNumber, setNewClientDocNumber] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const defaultsAppliedRef = useRef<Record<string, boolean>>({});
  const loadedQuoteIdRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quoteIdParam = searchParams.get('quoteId');
  const isReadOnlyQuote =
    !!quoteIdParam &&
    (serverQuoteStatus === 'ISSUED' || serverQuoteStatus === 'CANCELLED');
  const [quoteNumber, setQuoteNumber] = useState(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `COT-${datePart}-${randomPart}`;
  });

  const draftKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-draft:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const stockPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-limit-by-stock:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const advancedConfigPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-advanced-config:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const pdfImagesPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-pdf-images:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const validityPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-validity:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const currencyPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-currency:v1:${companyKey}`;
  }, [tenantSelection.companyId]);
  const conditionsPreferenceKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? 'all';
    return `quotes-pref-conditions:v1:${companyKey}`;
  }, [tenantSelection.companyId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(stockPreferenceKey);
    if (raw === '1') setLimitByStock(true);
    if (raw === '0') setLimitByStock(false);
  }, [stockPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(advancedConfigPreferenceKey);
    if (raw === '1') setShowAdvancedConfig(true);
    if (raw === '0') setShowAdvancedConfig(false);
  }, [advancedConfigPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(pdfImagesPreferenceKey);
    if (raw === '1') setShowImagesInPdf(true);
    if (raw === '0') setShowImagesInPdf(false);
  }, [pdfImagesPreferenceKey]);

  useEffect(() => {
    let active = true;
    async function load() {
      const [catalogData, metaData, clientData, storeData] = await Promise.all([
        getQuoteCatalog(storeId),
        getQuoteMeta(tenantSelection.companyId),
        getQuoteClients(),
        getStores(),
      ]);
      if (!active) return;
      setCatalog(catalogData);
      setMeta(metaData);
      setClients(clientData);
      const storeOptions = Array.isArray(storeData)
        ? storeData.map((s: any) => ({
            id: Number(s.id),
            name: String(s.name ?? 'Tienda'),
          }))
        : [];
      setStores(storeOptions);
      setConditions(metaData.defaultConditions);
      setTaxRate(metaData.taxRate ?? 0.18);
      if (metaData.validityOptions[0]) {
        setValidity(metaData.validityOptions[0]);
      }
      if (metaData.currencyOptions[0]) {
        setCurrency(metaData.currencyOptions[0]);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [tenantSelection.companyId, storeId]);

  // Load saved preferences for validity, currency, and conditions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedValidity = window.localStorage.getItem(validityPreferenceKey);
    if (savedValidity) setValidity(savedValidity);
  }, [validityPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCurrency = window.localStorage.getItem(currencyPreferenceKey);
    if (savedCurrency) setCurrency(savedCurrency);
  }, [currencyPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedConditions = window.localStorage.getItem(
      conditionsPreferenceKey,
    );
    if (savedConditions) setConditions(savedConditions);
  }, [conditionsPreferenceKey]);

  // Periodic catalog refresh for real-time price sync (every 30 seconds)
  useEffect(() => {
    if (!catalog) return;
    const intervalId = setInterval(async () => {
      try {
        const catalogData = await getQuoteCatalog(storeId);
        setCatalog(catalogData);
        // Note: priceOverrides state is preserved - custom prices won't be overwritten
      } catch (error) {
        console.error('Failed to refresh catalog:', error);
      }
    }, 30000); // 30 seconds
    return () => clearInterval(intervalId);
  }, [catalog, storeId]);

  // Load bank accounts (backend + localStorage cache)
  useEffect(() => {
    const companyId = tenantSelection.companyId;
    if (!companyId) return;
    const cacheKey = `quotes-bank-accounts:v1:${companyId}`;
    // Load from cache first
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setBankAccounts(parsed);
      }
    } catch {}
    // Then fetch from backend
    getBankAccounts(companyId)
      .then((accounts) => {
        setBankAccounts(accounts);
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(accounts));
        } catch {}
      })
      .catch(() => {});
  }, [tenantSelection.companyId]);

  const handleSaveBankAccounts = async (accounts: BankAccount[]) => {
    const companyId = tenantSelection.companyId;
    if (!companyId) return;
    setIsSavingBankAccounts(true);
    try {
      const saved = await saveBankAccounts(companyId, accounts);
      setBankAccounts(saved);
      const cacheKey = `quotes-bank-accounts:v1:${companyId}`;
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(saved));
      } catch {}
      toast.success('Cuentas bancarias guardadas.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudieron guardar.');
    } finally {
      setIsSavingBankAccounts(false);
    }
  };

  useEffect(() => {
    if (!catalog) return;
    const sections = catalog[tab] ?? [];
    const servicesSection = sections.find(
      (section) => section.id === 'services',
    );
    const warrantiesSection = sections.find(
      (section) => section.id === 'warranties',
    );
    const freeService = servicesSection?.options.find(
      (option) => option.id === 'service-assembly-free',
    );
    const freeWarranty = warrantiesSection?.options.find(
      (option) => option.id === 'warranty-12-free',
    );

    if (!freeService && !freeWarranty) return;

    setSelection((prev) => {
      const next = { ...prev };
      const servicesKey = servicesSection?.id ?? 'services';
      const warrantiesKey = warrantiesSection?.id ?? 'warranties';
      const servicesAppliedKey = `${tab}:${servicesKey}`;
      const warrantiesAppliedKey = `${tab}:${warrantiesKey}`;
      const currentServices = next[servicesKey] ?? [];
      const currentWarranties = next[warrantiesKey] ?? [];
      if (
        freeService &&
        currentServices.length === 0 &&
        !defaultsAppliedRef.current[servicesAppliedKey]
      ) {
        next[servicesKey] = [freeService];
        defaultsAppliedRef.current[servicesAppliedKey] = true;
      }
      if (
        freeWarranty &&
        currentWarranties.length === 0 &&
        !defaultsAppliedRef.current[warrantiesAppliedKey]
      ) {
        next[warrantiesKey] = [freeWarranty];
        defaultsAppliedRef.current[warrantiesAppliedKey] = true;
      }
      return next;
    });
  }, [catalog, tab]);

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.values(selection).forEach((items) => {
        items.forEach((item) => {
          if (!isQuantityEditable(item)) return;
          const minValue = 1;
          const limit = getStockLimit(item, limitByStock);
          const current = next[item.id];
          if (!current || current < minValue) {
            next[item.id] = minValue;
            changed = true;
          } else if (limit !== null && current > limit) {
            next[item.id] = Math.max(minValue, limit);
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [selection, limitByStock]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as QuoteDraft;
      if (draft?.version !== 1) return;
      setTab(draft.tab);
      if (draft.quoteNumber) setQuoteNumber(draft.quoteNumber);
      if (typeof draft.serverQuoteId === 'number')
        setServerQuoteId(draft.serverQuoteId);
      if (draft.serverQuoteStatus)
        setServerQuoteStatus(draft.serverQuoteStatus);
      const normalizedSelection: SelectionMap = {};
      const rawSelection = draft.selection ?? {};
      Object.entries(rawSelection).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          normalizedSelection[key] = value.filter(Boolean);
        } else if (value) {
          normalizedSelection[key] = [value as QuoteOption];
        } else {
          normalizedSelection[key] = [];
        }
      });
      setSelection(normalizedSelection);
      setPriceOverrides(draft.priceOverrides ?? {});
      setQuantities(draft.quantities ?? {});
      setClientName(draft.clientName ?? '');
      setContactName(draft.contactName ?? '');
      setWhatsAppPhone(draft.whatsAppPhone ?? '');
      setClientDocType(draft.clientDocType ?? '');
      setClientDocNumber(draft.clientDocNumber ?? '');
      setValidity(draft.validity ?? '15 días');
      setCurrency(draft.currency ?? 'PEN');
      setConditions(draft.conditions ?? '');
      setStoreId(draft.storeId ?? null);
      setLimitByStock(
        typeof draft.limitByStock === 'boolean' ? draft.limitByStock : true,
      );
      setTaxRate(0.18);
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const payload: QuoteDraft = {
        version: 1,
        updatedAt: new Date().toISOString(),
        tab,
        quoteNumber,
        serverQuoteId,
        serverQuoteStatus,
        selection,
        priceOverrides,
        quantities,
        clientName,
        contactName,
        whatsAppPhone,
        clientDocType,
        clientDocNumber,
        validity,
        currency,
        conditions,
        limitByStock,
        storeId,
        taxRate,
      };
      window.localStorage.setItem(draftKey, JSON.stringify(payload));
    }, 400);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    tab,
    quoteNumber,
    serverQuoteId,
    serverQuoteStatus,
    selection,
    priceOverrides,
    quantities,
    clientName,
    contactName,
    whatsAppPhone,
    clientDocType,
    clientDocNumber,
    validity,
    currency,
    conditions,
    limitByStock,
    storeId,
    taxRate,
    draftKey,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(stockPreferenceKey, limitByStock ? '1' : '0');
  }, [limitByStock, stockPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      advancedConfigPreferenceKey,
      showAdvancedConfig ? '1' : '0',
    );
  }, [showAdvancedConfig, advancedConfigPreferenceKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      pdfImagesPreferenceKey,
      showImagesInPdf ? '1' : '0',
    );
  }, [showImagesInPdf, pdfImagesPreferenceKey]);

  // Save user preferences when they change (debounced to avoid blocking on each keystroke)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeoutId = setTimeout(() => {
      window.localStorage.setItem(validityPreferenceKey, validity);
      window.localStorage.setItem(currencyPreferenceKey, currency);
      window.localStorage.setItem(conditionsPreferenceKey, conditions);
    }, 500); // Wait 500ms after last change before saving
    return () => clearTimeout(timeoutId);
  }, [
    validity,
    validityPreferenceKey,
    currency,
    currencyPreferenceKey,
    conditions,
    conditionsPreferenceKey,
  ]);

  // OPTIMIZED: Combined calculation - single pass instead of multiple reduces
  const { grossTotal, marginAmount, revenueTotal } = useMemo(() => {
    let gross = 0;
    let margin = 0;
    let revenue = 0;

    Object.values(selection)
      .flat()
      .forEach((item) => {
        if (!item) return;

        const override = priceOverrides[item.id];
        const qty = Math.max(1, quantities[item.id] ?? 1);
        const sellPrice =
          typeof override === 'number' ? override : (item.price ?? 0);

        // Gross total (all items)
        gross += sellPrice * qty;

        // Margin and revenue (exclude services/warranties)
        if (!isServiceOrWarranty(item)) {
          const cost =
            typeof item.costPrice === 'number' ? item.costPrice : null;
          revenue += sellPrice * qty;
          if (cost !== null) {
            margin += (sellPrice - cost) * qty;
          }
        }
      });

    return { grossTotal: gross, marginAmount: margin, revenueTotal: revenue };
  }, [priceOverrides, quantities, selection]);

  const selectedItems = useMemo(
    () => Object.values(selection).flat(),
    [selection],
  );
  const summaryItems = useMemo(() => {
    return selectedItems
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const weightA = isServiceOrWarranty(a.item) ? 1 : 0;
        const weightB = isServiceOrWarranty(b.item) ? 1 : 0;
        if (weightA !== weightB) return weightA - weightB;
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }, [selectedItems]);
  const nonServiceItems = useMemo(
    () => selectedItems.filter((item) => isQuantityEditable(item)),
    [selectedItems],
  );
  const sectionChips = useMemo(() => {
    const sections = catalog?.[tab] ?? [];
    const labelMap = new Map(
      sections.map((section) => [section.id, section.title]),
    );
    return Object.entries(selection)
      .map(([key, items]) => ({
        id: key,
        label: labelMap.get(key) ?? key,
        count: items.length,
      }))
      .filter(
        (entry) =>
          entry.count > 0 &&
          entry.id !== 'services' &&
          entry.id !== 'warranties',
      );
  }, [catalog, selection, tab]);
  const pcCategoryOptions = useMemo(() => {
    const categorySet = new Set<string>();
    (catalog?.pc ?? []).forEach((section) => {
      section.options.forEach((option) => {
        if (option.categoryName?.trim()) {
          categorySet.add(option.categoryName.trim());
        }
      });
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es'));
  }, [catalog]);

  const hardwareCategoryOptions = useMemo(() => {
    const categorySet = new Set<string>();
    (catalog?.hardware ?? []).forEach((section) => {
      const skipSection =
        section.id === 'services' || section.id === 'warranties';
      if (skipSection) return;
      section.options.forEach((option) => {
        const optionCategory = normalizeFilterText(option.categoryName);
        if (optionCategory) {
          categorySet.add(option.categoryName!.trim());
          return;
        }
        if (section.title?.trim()) {
          categorySet.add(section.title.trim());
        }
      });
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es'));
  }, [catalog]);

  const taxAmount = useMemo(() => {
    if (!grossTotal) return 0;
    const rate = taxRate ?? 0;
    if (!rate) return 0;
    return grossTotal - grossTotal / (1 + rate);
  }, [grossTotal, taxRate]);
  const netSubtotal = useMemo(
    () => grossTotal - taxAmount,
    [grossTotal, taxAmount],
  );

  // marginAmount and revenueTotal now calculated above in combined reduce

  const marginRate = useMemo(() => {
    if (!revenueTotal) return 0;
    return marginAmount / revenueTotal;
  }, [marginAmount, revenueTotal]);
  const total = useMemo(() => grossTotal, [grossTotal]);

  const normalizeSpecs = (specs: any): string[] => {
    if (Array.isArray(specs)) return specs.map((item) => String(item));
    if (typeof specs === 'string') return [specs];
    if (!specs) return [];
    if (typeof specs === 'object') {
      return Object.entries(specs).map(
        ([key, value]) => `${key}: ${String(value)}`,
      );
    }
    return [];
  };

  const mapQuoteToSelection = (
    detail: QuoteDetail,
    catalogData: QuoteCatalog,
  ) => {
    const preferredTab = detail.items.some((item) => item.category === 'LAPTOP')
      ? 'laptops'
      : detail.items.some((item) => item.category === 'PC')
        ? 'pc'
        : 'hardware';
    setTab(preferredTab);

    const sections = catalogData[preferredTab] ?? [];
    const optionLookup = new Map<
      string,
      { sectionId: string; option: QuoteOption }
    >();
    sections.forEach((section) => {
      section.options.forEach((option) => {
        optionLookup.set(option.id, { sectionId: section.id, option });
      });
    });

    const nextSelection: SelectionMap = {};
    const nextOverrides: Record<string, number> = {};
    const nextQuantities: Record<string, number> = {};

    detail.items.forEach((item) => {
      let resolved: QuoteOption | null = null;
      let sectionId = 'imported';
      if (item.productId) {
        const optionId = `product-${item.productId}`;
        const found = optionLookup.get(optionId);
        if (found) {
          resolved = found.option;
          sectionId = found.sectionId;
        }
      }
      if (!resolved) {
        const componentType =
          item.type === 'SERVICE'
            ? 'service'
            : item.type === 'WARRANTY'
              ? 'warranty'
              : 'other';
        resolved = {
          id: `quoteitem-${item.id}`,
          name: item.name,
          price: item.unitPrice,
          costPrice: item.costPrice ?? undefined,
          image: '/placeholder.svg?height=120&width=160',
          specs: normalizeSpecs(item.specs),
          description: item.description ?? undefined,
          componentType,
        };
        sectionId =
          item.type === 'SERVICE'
            ? 'services'
            : item.type === 'WARRANTY'
              ? 'warranties'
              : 'imported';
      }
      nextSelection[sectionId] = [
        ...(nextSelection[sectionId] ?? []),
        resolved,
      ];
      nextOverrides[resolved.id] = item.unitPrice;
      nextQuantities[resolved.id] = item.quantity;
    });

    setSelection(nextSelection);
    setPriceOverrides(nextOverrides);
    setQuantities(nextQuantities);
  };

  useEffect(() => {
    const idParam = quoteIdParam;
    if (!idParam) {
      loadedQuoteIdRef.current = null;
      setServerQuoteStatus((prev) =>
        prev === 'ISSUED' || prev === 'CANCELLED' ? null : prev,
      );
      return;
    }
    if (!catalog) return;
    const quoteId = Number(idParam);
    if (!quoteId || loadedQuoteIdRef.current === quoteId) return;
    loadedQuoteIdRef.current = quoteId;
    getQuoteById(quoteId)
      .then((detail) => {
        setServerQuoteId(detail.id);
        setServerQuoteStatus(detail.status);
        if (detail.quoteNumber) setQuoteNumber(detail.quoteNumber);
        setClientName(detail.clientNameSnapshot || '');
        setContactName(detail.contactSnapshot || '');

        // Buscar cliente en la lista para obtener datos de documento
        if (detail.clientNameSnapshot) {
          const foundClient = clients.find(
            (c) => c.name === detail.clientNameSnapshot,
          );
          if (foundClient) {
            setClientDocType(foundClient.documentType || '');
            setClientDocNumber(foundClient.documentNumber || '');
          }
        }

        setCurrency(detail.currency || 'PEN');
        setValidity(detail.validity || '15 días');
        setConditions(detail.conditions || '');
        setTaxRate(typeof detail.taxRate === 'number' ? detail.taxRate : 0.18);
        mapQuoteToSelection(detail, catalog);
      })
      .catch(() => {
        loadedQuoteIdRef.current = null;
      });
  }, [catalog, quoteIdParam, clients]);

  const buildQuoteItemsPayload = (): QuoteItemPayload[] => {
    // Build reverse map: sectionId → origin tab (category key)
    const sectionToTab = new Map<string, QuoteCategoryKey>();
    if (catalog) {
      for (const catKey of Object.keys(catalog) as QuoteCategoryKey[]) {
        for (const section of catalog[catKey]) {
          if (!sectionToTab.has(section.id)) {
            sectionToTab.set(section.id, catKey);
          }
        }
      }
    }

    const items: QuoteItemPayload[] = [];
    Object.entries(selection).forEach(([sectionId, options]) => {
      const originTab = sectionToTab.get(sectionId) ?? tab;
      options.forEach((item) => {
        const qty = Math.max(1, quantities[item.id] ?? 1);
        const unitPrice =
          typeof priceOverrides[item.id] === 'number'
            ? priceOverrides[item.id]
            : (item.price ?? 0);
        const type =
          item.componentType === 'service'
            ? 'SERVICE'
            : item.componentType === 'warranty'
              ? 'WARRANTY'
              : 'PRODUCT';
        const category =
          type === 'SERVICE'
            ? 'SERVICE'
            : type === 'WARRANTY'
              ? 'WARRANTY'
              : originTab === 'laptops'
                ? 'LAPTOP'
                : originTab === 'pc'
                  ? 'PC'
                  : 'HARDWARE';
        items.push({
          productId: item.id.startsWith('product-')
            ? Number(item.id.replace('product-', ''))
            : null,
          name: item.name,
          description: item.description ?? null,
          specs: item.specs ?? [],
          unitPrice,
          costPrice: typeof item.costPrice === 'number' ? item.costPrice : null,
          quantity: qty,
          type,
          category,
        });
      });
    });
    return items;
  };

  const buildPdfData = () => {
    const items = Object.values(selection)
      .flat()
      .filter(Boolean)
      .map((item) => ({
        name: item!.name,
        price: priceOverrides[item!.id] ?? item!.price,
        quantity: Math.max(1, quantities[item!.id] ?? 1),
        description: item!.description,
        ...(!hideSpecsInPdf && { specs: item!.specs }),
        ...(showImagesInPdf && { image: item!.image }),
      }));
    return {
      companyName: meta?.company.name ?? 'Empresa',
      companyLogoUrl: meta?.company.logoUrl,
      companyAddress: meta?.company.address ?? '',
      companyPhone: meta?.company.phone ?? '',
      companyEmail: meta?.company.email ?? '',
      clientName,
      contactName,
      clientDocType,
      clientDocNumber,
      validity,
      currency,
      conditions,
      issuedAt: new Date().toLocaleDateString('es-PE'),
      quoteNumber,
      items,
      subtotal: netSubtotal,
      margin: marginAmount,
      tax: taxAmount,
      total,
      bankAccounts: bankAccounts.length > 0 ? bankAccounts : undefined,
    };
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const payload: QuoteDraftPayload = {
        clientNameSnapshot: clientName || null,
        contactSnapshot: contactName || null,
        currency,
        validity,
        conditions,
        taxRate,
        subtotal: netSubtotal,
        taxAmount: taxAmount,
        marginAmount,
        total,
        items: buildQuoteItemsPayload(),
      };
      const result = serverQuoteId
        ? await updateQuoteDraft(serverQuoteId, payload)
        : await createQuoteDraft(payload);
      setServerQuoteId(result.id);
      setServerQuoteStatus(result.status);
      if (result.quoteNumber) setQuoteNumber(result.quoteNumber);
      toast.success(
        serverQuoteId ? 'Borrador actualizado.' : 'Borrador guardado.',
      );
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el borrador.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleIssueQuote = async () => {
    setIsIssuingQuote(true);
    try {
      const itemsPayload = buildQuoteItemsPayload();
      if (!itemsPayload.length) {
        toast.error('Agrega al menos un ítem antes de emitir la cotización.');
        return;
      }

      const payload: QuoteDraftPayload = {
        clientNameSnapshot: clientName || null,
        contactSnapshot: contactName || null,
        currency,
        validity,
        conditions,
        taxRate,
        subtotal: netSubtotal,
        taxAmount: taxAmount,
        marginAmount,
        total,
        items: itemsPayload,
      };

      let draftId = serverQuoteStatus === 'DRAFT' ? serverQuoteId : null;
      if (draftId) {
        try {
          const updatedDraft = await updateQuoteDraft(draftId, payload);
          draftId = updatedDraft.id;
          setServerQuoteId(updatedDraft.id);
          setServerQuoteStatus(updatedDraft.status);
        } catch (error: any) {
          const message = String(error?.message ?? '');
          const mustRecreateDraft =
            /Solo se pueden editar borradores|no encontrada|not found/i.test(
              message,
            );
          if (!mustRecreateDraft) throw error;
          const recreatedDraft = await createQuoteDraft(payload);
          draftId = recreatedDraft.id;
          setServerQuoteId(recreatedDraft.id);
          setServerQuoteStatus(recreatedDraft.status);
        }
      } else {
        const draft = await createQuoteDraft(payload);
        draftId = draft.id;
        setServerQuoteId(draft.id);
        setServerQuoteStatus(draft.status);
      }

      const issued = await issueQuote(draftId, {
        stockValidationMode: limitByStock
          ? storeId
            ? 'STORE'
            : 'GLOBAL'
          : 'NONE',
        storeId,
      });
      setServerQuoteStatus(issued.status);
      if (issued.quoteNumber) setQuoteNumber(issued.quoteNumber);
      toast.success(`Cotización emitida (${issued.quoteNumber}).`);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'quotes:suppress-restore-toast-once',
          '1',
        );
        window.localStorage.removeItem(draftKey);
        router.replace('/dashboard/quotes');
      }
    } catch (error: any) {
      if (
        typeof error?.message === 'string' &&
        /emitida|cancelada/i.test(error.message)
      ) {
        setServerQuoteId(null);
        setServerQuoteStatus(null);
      }
      toast.error(error?.message || 'No se pudo emitir la cotización.');
    } finally {
      setIsIssuingQuote(false);
    }
  };

  const openPdfPreview = async () => {
    const blob = await pdf(<QuotePdfDocument data={buildPdfData()} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openPdfPrint = async () => {
    const blob = await pdf(<QuotePdfDocument data={buildPdfData()} />).toBlob();
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };
  const handleSendWhatsApp = async () => {
    if (!whatsAppPhone.trim()) {
      toast.error('Ingresa un número de WhatsApp.');
      return;
    }
    setSendingWhatsApp(true);
    try {
      const blob = await pdf(
        <QuotePdfDocument data={buildPdfData()} />,
      ).toBlob();
      const filename = `cotizacion-${Date.now()}.pdf`;
      await sendQuoteWhatsApp({ phone: whatsAppPhone, filename, file: blob });
      toast.success('Cotización enviada por WhatsApp.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo enviar por WhatsApp.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error('Ingresa el nombre del cliente.');
      return;
    }
    if (!newClientDocNumber.trim()) {
      toast.error('Ingresa el número de documento.');
      return;
    }

    setIsCreatingClient(true);
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
        type: newClientDocType,
        typeNumber: newClientDocNumber.trim(),
      });

      toast.success('Cliente creado exitosamente.');

      // Auto-populate client fields
      setClientName(newClient.name);
      setContactName(newClient.email || newClient.phone || '');
      setWhatsAppPhone(newClient.phone || '');
      setClientDocType(newClient.type || newClientDocType);
      setClientDocNumber(newClient.typeNumber || newClientDocNumber);

      // Refresh clients list
      const refreshedClients = await getQuoteClients();
      setClients(refreshedClients);

      // Reset form and close dialog
      setNewClientName('');
      setNewClientDocType('DNI');
      setNewClientDocNumber('');
      setShowNewClientDialog(false);
      setClientOpen(false);
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 409) {
        toast.error(
          `El número de documento ${newClientDocNumber} ya está registrado.`,
        );
      } else {
        toast.error(error?.message || 'No se pudo crear el cliente.');
      }
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Component handlers
  const handleClientSelect = useCallback((client: QuoteClient) => {
    setClientName(client.name);
    setContactName(client.email || client.phone || '');
    setWhatsAppPhone(client.phone || '');
    setClientDocType(client.documentType || '');
    setClientDocNumber(client.documentNumber || '');
    setClientOpen(false);
  }, []);

  const handleProductToggle = useCallback(
    (option: QuoteOption) => {
      setSelection((prev) => {
        const sectionId =
          Object.keys(prev).find((key) =>
            prev[key]?.some((item) => item.id === option.id),
          ) ||
          Object.keys(catalog || {}).find((catKey) =>
            (catalog?.[catKey as QuoteCategoryKey] || []).some((section) =>
              section.options.some((opt) => opt.id === option.id),
            ),
          ) ||
          'unknown';

        const current = prev[sectionId] ?? [];
        const exists = current.some((item) => item.id === option.id);
        const nextItems = exists
          ? current.filter((item) => item.id !== option.id)
          : [...current, option];

        if (exists) {
          setQuantities((prevQuantities) => {
            if (!(option.id in prevQuantities)) return prevQuantities;
            const nextQuantities = { ...prevQuantities };
            delete nextQuantities[option.id];
            return nextQuantities;
          });
          setPriceOverrides((prevOverrides) => {
            if (!(option.id in prevOverrides)) return prevOverrides;
            const nextOverrides = { ...prevOverrides };
            delete nextOverrides[option.id];
            return nextOverrides;
          });
        }

        return { ...prev, [sectionId]: nextItems };
      });
    },
    [catalog],
  );

  const handleRemoveItem = useCallback((item: QuoteOption) => {
    setSelection((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const items = next[key] ?? [];
        if (items.some((i) => i.id === item.id)) {
          next[key] = items.filter((i) => i.id !== item.id);
          break;
        }
      }
      return next;
    });
    setQuantities((prev) => {
      const n = { ...prev };
      delete n[item.id];
      return n;
    });
    setPriceOverrides((prev) => {
      const n = { ...prev };
      delete n[item.id];
      return n;
    });
  }, []);

  const handlePriceChange = useCallback((itemId: number, price: number) => {
    setPriceOverrides((prev) => ({ ...prev, [itemId]: price }));
  }, []);

  const handleQuantityChange = useCallback(
    (itemId: number, quantity: number) => {
      setQuantities((prev) => ({ ...prev, [itemId]: quantity }));
    },
    [],
  );

  if (
    verticalInfo?.businessVertical &&
    verticalInfo.businessVertical !== 'COMPUTERS'
  ) {
    return (
      <div className="p-6">
        <Card className="border border-muted/40">
          <CardHeader>
            <CardTitle>
              Sección disponible solo para tiendas de computadoras
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El módulo de cotizaciones está habilitado únicamente para el
            vertical COMPUTERS.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#F7FAFC_0%,_#F0F5FA_55%,_#E9EFF6_100%)] dark:bg-[radial-gradient(circle_at_top,_#0B1118_0%,_#0F1722_60%,_#0A0F14_100%)]">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Cotizaciones
                  </h1>
                  <PageGuideButton steps={QUOTES_GUIDE_STEPS} tooltipLabel="Guía de cotizaciones" />
                  <Badge variant="secondary" className="text-[11px]">
                    {nonServiceItems.length} items
                  </Badge>
                  {serverQuoteStatus ? (
                    <Badge
                      className={cn(
                        'text-[11px]',
                        serverQuoteStatus === 'ISSUED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : serverQuoteStatus === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
                      )}
                    >
                      {serverQuoteStatus === 'ISSUED'
                        ? 'Emitida'
                        : serverQuoteStatus === 'CANCELLED'
                          ? 'Cancelada'
                          : 'Borrador'}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Select
                    value={String(storeId ?? 'all')}
                    onValueChange={(value) =>
                      setStoreId(value === 'all' ? null : Number(value))
                    }
                  >
                    <SelectTrigger className="h-6 w-auto gap-1.5 border-none bg-transparent px-1 py-0 text-xs font-medium shadow-none focus:ring-0">
                      <span className="text-slate-500 dark:text-slate-400">
                        Tienda:
                      </span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start" className="min-w-[140px]">
                      <SelectItem value="all">Todos</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <QuoteActionButtons
              quoteNumber={quoteNumber}
              serverQuoteStatus={serverQuoteStatus}
              hasProducts={Object.values(selection).flat().length > 0}
              hasClient={clientName.trim().length > 0}
              storeId={storeId}
              isSavingDraft={isSavingDraft}
              isIssuingQuote={isIssuingQuote}
              sendingWhatsApp={sendingWhatsApp}
              onClear={() => {
                if (
                  Object.keys(selection).some(
                    (key) => selection[key]?.length > 0,
                  )
                ) {
                  setShowClearDialog(true);
                }
              }}
              onSaveDraft={handleSaveDraft}
              onPreviewPdf={openPdfPreview}
              onPrintPdf={openPdfPrint}
              onSendWhatsApp={handleSendWhatsApp}
              onIssueQuote={handleIssueQuote}
              isReadOnly={isReadOnlyQuote}
            />
          </div>
        </header>

        <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 pb-40 lg:grid-cols-[1.7fr_0.8fr]">
          <section className="space-y-6 pb-8">
            <QuoteProductCatalog
              tab={tab}
              catalog={catalog}
              selection={selection}
              pcCategoryFilter={pcCategoryFilter}
              pcProductFilter={pcProductFilter}
              hardwareCategoryFilter={hardwareCategoryFilter}
              hardwareProductFilter={hardwareProductFilter}
              deferredPcFilter={deferredPcFilter}
              deferredHwFilter={deferredHwFilter}
              limitByStock={limitByStock}
              onTabChange={(value) => setTab(value)}
              onPcCategoryFilterChange={setPcCategoryFilter}
              onPcProductFilterChange={setPcProductFilter}
              onHardwareCategoryFilterChange={setHardwareCategoryFilter}
              onHardwareProductFilterChange={setHardwareProductFilter}
              onProductToggle={handleProductToggle}
              isReadOnly={isReadOnlyQuote}
            />
          </section>

          <aside className="sticky top-4 space-y-3 self-start">
            <QuoteContextBar
              storeId={storeId}
              stores={stores}
              clients={clients}
              clientName={clientName}
              contactName={contactName}
              whatsAppPhone={whatsAppPhone}
              clientDocType={clientDocType}
              clientDocNumber={clientDocNumber}
              clientOpen={clientOpen}
              onStoreChange={setStoreId}
              onClientSelect={handleClientSelect}
              onClientOpenChange={setClientOpen}
              onClientNameChange={setClientName}
              onContactNameChange={setContactName}
              onWhatsAppPhoneChange={setWhatsAppPhone}
              onClientDocTypeChange={setClientDocType}
              onClientDocNumberChange={setClientDocNumber}
              onNewClientClick={() => setShowNewClientDialog(true)}
              isReadOnly={isReadOnlyQuote}
            />

            <QuoteConfigurationPanel
              meta={meta}
              marginRate={marginRate}
              validity={validity}
              currency={currency}
              conditions={conditions}
              taxRate={taxRate}
              limitByStock={limitByStock}
              showImagesInPdf={showImagesInPdf}
              hideSpecsInPdf={hideSpecsInPdf}
              showAdvancedConfig={showAdvancedConfig}
              bankAccounts={bankAccounts}
              isSavingBankAccounts={isSavingBankAccounts}
              onValidityChange={setValidity}
              onCurrencyChange={setCurrency}
              onConditionsChange={setConditions}
              onTaxRateChange={setTaxRate}
              onLimitByStockChange={setLimitByStock}
              onShowImagesInPdfChange={setShowImagesInPdf}
              onHideSpecsInPdfChange={setHideSpecsInPdf}
              onShowAdvancedConfigChange={setShowAdvancedConfig}
              onBankAccountsChange={setBankAccounts}
              onSaveBankAccounts={() => handleSaveBankAccounts(bankAccounts)}
              isReadOnly={isReadOnlyQuote}
            />

            <QuoteSummaryPanel
              selection={selection}
              priceOverrides={priceOverrides}
              quantities={quantities}
              currency={currency}
              taxRate={taxRate}
              limitByStock={limitByStock}
              tab={tab}
              sectionChips={sectionChips}
              onPriceChange={handlePriceChange}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              isReadOnly={isReadOnlyQuote}
            />
          </aside>
        </main>

        {/* ── Clear confirmation dialog ── */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent className="border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
                ¿Limpiar todos los productos?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                Se eliminarán todos los productos seleccionados. La información
                del cliente se mantendrá.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => {
                  setSelection({});
                  setQuantities({});
                  setPriceOverrides({});
                  setShowClearDialog(false);
                }}
              >
                Limpiar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showNewClientDialog}
          onOpenChange={setShowNewClientDialog}
        >
          <AlertDialogContent className="border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
                Agregar nuevo cliente
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                Completa los datos del cliente para agregarlo al sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="new-client-name"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nombre completo
                </Label>
                <Input
                  id="new-client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  disabled={isCreatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="new-client-doc-type"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tipo de documento
                </Label>
                <Select
                  value={newClientDocType}
                  onValueChange={setNewClientDocType}
                  disabled={isCreatingClient}
                >
                  <SelectTrigger
                    id="new-client-doc-type"
                    className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="RUC">RUC</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="new-client-doc-number"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Número de documento
                </Label>
                <Input
                  id="new-client-doc-number"
                  value={newClientDocNumber}
                  onChange={(e) => setNewClientDocNumber(e.target.value)}
                  placeholder="Ej. 12345678"
                  className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  disabled={isCreatingClient}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="cursor-pointer"
                disabled={isCreatingClient}
                onClick={() => {
                  setNewClientName('');
                  setNewClientDocType('DNI');
                  setNewClientDocNumber('');
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={handleCreateClient}
                disabled={isCreatingClient}
              >
                {isCreatingClient ? 'Creando...' : 'Crear cliente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function specIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes('marca')) return Tag;
  if (key.includes('categoría') || key.includes('categoria')) return LayoutGrid;
  if (key.includes('procesador') || key.includes('cpu')) return Cpu;
  if (key.includes('ram')) return MemoryStick;
  if (
    key.includes('storage') ||
    key.includes('ssd') ||
    key.includes('hdd') ||
    key.includes('almacenamiento')
  )
    return HardDrive;
  if (
    key.includes('graphics') ||
    key.includes('gráficos') ||
    key.includes('grafica') ||
    key.includes('gpu')
  )
    return Boxes;
  if (
    key.includes('screen') ||
    key.includes('pantalla') ||
    key.includes('resolución') ||
    key.includes('resolucion')
  )
    return Monitor;
  if (key.includes('refresh') || key.includes('hz')) return Zap;
  if (
    key.includes('conectividad') ||
    key.includes('wifi') ||
    key.includes('bluetooth')
  )
    return Signal;
  if (key.includes('batería') || key.includes('bateria')) return Battery;
  if (key.includes('peso')) return Weight;
  if (key.includes('modelo')) return BadgeCheck;
  return Info;
}
