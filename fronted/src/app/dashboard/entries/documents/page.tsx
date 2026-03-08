"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarIcon,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ManualPagination } from "@/components/data-table-pagination";

import { useTenantSelection } from "@/context/tenant-selection-context";
import { queryKeys } from "@/lib/query-keys";
import {
  getEntryDocuments,
  getDocumentPdfUrl,
  type EntryDocumentsResponse,
} from "../entries.api";
import { getProviders } from "../../providers/providers.api";
import { getStores } from "../../stores/stores.api";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function EntryDocumentsPage() {
  const router = useRouter();
  const { selection } = useTenantSelection();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [docType, setDocType] = useState<"all" | "invoice" | "guide">("all");
  const [providerId, setProviderId] = useState<string>("all");
  const [storeId, setStoreId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Data queries
  const { data: providers = [] } = useQuery<any[]>({
    queryKey: queryKeys.providers?.list?.(selection.orgId, selection.companyId) ?? ["providers", selection.orgId],
    queryFn: () => getProviders(),
    enabled: selection.orgId !== null,
  });

  const { data: stores = [] } = useQuery<any[]>({
    queryKey: queryKeys.stores?.list?.(selection.orgId, selection.companyId) ?? ["stores", selection.orgId],
    queryFn: () => getStores(),
    enabled: selection.orgId !== null,
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: docType !== "all" ? docType : undefined,
      providerId: providerId !== "all" ? Number(providerId) : undefined,
      storeId: storeId !== "all" ? Number(storeId) : undefined,
      dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
      dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
      page,
      pageSize,
    }),
    [debouncedSearch, docType, providerId, storeId, dateFrom, dateTo, page, pageSize],
  );

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery<EntryDocumentsResponse>({
    queryKey: queryKeys.entries.documents(selection.orgId, selection.companyId, filters),
    queryFn: () => getEntryDocuments(filters),
    enabled: selection.orgId !== null,
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (docType !== "all") count++;
    if (providerId !== "all") count++;
    if (storeId !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [debouncedSearch, docType, providerId, storeId, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDocType("all");
    setProviderId("all");
    setStoreId("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const isFiltered = activeFilterCount > 0;

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer flex-shrink-0"
            onClick={() => router.push("/dashboard/entries")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
              Documentos de Entradas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Busca facturas y guías de remisión adjuntas a tus ingresos
            </p>
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
          )}
        </div>

        {/* ── Mobile: compact search + filter toggle ── */}
        <div className="flex gap-2 sm:hidden w-full min-w-0 mb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedor, serie..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="h-9 text-sm pl-9"
            />
          </div>
          <Button
            variant={mobileFiltersOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-xs">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {/* ── Mobile: collapsible filter panel ── */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileFiltersOpen ? "max-h-[500px] opacity-100 mb-3" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-2 pt-1 pb-0.5">
            <Select value={docType} onValueChange={(v) => { setDocType(v as any); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm cursor-pointer">
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todos los tipos</SelectItem>
                <SelectItem value="invoice" className="cursor-pointer">Facturas</SelectItem>
                <SelectItem value="guide" className="cursor-pointer">Guías</SelectItem>
              </SelectContent>
            </Select>

            <Select value={providerId} onValueChange={(v) => { setProviderId(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm cursor-pointer">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todos los proveedores</SelectItem>
                {providers.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storeId} onValueChange={(v) => { setStoreId(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm cursor-pointer">
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todas las tiendas</SelectItem>
                {stores.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)} className="cursor-pointer">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs justify-start cursor-pointer">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} locale={es} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs justify-start cursor-pointer">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleResetFilters();
                  setMobileFiltersOpen(false);
                }}
                className="h-8 w-full text-xs text-muted-foreground cursor-pointer"
              >
                <X className="h-3 w-3 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* ── Desktop: full filter grid ── */}
        <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, serie, descripción..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select value={docType} onValueChange={(v) => { setDocType(v as any); setPage(1); }}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Todos los tipos</SelectItem>
              <SelectItem value="invoice" className="cursor-pointer">Facturas</SelectItem>
              <SelectItem value="guide" className="cursor-pointer">Guías</SelectItem>
            </SelectContent>
          </Select>

          <Select value={providerId} onValueChange={(v) => { setProviderId(v); setPage(1); }}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
              {providers.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal cursor-pointer">
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Desde"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} locale={es} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal cursor-pointer">
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Hasta"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} locale={es} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Desktop: filter status bar */}
        {isFiltered && (
          <div className="hidden sm:flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              {total} documento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground cursor-pointer"
            >
              <X className="h-3 w-3 mr-1" /> Limpiar
            </Button>
          </div>
        )}

        {/* ── Results ── */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No se encontraron documentos</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isFiltered
                ? "Intenta ajustar los filtros de búsqueda."
                : "Los documentos aparecerán aquí cuando adjuntes PDFs a tus entradas de inventario."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: total count */}
            <p className="text-xs text-muted-foreground mb-2 sm:hidden">
              {total} documento{total !== 1 ? "s" : ""}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <ManualPagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  pageSizeOptions={[12, 24, 36]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Document Card Component ──

function DocumentCard({ doc }: { doc: import("../entries.api").EntryDocument }) {
  const hasInvoice = !!doc.pdfUrl;
  const hasGuide = !!doc.guiaUrl;
  const invoice = doc.invoice;
  const dateStr = doc.date
    ? format(new Date(doc.date), "dd MMM yyyy", { locale: es })
    : "Sin fecha";

  const comprobante = invoice?.tipoComprobante?.toUpperCase() ?? "";
  const serieCorrelativo =
    invoice?.serie && invoice?.nroCorrelativo
      ? `${invoice.serie}-${invoice.nroCorrelativo}`
      : null;

  return (
    <Card className="group border shadow-sm w-full min-w-0 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30">
      <CardContent className="p-3 sm:p-4 space-y-2.5 overflow-hidden">
        {/* Row 1: Type badges + date */}
        <div className="flex items-start justify-between gap-2 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {hasInvoice && (
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 gap-1"
              >
                <FileText className="h-3 w-3 flex-shrink-0" />
                {comprobante || "Factura"}
              </Badge>
            )}
            {hasGuide && (
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 gap-1"
              >
                <Truck className="h-3 w-3 flex-shrink-0" />
                Guía
              </Badge>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {dateStr}
          </span>
        </div>

        {/* Row 2: Serie + Provider */}
        <div className="space-y-1 w-full min-w-0">
          {serieCorrelativo && (
            <p className="font-mono text-sm sm:text-base font-semibold break-words">
              {serieCorrelativo}
            </p>
          )}
          <p className="text-xs sm:text-sm text-muted-foreground break-words">
            {doc.provider?.name ?? "Sin proveedor"}
          </p>
        </div>

        {/* Row 3: Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
          {doc.store && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {doc.store.name}
            </span>
          )}
          {invoice?.total != null && (
            <span className="font-medium text-foreground">
              {doc.tipoMoneda === "USD" ? "$ " : "S/ "}
              {invoice.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </span>
          )}
          {doc.description && (
            <span className="truncate max-w-[200px]">{doc.description}</span>
          )}
        </div>

        {/* Row 4: PDF action buttons */}
        <div className="flex flex-wrap gap-2 pt-1.5 border-t border-border/50">
          {doc.pdfUrl && (
            <a
              href={getDocumentPdfUrl(doc.pdfUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:shadow-sm px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              Ver Factura
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
            </a>
          )}
          {doc.guiaUrl && (
            <a
              href={getDocumentPdfUrl(doc.guiaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:shadow-sm px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
            >
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              Ver Guía
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
