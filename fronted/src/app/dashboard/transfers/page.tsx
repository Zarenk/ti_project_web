"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTenantSelection } from "@/context/tenant-selection-context";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Hash,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Send,
  Store,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { ManualPagination } from "@/components/data-table-pagination";

import {
  fetchShippingGuides,
  fetchTransfers,
  downloadGuideFile,
  refreshGuideStatus,
  deleteGuide,
  voidGuide,
  type ShippingGuide,
  type StoreTransfer,
} from "./transfers.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCompanyDetail } from "../tenancy/tenancy.api";
import { GuideDocument, type GuideDocumentData } from "./components/GuideDocument";

export const dynamic = "force-dynamic";

// ── Motivo de traslado catalog ─────────────────────────────────
const MOTIVO_LABELS: Record<string, string> = {
  "01": "Venta",
  "02": "Compra",
  "03": "Venta con entrega a terceros",
  "04": "Traslado entre establecimientos",
  "05": "Consignacion",
  "06": "Devolucion",
  "07": "Recojo de bienes transformados",
  "08": "Importacion",
  "09": "Exportacion",
  "13": "Otros",
  "14": "Venta sujeta a confirmacion",
  "17": "Traslado de bienes para transformacion",
  "18": "Traslado emisor itinerante",
  "19": "Traslado zona primaria",
};

function getMotivoLabel(code: string) {
  return MOTIVO_LABELS[code] || code;
}

// ── SUNAT status badge ─────────────────────────────────────────
function SunatStatusBadge({ guide }: { guide: ShippingGuide }) {
  if (guide.status === "VOIDED") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-100 gap-1.5 rounded-full px-2.5 py-0.5 cursor-pointer line-through decoration-gray-400">
            <Ban className="h-3 w-3" />
            Anulada
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{guide.voidReason || "Guía anulada"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  if (guide.cdrAceptado) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 animate-status-glow rounded-full px-2.5 py-0.5">
        <CheckCircle2 className="h-3 w-3" />
        Aceptado
      </Badge>
    );
  }
  // Code 98 = still processing, not rejected
  if (guide.cdrCode && guide.cdrCode !== '98') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="gap-1.5 rounded-full px-2.5 py-0.5 cursor-pointer">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{guide.cdrDescription || `Codigo: ${guide.cdrCode}`}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-0.5 cursor-pointer">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs">
          {guide.cdrDescription || "Pendiente de respuesta SUNAT. Haz clic en el botón de actualizar para consultar."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Download handler ──────────────────────────────────────────
async function handleDownload(
  guideId: number,
  type: "xml" | "cdr",
  fileName: string,
) {
  try {
    const blob = await downloadGuideFile(guideId, type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error(`Error al descargar ${type.toUpperCase()}`);
  }
}

// ── Stats cards ───────────────────────────────────────────────
function StatsCards({ guides }: { guides: ShippingGuide[] }) {
  const voided = guides.filter((g) => g.status === "VOIDED").length;
  const active = guides.filter((g) => g.status !== "VOIDED");
  const total = active.length;
  const accepted = active.filter((g) => g.cdrAceptado).length;
  const rejected = active.filter((g) => !g.cdrAceptado && g.cdrCode && g.cdrCode !== '98').length;
  const pending = total - accepted - rejected;

  const stats = [
    {
      label: "Total activas",
      value: total,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Aceptadas SUNAT",
      value: accepted,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Pendientes",
      value: pending,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: "Anuladas",
      value: voided,
      icon: Ban,
      color: "bg-gray-50 text-gray-600",
      iconBg: "bg-gray-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card
          key={stat.label}
          className={`border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-card-enter animate-card-enter-${i + 1}`}
        >
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className={`rounded-xl ${stat.iconBg} p-2 sm:p-2.5 flex-shrink-0`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color.split(" ")[1]}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {stat.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Transfer stats cards ─────────────────────────────────────
function TransferStatsCards({
  transfers,
  total,
}: {
  transfers: StoreTransfer[];
  total: number;
}) {
  const withGuide = transfers.filter((t) => t.shippingGuideId).length;
  const totalQty = transfers.reduce((sum, t) => sum + t.quantity, 0);
  const uniqueProducts = new Set(transfers.map((t) => t.productId)).size;

  const stats = [
    {
      label: "Total traslados",
      value: total,
      icon: ArrowRightLeft,
      color: "bg-indigo-50 text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Unidades movidas",
      value: totalQty,
      icon: Package,
      color: "bg-teal-50 text-teal-600",
      iconBg: "bg-teal-100",
    },
    {
      label: "Productos distintos",
      value: uniqueProducts,
      icon: Hash,
      color: "bg-amber-50 text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: "Con guia SUNAT",
      value: withGuide,
      icon: FileText,
      color: "bg-violet-50 text-violet-600",
      iconBg: "bg-violet-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card
          key={stat.label}
          className={`border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-card-enter`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div
              className={`rounded-xl ${stat.iconBg} p-2 sm:p-2.5 flex-shrink-0`}
            >
              <stat.icon
                className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color.split(" ")[1]}`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                {stat.value}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {stat.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Empty state component ─────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border shadow-sm overflow-hidden animate-card-enter">
      <CardContent className="flex flex-col items-center justify-center py-16 sm:py-20 gap-4">
        <div className="relative">
          <div className="rounded-2xl bg-muted/60 p-5">
            <Icon className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-semibold text-base">{title}</p>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

// ── Shipping guides table ─────────────────────────────────────
function GuidesTable({
  guides,
  loading,
  generatingPdfId,
  refreshingStatusId,
  onViewPdf,
  onRefreshStatus,
  onDelete,
}: {
  guides: ShippingGuide[];
  loading: boolean;
  generatingPdfId: number | null;
  refreshingStatusId: number | null;
  onViewPdf: (guide: ShippingGuide) => void;
  onRefreshStatus: (guide: ShippingGuide) => void;
  onDelete: (guide: ShippingGuide) => void;
}) {
  const [waOpenId, setWaOpenId] = useState<number | null>(null);
  const [waPhone, setWaPhone] = useState("");

  const buildWhatsAppUrl = (guide: ShippingGuide, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const verifyUrl = `${window.location.origin}/verify/guide?ruc=${encodeURIComponent(guide.remitenteRuc || "")}&serie=${encodeURIComponent(guide.serie)}&num=${encodeURIComponent(guide.correlativo)}`;
    const lines = [
      `*Guia de Remision Electronica*`,
      `N°: ${guide.serie}-${guide.correlativo}`,
      `Fecha: ${format(new Date(guide.createdAt), "dd/MM/yyyy", { locale: es })}`,
      `Motivo: ${getMotivoLabel(guide.motivoTraslado)}`,
      ``,
      `*Remitente:* ${guide.remitenteRazonSocial || "-"}`,
      `*Destinatario:* ${guide.destinatarioRazonSocial || "-"}`,
      `Doc: ${guide.destinatarioNumeroDocumento || "-"}`,
      ``,
      `*Ruta:*`,
      `De: ${guide.puntoPartida || "-"}`,
      `A: ${guide.puntoLlegada || "-"}`,
      ``,
      `Verificar: ${verifyUrl}`,
    ];
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleSendWhatsApp = (guide: ShippingGuide) => {
    const phone = waPhone.trim();
    if (!phone) {
      toast.warning("Ingresa un numero de telefono");
      return;
    }
    const url = buildWhatsAppUrl(guide, phone);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Abriendo WhatsApp...");
    setWaOpenId(null);
    setWaPhone("");
  };

  if (loading) return <TablePageSkeleton />;

  if (guides.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No hay guias de remision"
        description="Crea tu primera guia de remision electronica para enviar mercaderia con respaldo SUNAT."
        action={
          <Link href="/dashboard/transfers/new">
            <Button className="cursor-pointer gap-2 mt-2 rounded-full px-6 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Nueva Guia
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Card className="border shadow-sm overflow-hidden animate-card-enter">
      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Serie-Correlativo</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Motivo</TableHead>
                <TableHead className="font-semibold">Destino</TableHead>
                <TableHead className="font-semibold">Destinatario</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guides.map((guide, i) => (
                <TableRow
                  key={guide.id}
                  className={`group transition-colors hover:bg-muted/40 animate-row-enter ${guide.status === "VOIDED" ? "opacity-50" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <TableCell>
                    <span className="font-mono font-medium text-sm bg-muted/50 px-2 py-0.5 rounded">
                      {guide.serie}-{guide.correlativo}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{format(new Date(guide.createdAt), "dd MMM yyyy", { locale: es })}</div>
                    <div className="text-[10px] text-muted-foreground/70">{format(new Date(guide.createdAt), "HH:mm:ss")}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-xs">
                      {getMotivoLabel(guide.motivoTraslado)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 max-w-[180px]">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{guide.puntoLlegada}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{guide.destinatarioRazonSocial}</span>
                  </TableCell>
                  <TableCell>
                    <SunatStatusBadge guide={guide} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer rounded-full hover:bg-violet-50 hover:text-violet-600 transition-colors"
                            disabled={generatingPdfId === guide.id}
                            onClick={() => onViewPdf(guide)}
                          >
                            {generatingPdfId === guide.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver Guia PDF</TooltipContent>
                      </Tooltip>
                      {guide.xmlName && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() =>
                                handleDownload(
                                  guide.id,
                                  "xml",
                                  `${guide.serie}-${guide.correlativo}.xml`,
                                )
                              }
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Descargar XML</TooltipContent>
                        </Tooltip>
                      )}
                      {guide.cdrAceptado && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              onClick={() =>
                                handleDownload(
                                  guide.id,
                                  "cdr",
                                  `R-${guide.serie}-${guide.correlativo}.zip`,
                                )
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Descargar CDR</TooltipContent>
                        </Tooltip>
                      )}
                      {guide.status !== "VOIDED" && (
                        <Popover
                          open={waOpenId === guide.id}
                          onOpenChange={(open) => {
                            setWaOpenId(open ? guide.id : null);
                            if (open) setWaPhone("");
                          }}
                        >
                          <Tooltip>
                            <PopoverTrigger asChild>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer rounded-full text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                            </PopoverTrigger>
                            <TooltipContent>Enviar por WhatsApp</TooltipContent>
                          </Tooltip>
                          <PopoverContent className="w-64 p-3 space-y-2" align="end">
                            <div className="space-y-0.5">
                              <Label htmlFor={`wa-phone-${guide.id}`} className="text-xs font-medium">
                                Numero de WhatsApp
                              </Label>
                            </div>
                            <Input
                              id={`wa-phone-${guide.id}`}
                              type="tel"
                              placeholder="Ej: 51987654321"
                              value={waPhone}
                              onChange={(e) => setWaPhone(e.target.value)}
                              className="h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSendWhatsApp(guide);
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSendWhatsApp(guide)}
                              disabled={!waPhone.trim()}
                              className="w-full h-7 cursor-pointer gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Send className="h-3 w-3" />
                              Enviar
                            </Button>
                          </PopoverContent>
                        </Popover>
                      )}
                      {!guide.cdrAceptado && guide.status !== "VOIDED" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer rounded-full hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              disabled={refreshingStatusId === guide.id}
                              onClick={() => onRefreshStatus(guide)}
                            >
                              {refreshingStatusId === guide.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Consultar estado SUNAT</TooltipContent>
                        </Tooltip>
                      )}
                      {guide.status !== "VOIDED" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => onDelete(guide)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar / Anular</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </Card>
  );
}

// ── Transfer SUNAT badge (reuse same logic as guides) ─────────
function TransferSunatBadge({
  guide,
}: {
  guide: { cdrAceptado: boolean; status: string };
}) {
  if (guide.status === "VOIDED") {
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-100 gap-1 rounded-full px-2 py-0.5 text-[10px] line-through decoration-gray-400">
        <Ban className="h-2.5 w-2.5" />
        Anulada
      </Badge>
    );
  }
  if (guide.cdrAceptado) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 animate-status-glow rounded-full px-2 py-0.5 text-[10px]">
        <CheckCircle2 className="h-2.5 w-2.5" />
        SUNAT
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5 text-[10px]">
      <Clock className="h-2.5 w-2.5" />
      Pendiente
    </Badge>
  );
}

// ── Grouped transfer type ─────────────────────────────────────
type TransferGroup = {
  key: string;
  shippingGuide: StoreTransfer["shippingGuide"];
  sourceStore: { id: number; name: string };
  destinationStore: { id: number; name: string };
  items: StoreTransfer[];
  totalQuantity: number;
  date: string;
};

function groupTransfers(transfers: StoreTransfer[]): TransferGroup[] {
  const map = new Map<string, TransferGroup>();

  for (const t of transfers) {
    // Group by shippingGuideId if present, otherwise by individual transfer id
    const key = t.shippingGuideId
      ? `guide-${t.shippingGuideId}`
      : `single-${t.id}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        shippingGuide: t.shippingGuide,
        sourceStore: t.sourceStore,
        destinationStore: t.destinationStore,
        items: [],
        totalQuantity: 0,
        date: t.createdAt,
      });
    }

    const group = map.get(key)!;
    group.items.push(t);
    group.totalQuantity += t.quantity;
  }

  return Array.from(map.values());
}

// ── Transfer group card ───────────────────────────────────────
function TransferGroupCard({
  group,
  index,
}: {
  group: TransferGroup;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const guide = group.shippingGuide;
  const hasMultipleItems = group.items.length > 1;
  // Show first 3 items collapsed, rest on expand
  const visibleItems = expanded ? group.items : group.items.slice(0, 3);
  const hiddenCount = group.items.length - 3;

  return (
    <Card
      className="border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-card-enter w-full min-w-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className="p-0 w-full min-w-0 overflow-hidden">
        {/* Header: Guide info or date */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {guide ? (
              <>
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-1.5 flex-shrink-0">
                  <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="font-mono font-semibold text-sm bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">
                  {guide.serie}-{guide.correlativo}
                </span>
                <TransferSunatBadge guide={guide} />
              </>
            ) : (
              <>
                <div className="rounded-lg bg-muted p-1.5 flex-shrink-0">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Traslado directo
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span>
              {format(new Date(group.date), "dd MMM yyyy, HH:mm", {
                locale: es,
              })}
            </span>
            {hasMultipleItems && (
              <Badge
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {group.items.length} productos
              </Badge>
            )}
          </div>
        </div>

        {/* Route: Source → Destination */}
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center gap-2 text-sm w-full min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0">
              <Store className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
              <span className="font-medium truncate">
                {group.sourceStore.name}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Store className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <span className="font-medium truncate">
                {group.destinationStore.name}
              </span>
            </div>
          </div>
          {/* Show guide addresses if available */}
          {guide && (guide.puntoPartida || guide.puntoLlegada) && (
            <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground/70 w-full min-w-0 overflow-hidden">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{guide.puntoPartida}</span>
              <span className="flex-shrink-0">→</span>
              <span className="truncate">{guide.puntoLlegada}</span>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="border-t bg-muted/20 w-full min-w-0 overflow-hidden">
          <div className="divide-y divide-border/50">
            {visibleItems.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 animate-row-enter w-full min-w-0"
                style={{ animationDelay: `${(index * 60) + (i * 30)}ms` }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="rounded-md bg-primary/10 p-1 flex-shrink-0">
                    <Package className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate break-words">
                      {t.product.name}
                    </span>
                    {t.product.barcode && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {t.product.barcode}
                      </span>
                    )}
                    {t.serials && t.serials.length > 0 && (
                      <span className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">
                        <Hash className="h-2.5 w-2.5 inline mr-0.5" />
                        {t.serials.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.description && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground max-w-[100px] truncate hidden sm:inline cursor-pointer">
                          {t.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t.description}</TooltipContent>
                    </Tooltip>
                  )}
                  <span className="font-mono font-semibold text-sm bg-background border px-2 py-0.5 rounded tabular-nums">
                    {t.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Expand/collapse if more than 3 items */}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors cursor-pointer border-t border-border/50"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Ver {hiddenCount} producto{hiddenCount > 1 ? "s" : ""} mas
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer: total */}
        {hasMultipleItems && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t bg-muted/30 w-full min-w-0">
            <span className="text-xs text-muted-foreground">
              Total trasladado
            </span>
            <span className="font-mono font-bold text-sm tabular-nums">
              {group.totalQuantity} unidades
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Store transfers ───────────────────────────────────────────
function TransfersTable({
  transfers,
  loading,
}: {
  transfers: StoreTransfer[];
  loading: boolean;
}) {
  const groups = useMemo(() => groupTransfers(transfers), [transfers]);

  if (loading) return <TablePageSkeleton />;

  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title="No hay traslados entre tiendas"
        description="Los traslados entre tiendas se registran automaticamente al crear una guia de remision con motivo 'Traslado entre establecimientos' y el toggle de traslado activado."
        action={
          <Link href="/dashboard/transfers/new?motivo=04">
            <Button className="cursor-pointer gap-2 mt-2 rounded-full px-6 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Nueva Guia con Traslado
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-3 w-full min-w-0">
        {groups.map((group, i) => (
          <TransferGroupCard key={group.key} group={group} index={i} />
        ))}
      </div>
    </TooltipProvider>
  );
}

// ── Main page ─────────────────────────────────────────────────
// ── Delete confirmation dialog (non-accepted guides) ─────────
function DeleteGuideDialog({
  guide,
  open,
  loading,
  onClose,
  onConfirm,
}: {
  guide: ShippingGuide | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!guide) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 rounded-full bg-red-100 p-3 w-fit animate-in zoom-in-75 duration-300">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">Eliminar Guia de Remision</DialogTitle>
          <DialogDescription className="text-center">
            Esta guia <span className="font-mono font-semibold">{guide.serie}-{guide.correlativo}</span> no fue
            aceptada por SUNAT y se eliminara permanentemente del sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Esta accion no se puede deshacer:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-red-600">
            <li>Se eliminaran los archivos XML, ZIP y CDR asociados</li>
            <li>El correlativo quedara libre pero no se reutilizara</li>
          </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="cursor-pointer rounded-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer rounded-full gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Eliminar Guia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Void dialog (SUNAT-accepted guides) ──────────────────────
function VoidGuideDialog({
  guide,
  open,
  loading,
  onClose,
  onConfirm,
}: {
  guide: ShippingGuide | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setReason("");
    }
  }, [open]);

  if (!guide) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 rounded-full bg-amber-100 p-3 w-fit animate-in zoom-in-75 duration-300">
            <Ban className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Anular Guia de Remision</DialogTitle>
          <DialogDescription className="text-center">
            La guia <span className="font-mono font-semibold">{guide.serie}-{guide.correlativo}</span> fue
            aceptada por SUNAT. Para anularla, primero debe darla de baja en el Portal SOL.
          </DialogDescription>
        </DialogHeader>

        {/* Instructions */}
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Pasos para anular en SUNAT:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Ingrese al{" "}
              <a
                href="https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1"
              >
                Portal SOL de SUNAT <ExternalLink className="h-3 w-3 inline" />
              </a>
            </li>
            <li>Navegue a <span className="font-medium text-foreground">Empresas &rarr; Guia de Remision Electronica &rarr; Baja de GRE</span></li>
            <li>Seleccione <span className="font-medium text-foreground">GRE - Remitente</span> e ingrese serie <span className="font-mono font-medium text-foreground">{guide.serie}</span> y correlativo <span className="font-mono font-medium text-foreground">{guide.correlativo}</span></li>
            <li>Confirme la baja en el portal</li>
          </ol>
        </div>

        {/* Reason input */}
        <div className="space-y-2">
          <Label htmlFor="void-reason" className="text-sm font-medium">
            Motivo de anulacion <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="void-reason"
            placeholder="Ej: Error en datos del destinatario"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="cursor-pointer"
          />
        </div>

        {/* Confirmation checkbox */}
        <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
          <Checkbox
            id="void-confirm"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            className="mt-0.5 cursor-pointer"
          />
          <label htmlFor="void-confirm" className="text-sm leading-relaxed cursor-pointer select-none">
            Confirmo que ya anule esta guia en el Portal SOL de SUNAT
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="cursor-pointer rounded-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer rounded-full gap-2 bg-amber-600 hover:bg-amber-700 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onConfirm(reason)}
            disabled={!confirmed || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Marcar como Anulada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TransfersPage() {
  const { selection } = useTenantSelection();
  const [guides, setGuides] = useState<ShippingGuide[]>([]);
  const [transfers, setTransfers] = useState<StoreTransfer[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [activeTab, setActiveTab] = useState("guides");
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [refreshingStatusId, setRefreshingStatusId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingGuide | null>(null);
  const [voidTarget, setVoidTarget] = useState<ShippingGuide | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Pagination state ─────────────────────────────────────────
  // Guides — client-side pagination (API returns all)
  const [guidesPage, setGuidesPage] = useState(1);
  const [guidesPageSize, setGuidesPageSize] = useState(20);
  // Transfers — server-side pagination
  const [transfersPage, setTransfersPage] = useState(1);
  const [transfersPageSize, setTransfersPageSize] = useState(20);
  const [transfersTotal, setTransfersTotal] = useState(0);

  const loadGuides = useCallback(async () => {
    setLoadingGuides(true);
    try {
      const data = await fetchShippingGuides();
      setGuides(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar guias");
    } finally {
      setLoadingGuides(false);
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const data = await fetchTransfers(transfersPage, transfersPageSize);
      setTransfers(data.items || []);
      setTransfersTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar traslados");
    } finally {
      setLoadingTransfers(false);
    }
  }, [transfersPage, transfersPageSize]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGuides(), loadTransfers()]);
    setRefreshing(false);
    toast.success("Datos actualizados");
  }, [loadGuides, loadTransfers]);

  const handleViewPdf = useCallback(async (guide: ShippingGuide) => {
    setGeneratingPdfId(guide.id);
    try {
      // Fetch company data for branding (logo, colors, address)
      let companyName = guide.remitenteRazonSocial || "";
      let companyRuc = guide.remitenteRuc || "";
      let companyAddress = "";
      let companyPhone = "";
      let companyLogo: string | null = null;
      let primaryColor: string | undefined;
      let secondaryColor: string | undefined;

      if (guide.companyId) {
        const company = await getCompanyDetail(guide.companyId);
        if (company) {
          companyName = company.sunatBusinessName || company.name || companyName;
          companyRuc = company.sunatRuc || company.taxId || companyRuc;
          companyAddress = company.sunatAddress || "";
          companyPhone = company.sunatPhone || "";
          companyLogo = company.logoUrl;
          primaryColor = company.primaryColor || undefined;
          secondaryColor = company.secondaryColor || undefined;
        }
      }

      // Build items from guideData if available, merging serials from transferItems
      const guidePayload = guide.guideData;
      const rawItems = guidePayload?.items || [];
      const transferItemsList = guidePayload?.transferItems as
        | { productId: number; quantity: number; serials?: string[] }[]
        | undefined;
      const items = rawItems.map(
        (item: any, idx: number) => ({
          ...item,
          serials: transferItemsList?.[idx]?.serials,
        }),
      );

      // Generate QR code for verification
      let qrDataUrl: string | undefined;
      try {
        const verifyUrl = `${window.location.origin}/verify/guide?ruc=${encodeURIComponent(companyRuc)}&serie=${encodeURIComponent(guide.serie)}&num=${encodeURIComponent(guide.correlativo)}`;
        qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: "M",
        });
      } catch {
        // QR generation failed — PDF still renders without QR
      }

      const pdfData: GuideDocumentData = {
        serie: guide.serie,
        correlativo: guide.correlativo,
        fechaTraslado: guide.fechaTraslado,
        fechaEmision: guidePayload?.fechaEmision || guide.fechaTraslado,
        motivoTraslado: guide.motivoTraslado,
        modalidadTraslado: guide.modalidadTraslado || guidePayload?.modalidadTraslado,

        remitenteRuc: companyRuc,
        remitenteRazonSocial: companyName,
        remitenteAddress: companyAddress,
        remitentePhone: companyPhone,
        remitenteLogo: companyLogo,

        destinatarioTipoDocumento: guide.destinatarioTipoDocumento,
        destinatarioNumeroDocumento: guide.destinatarioNumeroDocumento,
        destinatarioRazonSocial: guide.destinatarioRazonSocial,

        transportistaTipoDocumento: guide.transportistaTipoDocumento,
        transportistaNumeroDocumento: guide.transportistaNumeroDocumento,
        transportistaRazonSocial: guide.transportistaRazonSocial,
        transportistaNumeroPlaca: guide.transportistaNumeroPlaca,

        puntoPartida: guide.puntoPartida,
        puntoPartidaDireccion: guide.puntoPartidaDireccion || guidePayload?.puntoPartidaDireccion,
        puntoPartidaUbigeo: guide.puntoPartidaUbigeo || guidePayload?.puntoPartidaUbigeo,
        puntoLlegada: guide.puntoLlegada,
        puntoLlegadaDireccion: guide.puntoLlegadaDireccion || guidePayload?.puntoLlegadaDireccion,
        puntoLlegadaUbigeo: guide.puntoLlegadaUbigeo || guidePayload?.puntoLlegadaUbigeo,

        pesoBrutoTotal: guide.pesoBrutoTotal ?? guidePayload?.pesoBrutoTotal,
        pesoBrutoUnidad: guide.pesoBrutoUnidad || guidePayload?.pesoBrutoUnidad,

        items,

        cdrAceptado: guide.cdrAceptado,
        cdrCode: guide.cdrCode,
        cdrDescription: guide.cdrDescription,

        qrDataUrl,

        primaryColor,
        secondaryColor,
      };

      const blob = await pdf(<GuideDocument data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url);
    } catch (err: any) {
      toast.error(err.message || "Error al generar el PDF");
    } finally {
      setGeneratingPdfId(null);
    }
  }, []);

  const handleDeleteClick = useCallback((guide: ShippingGuide) => {
    if (guide.cdrAceptado) {
      setVoidTarget(guide);
    } else {
      setDeleteTarget(guide);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteGuide(deleteTarget.id);
      toast.success(`Guia ${deleteTarget.serie}-${deleteTarget.correlativo} eliminada`);
      setDeleteTarget(null);
      await loadGuides();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar guia");
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget, loadGuides]);

  const handleConfirmVoid = useCallback(async (reason: string) => {
    if (!voidTarget) return;
    setActionLoading(true);
    try {
      await voidGuide(voidTarget.id, reason);
      toast.success(`Guia ${voidTarget.serie}-${voidTarget.correlativo} marcada como anulada`);
      setVoidTarget(null);
      await loadGuides();
    } catch (err: any) {
      toast.error(err.message || "Error al anular guia");
    } finally {
      setActionLoading(false);
    }
  }, [voidTarget, loadGuides]);

  const handleRefreshStatus = useCallback(async (guide: ShippingGuide) => {
    setRefreshingStatusId(guide.id);
    try {
      const result = await refreshGuideStatus(guide.id);
      if (result.estadoSunat === 'ACEPTADO') {
        toast.success(`Guia ${guide.serie}-${guide.correlativo}: ${result.message}`);
      } else if (result.estadoSunat === 'EN PROCESO') {
        toast.info(result.message);
      } else {
        toast.warning(result.message);
      }
      // Reload guides to reflect updated status
      await loadGuides();
    } catch (err: any) {
      toast.error(err.message || "Error al consultar estado SUNAT");
    } finally {
      setRefreshingStatusId(null);
    }
  }, [loadGuides]);

  useEffect(() => {
    if (selection?.orgId) {
      loadGuides();
      loadTransfers();
    }
  }, [selection?.orgId, loadGuides, loadTransfers]);

  // ── Client-side paginated guides ──────────────────────────────
  const guidesTotalPages = Math.max(
    1,
    Math.ceil(guides.length / guidesPageSize),
  );
  const paginatedGuides = useMemo(() => {
    const start = (guidesPage - 1) * guidesPageSize;
    return guides.slice(start, start + guidesPageSize);
  }, [guides, guidesPage, guidesPageSize]);

  // Reset page to 1 when data reloads
  useEffect(() => {
    setGuidesPage(1);
  }, [guides.length]);

  // Transfers pagination
  const transfersTotalPages = Math.max(
    1,
    Math.ceil(transfersTotal / transfersPageSize),
  );

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-card-enter">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Traslados
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Guias de remision y traslados entre tiendas
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Link href="/dashboard/transfers/new">
            <Button
              size="sm"
              className="cursor-pointer gap-2 rounded-full shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Guia
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {!loadingGuides && <StatsCards guides={guides} />}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full animate-card-enter animate-card-enter-3"
      >
        <TabsList className="inline-flex h-10 bg-muted/60 p-1 rounded-full w-full max-w-md">
          <TabsTrigger
            value="guides"
            className="cursor-pointer gap-2 rounded-full flex-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Guias de Remision</span>
            {guides.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                {guides.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="transfers"
            className="cursor-pointer gap-2 rounded-full flex-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Entre Tiendas</span>
            {transfersTotal > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                {transfersTotal}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="mt-4 space-y-3">
          <GuidesTable
            guides={paginatedGuides}
            loading={loadingGuides}
            generatingPdfId={generatingPdfId}
            refreshingStatusId={refreshingStatusId}
            onViewPdf={handleViewPdf}
            onRefreshStatus={handleRefreshStatus}
            onDelete={handleDeleteClick}
          />
          {!loadingGuides && guides.length > 0 && (
            <ManualPagination
              currentPage={guidesPage}
              totalPages={guidesTotalPages}
              pageSize={guidesPageSize}
              totalItems={guides.length}
              onPageChange={setGuidesPage}
              onPageSizeChange={(size) => {
                setGuidesPageSize(size);
                setGuidesPage(1);
              }}
              pageSizeOptions={[10, 20, 30, 50]}
            />
          )}
        </TabsContent>

        <TabsContent value="transfers" className="mt-4 space-y-3">
          {!loadingTransfers && transfers.length > 0 && (
            <TransferStatsCards transfers={transfers} total={transfersTotal} />
          )}
          <TransfersTable transfers={transfers} loading={loadingTransfers} />
          {!loadingTransfers && transfersTotal > 0 && (
            <ManualPagination
              currentPage={transfersPage}
              totalPages={transfersTotalPages}
              pageSize={transfersPageSize}
              totalItems={transfersTotal}
              onPageChange={setTransfersPage}
              onPageSizeChange={(size) => {
                setTransfersPageSize(size);
                setTransfersPage(1);
              }}
              pageSizeOptions={[10, 20, 30, 50]}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Delete dialog (non-accepted guides) */}
      <DeleteGuideDialog
        guide={deleteTarget}
        open={!!deleteTarget}
        loading={actionLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Void dialog (SUNAT-accepted guides) */}
      <VoidGuideDialog
        guide={voidTarget}
        open={!!voidTarget}
        loading={actionLoading}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
