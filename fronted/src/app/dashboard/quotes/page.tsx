"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { useVerticalConfig } from "@/hooks/use-vertical-config"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { cn } from "@/lib/utils"
import { AlertTriangle, Check, FileText, Printer, Send, Sparkles, User } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import {
  getQuoteCatalog,
  getQuoteClients,
  getQuoteMeta,
  sendQuoteWhatsApp,
  type QuoteCatalog,
  type QuoteCategoryKey,
  type QuoteClient,
  type QuoteOption,
} from "./quotes.api"
import { getStores } from "@/app/dashboard/stores/stores.api"
import { QuotePdfDocument } from "./QuotePdfDocument"
import { updateCompany } from "@/app/dashboard/tenancy/tenancy.api"

type StoreOption = { id: number; name: string }
type CompatibilityMode = "soft" | "block" | "mixed"

type QuoteDraft = {
  version: 1
  updatedAt: string
  tab: QuoteCategoryKey
  selection: SelectionMap
  priceOverrides: Record<string, number>
  quantities: Record<string, number>
  clientName: string
  contactName: string
  whatsAppPhone: string
  compatibilityMode: CompatibilityMode
  limitByStock: boolean
  validity: string
  currency: string
  conditions: string
  storeId: number | null
  marginRate: number
  taxRate: number
}

type SelectionMap = Record<string, QuoteOption[]>

const TAB_LABELS: Record<QuoteCategoryKey, string> = {
  pc: "PC",
  laptops: "Laptops",
  hardware: "Otros",
}

type CompatibilityIssue = {
  title: string
  detail: string
  severity: "critical" | "warning" | "missing"
}

function normalizeTag(tag: string) {
  return tag.replace(/\s+/g, "").toUpperCase()
}

function findTag(item: QuoteOption | undefined, regex: RegExp) {
  if (!item?.compatibility) return undefined
  return item.compatibility.find((tag) => regex.test(tag))
}

function normalizeFormFactor(tag: string) {
  const normalized = normalizeTag(tag)
  if (normalized.includes("MICROATX") || normalized.includes("M-ATX") || normalized === "MATX") return "M-ATX"
  if (normalized.includes("MINIITX") || normalized.includes("MINI-ITX")) return "MINI-ITX"
  if (normalized.includes("EATX") || normalized.includes("E-ATX")) return "E-ATX"
  if (normalized.includes("ATX")) return "ATX"
  return normalized
}

function isQuantityEditable(item?: QuoteOption) {
  if (!item) return false
  return item.componentType !== "service" && item.componentType !== "warranty"
}

function getStockLimit(item?: QuoteOption, limitByStock?: boolean): number | null {
  if (!limitByStock) return null
  if (!item) return null
  if (typeof item.stock !== "number") return null
  return item.stock > 0 ? item.stock : 0
}

export default function QuotesPage() {
  const { info: verticalInfo } = useVerticalConfig()
  const { selection: tenantSelection } = useTenantSelection()
  const [catalog, setCatalog] = useState<QuoteCatalog | null>(null)
  const [tab, setTab] = useState<QuoteCategoryKey>("pc")
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof getQuoteMeta>> | null>(null)
  const [selection, setSelection] = useState<SelectionMap>({})
  const [clientName, setClientName] = useState("")
  const [contactName, setContactName] = useState("")
  const [whatsAppPhone, setWhatsAppPhone] = useState("")
  const [clients, setClients] = useState<QuoteClient[]>([])
  const [clientOpen, setClientOpen] = useState(false)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [stores, setStores] = useState<StoreOption[]>([])
  const [storeId, setStoreId] = useState<number | null>(null)
  const [validity, setValidity] = useState("15 días")
  const [currency, setCurrency] = useState("PEN")
  const [conditions, setConditions] = useState("")
  const [marginRate, setMarginRate] = useState(0.12)
  const [taxRate, setTaxRate] = useState(0.18)
  const [compatibilityMode, setCompatibilityMode] = useState<CompatibilityMode>("mixed")
  const [limitByStock, setLimitByStock] = useState(true)
  const [savingMargin, setSavingMargin] = useState(false)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)

  const draftKey = useMemo(() => {
    const companyKey = tenantSelection.companyId ?? "all"
    return `quotes-draft:v1:${companyKey}`
  }, [tenantSelection.companyId])

  useEffect(() => {
    let active = true
    async function load() {
      const [catalogData, metaData, clientData, storeData] = await Promise.all([
        getQuoteCatalog(storeId),
        getQuoteMeta(tenantSelection.companyId),
        getQuoteClients(),
        getStores(),
      ])
      if (!active) return
      setCatalog(catalogData)
      setMeta(metaData)
      setClients(clientData)
      const storeOptions = Array.isArray(storeData)
        ? storeData.map((s: any) => ({ id: Number(s.id), name: String(s.name ?? "Tienda") }))
        : []
      setStores(storeOptions)
      setConditions(metaData.defaultConditions)
      setTaxRate(metaData.taxRate ?? 0.18)
      setMarginRate(metaData.marginRate ?? 0.12)
      if (metaData.validityOptions[0]) {
        setValidity(metaData.validityOptions[0])
      }
      if (metaData.currencyOptions[0]) {
        setCurrency(metaData.currencyOptions[0])
      }
    }
    load()
    return () => {
      active = false
    }
  }, [tenantSelection.companyId, storeId])

  useEffect(() => {
    if (!catalog) return
    const sections = catalog[tab] ?? []
    const servicesSection = sections.find((section) => section.id === "services")
    const warrantiesSection = sections.find((section) => section.id === "warranties")
    const freeService = servicesSection?.options.find((option) => option.id === "service-assembly-free")
    const freeWarranty = warrantiesSection?.options.find((option) => option.id === "warranty-12-free")

    if (!freeService && !freeWarranty) return

    setSelection((prev) => {
      const next = { ...prev }
      const servicesKey = servicesSection?.id ?? "services"
      const warrantiesKey = warrantiesSection?.id ?? "warranties"
      const currentServices = next[servicesKey] ?? []
      const currentWarranties = next[warrantiesKey] ?? []
      if (freeService && currentServices.length === 0) {
        next[servicesKey] = [freeService]
      }
      if (freeWarranty && currentWarranties.length === 0) {
        next[warrantiesKey] = [freeWarranty]
      }
      return next
    })
  }, [catalog, tab])

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev }
      let changed = false
      Object.values(selection).forEach((items) => {
        items.forEach((item) => {
          if (!isQuantityEditable(item)) return
          const minValue = 1
          const limit = getStockLimit(item, limitByStock)
          const current = next[item.id]
          if (!current || current < minValue) {
            next[item.id] = minValue
            changed = true
          } else if (limit !== null && current > limit) {
            next[item.id] = Math.max(minValue, limit)
            changed = true
          }
        })
      })
      return changed ? next : prev
    })
  }, [selection, limitByStock])
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as QuoteDraft
      if (draft?.version !== 1) return
      setTab(draft.tab)
      const normalizedSelection: SelectionMap = {}
      const rawSelection = draft.selection ?? {}
      Object.entries(rawSelection).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          normalizedSelection[key] = value.filter(Boolean)
        } else if (value) {
          normalizedSelection[key] = [value as QuoteOption]
        } else {
          normalizedSelection[key] = []
        }
      })
      setSelection(normalizedSelection)
      setPriceOverrides(draft.priceOverrides ?? {})
      setQuantities(draft.quantities ?? {})
      setClientName(draft.clientName ?? "")
      setContactName(draft.contactName ?? "")
      setWhatsAppPhone(draft.whatsAppPhone ?? "")
      setValidity(draft.validity ?? "15 días")
      setCurrency(draft.currency ?? "PEN")
      setConditions(draft.conditions ?? "")
      setStoreId(draft.storeId ?? null)
      setMarginRate(typeof draft.marginRate === "number" ? draft.marginRate : 0.12)
      setCompatibilityMode(draft.compatibilityMode ?? "mixed")
      setLimitByStock(typeof draft.limitByStock === "boolean" ? draft.limitByStock : true)
      setTaxRate(0.18)
    } catch {
      /* ignore */
    }
  }, [draftKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    const payload: QuoteDraft = {
      version: 1,
      updatedAt: new Date().toISOString(),
      tab,
      selection,
      priceOverrides,
      quantities,
      clientName,
      contactName,
      whatsAppPhone,
      validity,
      currency,
      conditions,
      compatibilityMode,
      limitByStock,
      storeId,
      marginRate,
      taxRate,
    }
    window.localStorage.setItem(draftKey, JSON.stringify(payload))
  }, [
    tab,
    selection,
    priceOverrides,
    quantities,
    clientName,
    contactName,
    whatsAppPhone,
    validity,
    currency,
    conditions,
    compatibilityMode,
    limitByStock,
    storeId,
    marginRate,
    taxRate,
    draftKey,
  ])

  const subtotal = useMemo(() => {
    return Object.values(selection).flat().reduce((sum, item) => {
      if (!item) return sum
      const override = priceOverrides[item.id]
      const qty = Math.max(1, quantities[item.id] ?? 1)
      const unitPrice = typeof override === "number" ? override : item.price ?? 0
      return sum + unitPrice * qty
    }, 0)
  }, [priceOverrides, quantities, selection])

  const selectedItems = useMemo(() => Object.values(selection).flat(), [selection])

  const marginAmount = useMemo(() => subtotal * (marginRate ?? 0), [marginRate, subtotal])
  const taxAmount = useMemo(() => (subtotal + marginAmount) * (taxRate ?? 0), [marginRate, subtotal, taxRate])
  const total = useMemo(() => subtotal + marginAmount + taxAmount, [subtotal, marginAmount, taxAmount])


  const evaluateCompatibility = (currentSelection: SelectionMap) => {
    const items = Object.values(currentSelection).flat().filter(Boolean) as QuoteOption[]
    const issues: CompatibilityIssue[] = []
    const seen = new Set<string>()
    const pushIssue = (issue: CompatibilityIssue) => {
      const key = `${issue.title}:${issue.detail}:${issue.severity}`
      if (seen.has(key)) return
      seen.add(key)
      issues.push(issue)
    }

    const cpuItems = items.filter((item) => item.componentType === "cpu")
    const mbItems = items.filter((item) => item.componentType === "motherboard")
    const ramItems = items.filter((item) => item.componentType === "ram")
    const caseItems = items.filter((item) => item.componentType === "case")
    const psuItems = items.filter((item) => item.componentType === "psu")

    const cpuSockets = cpuItems
      .map((item) => findTag(item, /AM4|AM5|LGA\s*\d{3,4}/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const mbSockets = mbItems
      .map((item) => findTag(item, /AM4|AM5|LGA\s*\d{3,4}/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const cpuSocketSet = new Set(cpuSockets)
    const mbSocketSet = new Set(mbSockets)

    if (cpuItems.length > 1 || mbItems.length > 1) {
      pushIssue({
        title: "Múltiples sockets seleccionados",
        detail: "Se han seleccionado múltiples CPUs o placas madre.",
        severity: "warning",
      })
    }

    if (cpuSocketSet.size && mbSocketSet.size) {
      const hasMatch = Array.from(cpuSocketSet).some((socket) => mbSocketSet.has(socket))
      if (!hasMatch) {
        pushIssue({
          title: "Socket incompatible",
          detail: `CPU ${Array.from(cpuSocketSet).join(", ")} vs placa ${Array.from(mbSocketSet).join(", ")}.`,
          severity: "critical",
        })
      }
    } else if (cpuItems.length || mbItems.length) {
      pushIssue({
        title: "Socket no verificado",
        detail: "Completa los datos de socket en CPU y placa madre.",
        severity: "missing",
      })
    }

    const ramTypes = ramItems
      .map((item) => findTag(item, /DDR[3-5]/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const mbRamTypes = mbItems
      .map((item) => findTag(item, /DDR[3-5]/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const ramSet = new Set(ramTypes)
    const mbRamSet = new Set(mbRamTypes)

    if (ramItems.length > 1) {
      pushIssue({
        title: "Múltiples RAM seleccionadas",
        detail: "Se han seleccionado múltiples memorias RAM.",
        severity: "warning",
      })
    }

    if (ramSet.size && mbRamSet.size) {
      const hasMatch = Array.from(ramSet).some((ramType) => mbRamSet.has(ramType))
      if (!hasMatch) {
        pushIssue({
          title: "RAM incompatible",
          detail: `RAM ${Array.from(ramSet).join(", ")} vs placa ${Array.from(mbRamSet).join(", ")}.`,
          severity: "critical",
        })
      }
    } else if (ramItems.length || mbItems.length) {
      pushIssue({
        title: "RAM no verificada",
        detail: "Faltan datos de tipo DDR para RAM o placa madre.",
        severity: "missing",
      })
    }

    const caseFormFactors = caseItems
      .map((item) => findTag(item, /(E?ATX|MICRO\s*ATX|M-?ATX|MINI\s*ITX)/i))
      .filter(Boolean)
      .map((tag) => normalizeFormFactor(tag!))
    const mbFormFactors = mbItems
      .map((item) => findTag(item, /(E?ATX|MICRO\s*ATX|M-?ATX|MINI\s*ITX)/i))
      .filter(Boolean)
      .map((tag) => normalizeFormFactor(tag!))
    const caseSet = new Set(caseFormFactors)
    const mbFormSet = new Set(mbFormFactors)

    if (caseSet.size && mbFormSet.size) {
      const hasMatch = Array.from(caseSet).some((ff) => mbFormSet.has(ff))
      if (!hasMatch) {
        pushIssue({
          title: "Form factor incompatible",
          detail: `Case ${Array.from(caseSet).join(", ")} vs placa ${Array.from(mbFormSet).join(", ")}.`,
          severity: "critical",
        })
      }
    } else if (caseItems.length || mbItems.length) {
      pushIssue({
        title: "Form factor no verificado",
        detail: "Completa el factor de forma en case y placa madre.",
        severity: "missing",
      })
    }

    const cpuChipsets = cpuItems
      .map((item) => findTag(item, /(B|Z|H|X|A)\d{3,4}/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const mbChipsets = mbItems
      .map((item) => findTag(item, /(B|Z|H|X|A)\d{3,4}/i))
      .filter(Boolean)
      .map((tag) => normalizeTag(tag!))
    const cpuChipsetSet = new Set(cpuChipsets)
    const mbChipsetSet = new Set(mbChipsets)
    if (cpuChipsetSet.size && mbChipsetSet.size) {
      const hasMatch = Array.from(cpuChipsetSet).some((chip) => mbChipsetSet.has(chip))
      if (!hasMatch) {
        pushIssue({
          title: "Chipset distinto",
          detail: `CPU ${Array.from(cpuChipsetSet).join(", ")} vs placa ${Array.from(mbChipsetSet).join(", ")}.`,
          severity: "warning",
        })
      }
    } else if (cpuItems.length || mbItems.length) {
      pushIssue({
        title: "Chipset no verificado",
        detail: "Faltan datos de chipset para validar compatibilidad.",
        severity: "missing",
      })
    }

    if (psuItems.length || items.some((item) => item.componentType === "monitor")) {
      const voltageTags = items
        .flatMap((item) => item.compatibility ?? [])
        .filter((tag) => /(\d{2,3}\s*-\s*\d{2,3}\s*V|\d{2,3}\s*V)/i.test(tag))
        .map((tag) => normalizeTag(tag))
      const uniqueVoltages = Array.from(new Set(voltageTags))
      if (uniqueVoltages.length > 1) {
        pushIssue({
          title: "Voltaje distinto",
          detail: `Se detectaron voltajes ${uniqueVoltages.join(", ")}.`,
          severity: "warning",
        })
      } else if (uniqueVoltages.length === 0) {
        pushIssue({
          title: "Voltaje no verificado",
          detail: "No hay datos de voltaje para validar la fuente/monitor.",
          severity: "missing",
        })
      }
    }

    const blocking = issues.filter((issue) => issue.severity === "critical")
    const warnings = issues.filter((issue) => issue.severity !== "critical")

    return { issues, blocking, warnings }
  }

  const compatibilityReport = useMemo(() => evaluateCompatibility(selection), [selection])
  const compatibilityIssues = compatibilityReport.issues
  const blockingIssues = compatibilityReport.blocking

  const compatibilityStatus = useMemo(() => {
    if (blockingIssues.length > 0) {
      return {
        label: `Incompatibilidades críticas (${blockingIssues.length})`,
        className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
        icon: AlertTriangle,
      }
    }
    if (compatibilityIssues.length > 0) {
      return {
        label: `Compatibilidad con alertas (${compatibilityIssues.length})`,
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
        icon: AlertTriangle,
      }
    }
    return {
      label: "Compatibilidad OK",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
      icon: null,
    }
  }, [blockingIssues, compatibilityIssues])

  const StatusIcon = compatibilityStatus.icon
  const buildPdfData = () => {
    const items = Object.values(selection)
      .flat()
      .filter(Boolean)
      .map((item) => ({
        name: item!.name,
        price: priceOverrides[item!.id] ?? item!.price,
        quantity: Math.max(1, quantities[item!.id] ?? 1),
      }))
    return {
      companyName: meta?.company.name ?? "Empresa",
      companyAddress: meta?.company.address ?? "",
      companyPhone: meta?.company.phone ?? "",
      clientName,
      contactName,
      validity,
      currency,
      conditions,
      items,
      subtotal,
      margin: marginAmount,
      tax: taxAmount,
      total,
    }
  }

  const openPdfPreview = async () => {
    const blob = await pdf(<QuotePdfDocument data={buildPdfData()} />).toBlob()
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const openPdfPrint = async () => {
    const blob = await pdf(<QuotePdfDocument data={buildPdfData()} />).toBlob()
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, "_blank", "noopener,noreferrer")
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print()
      })
    }
  }
  const handleSendWhatsApp = async () => {
    if (!whatsAppPhone.trim()) {
      toast.error("Ingresa un número de WhatsApp.")
      return
    }
    setSendingWhatsApp(true)
    try {
      const blob = await pdf(<QuotePdfDocument data={buildPdfData()} />).toBlob()
      const filename = `cotizacion-${Date.now()}.pdf`
      await sendQuoteWhatsApp({ phone: whatsAppPhone, filename, file: blob })
      toast.success("Cotización enviada por WhatsApp.")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo enviar por WhatsApp.")
    } finally {
      setSendingWhatsApp(false)
    }
  }

  const handleSaveMargin = async () => {
    const companyId = tenantSelection.companyId
    if (!companyId) {
      toast.error("Selecciona una empresa para guardar el margen.")
      return
    }
    setSavingMargin(true)
    try {
      await updateCompany(companyId, { defaultQuoteMargin: marginRate })
      toast.success("Margen guardado para la empresa.")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el margen.")
    } finally {
      setSavingMargin(false)
    }
  }

  if (verticalInfo?.businessVertical && verticalInfo.businessVertical !== "COMPUTERS") {
    return (
      <div className="p-6">
        <Card className="border border-muted/40">
          <CardHeader>
            <CardTitle>Sección disponible solo para tiendas de computadoras</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El módulo de cotizaciones está habilitado únicamente para el vertical COMPUTERS.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#F7FAFC_0%,_#F0F5FA_55%,_#E9EFF6_100%)] dark:bg-[radial-gradient(circle_at_top,_#0B1118_0%,_#0F1722_60%,_#0A0F14_100%)]">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cotizaciones</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cotiza PCs y laptops con configuración guiada.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <span>Tienda:</span>
                <select
                  value={storeId ?? "all"}
                  onChange={(event) => {
                    const value = event.target.value
                    setStoreId(value === "all" ? null : Number(value))
                  }}
                  className="bg-transparent text-xs font-medium outline-none"
                >
                  <option value="all">Todos</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => toast.success("Borrador guardado")}
              >
                Guardar borrador
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={openPdfPreview}
              >
                Previsualizar PDF
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={openPdfPrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button
                className="rounded-full bg-cyan-600 text-white hover:bg-cyan-700"
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendingWhatsApp ? "Enviando..." : "WhatsApp"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                onClick={() => toast("Envío por Email (mock)")}
              >
                Email
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1.7fr_0.8fr]">
          <section className="space-y-6">
            <Card className="border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100">
                    Configuración de la cotización
                  </CardTitle>
                  <Badge className={compatibilityStatus.className}>
                    {StatusIcon ? (
                      <StatusIcon className="mr-1 h-3.5 w-3.5" />
                    ) : null}
                    {compatibilityStatus.label}
                  </Badge>
                </div>
                {compatibilityIssues.length > 0 ? (
                  <div className="mt-2 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <p className="font-semibold">Alertas de compatibilidad</p>
                    <ul className="mt-1 space-y-1">
                      {compatibilityIssues.map((issue) => (
                        <li key={issue.title}>
                          <span className="mr-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {issue.severity === "critical"
                              ? "Crítica"
                              : issue.severity === "warning"
                                ? "Advertencia"
                                : "Sin datos"}
                          </span>
                          {issue.title}: {issue.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={(value) => setTab(value as QuoteCategoryKey)}>
                  <TabsList className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {Object.entries(TAB_LABELS).map(([key, label]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {catalog ? (
                    Object.entries(catalog).map(([key, sections]) => (
                      <TabsContent key={key} value={key} className="mt-6 space-y-6">
                        {sections.map((section) => (
                          <div key={section.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {section.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {section.description}
                                </p>
                              </div>
                              {selection[section.id]?.length ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  Seleccionados {selection[section.id]?.length}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {section.options.map((option) => {
                                const isSelected = (selection[section.id] ?? []).some((item) => item.id === option.id)
                                return (
                                  <Tooltip key={option.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          setSelection((prev) => {
                                            const current = prev[section.id] ?? []
                                            const exists = current.some((item) => item.id === option.id)
                                            const nextItems = exists
                                              ? current.filter((item) => item.id !== option.id)
                                              : [...current, option]
                                            const nextSelection = {
                                              ...prev,
                                              [section.id]: nextItems,
                                            }
                                            if (exists) return nextSelection
                                            const report = evaluateCompatibility(nextSelection)
                                            const hasBlocking =
                                              compatibilityMode === "block"
                                                ? report.issues.some((issue) => issue.severity !== "missing")
                                                : compatibilityMode === "mixed"
                                                  ? report.blocking.length > 0
                                                  : false
                                            if (hasBlocking) {
                                              const first = report.blocking[0] ?? report.issues[0]
                                              toast.error(
                                                first
                                                  ? `${first.title}: ${first.detail}`
                                                  : "Incompatibilidad detectada.",
                                              )
                                              return prev
                                            }
                                            if (report.issues.length > 0) {
                                              const first = report.issues[0]
                                              toast(
                                                first
                                                  ? `${first.title}: ${first.detail}`
                                                  : "Compatibilidad a revisar.",
                                              )
                                            }
                                            return nextSelection
                                          })
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault()
                                            setSelection((prev) => {
                                              const current = prev[section.id] ?? []
                                              const exists = current.some((item) => item.id === option.id)
                                              return {
                                                ...prev,
                                                [section.id]: exists
                                                  ? current.filter((item) => item.id !== option.id)
                                                  : [...current, option],
                                              }
                                            })
                                          }
                                        }}
                                        className={cn(
                                          "group relative flex gap-4 rounded-2xl border p-4 text-left transition-all",
                                          "border-slate-200/70 bg-white/90 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg",
                                          "dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-cyan-700/70",
                                          isSelected && "border-cyan-400 bg-cyan-50/60 dark:border-cyan-500/60 dark:bg-cyan-950/30",
                                          (option.id === "service-assembly-free" || option.id === "warranty-12-free") &&
                                            "border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-700/60 dark:bg-emerald-950/20",
                                        )}
                                      >
                                        <div className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                          <Image
                                            alt={option.name}
                                            src={option.image}
                                            fill
                                            sizes="(max-width: 768px) 40vw, 96px"
                                            className="object-cover"
                                          />
                                          {option.highlight ? (
                                            <span className="absolute left-2 top-2 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                              Pro
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                              {option.name}
                                            </h4>
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                              {currency} {(priceOverrides[option.id] ?? option.price).toFixed(2)}
                                            </span>
                                          </div>
                                          {option.id === "service-assembly-free" || option.id === "warranty-12-free" ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                              Incluido
                                            </span>
                                          ) : null}
                                          {isSelected && isQuantityEditable(option) ? (
                                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-200">
                                              <span className="font-semibold">Cantidad</span>
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  setQuantities((prev) => {
                                                    const current = prev[option.id] ?? 1
                                                    return {
                                                      ...prev,
                                                      [option.id]: Math.max(1, current - 1),
                                                    }
                                                  })
                                                }}
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                aria-label="Disminuir cantidad"
                                              >
                                                -
                                              </button>
                                              <span className="min-w-[20px] text-center font-semibold text-slate-900 dark:text-slate-100">
                                                {Math.max(1, quantities[option.id] ?? 1)}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  setQuantities((prev) => {
                                                    const current = prev[option.id] ?? 1
                                                    const limit = getStockLimit(option, limitByStock)
                                                    const next = current + 1
                                                    if (limit !== null && next > limit) {
                                                      toast.error(`Stock máximo disponible: ${limit}`)
                                                      return prev
                                                    }
                                                    return {
                                                      ...prev,
                                                      [option.id]: next,
                                                    }
                                                  })
                                                }}
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                aria-label="Aumentar cantidad"
                                              >
                                                +
                                              </button>
                                              {getStockLimit(option, limitByStock) !== null ? (
                                                <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                  Stock: {getStockLimit(option, limitByStock)}
                                                </span>
                                              ) : null}
                                            </div>
                                          ) : null}
                                          {option.editablePrice ? (
                                            <Input
                                              type="number"
                                              value={priceOverrides[option.id] ?? option.price}
                                              onChange={(event) =>
                                                setPriceOverrides((prev) => ({
                                                  ...prev,
                                                  [option.id]: Number(event.target.value || 0),
                                                }))
                                              }
                                              className="h-8 text-xs"
                                            />
                                          ) : null}
                                          <div className="flex flex-wrap gap-1">
                                            {option.compatibility?.map((tag) => (
                                              <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                              >
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {option.specs[0]}
                                          </p>
                                          {typeof option.stock === "number" ? (
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                              Stock: {option.stock}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <div className="space-y-2">
                                        <p className="text-sm font-semibold text-slate-900">{option.name}</p>
                                        <ul className="space-y-1 text-xs text-slate-600">
                                          {option.specs.map((spec) => (
                                            <li key={spec}>• {spec}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    ))
                  ) : (
                    <div className="py-8 text-sm text-muted-foreground">Cargando catálogo...</div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card className="sticky top-24 border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
              <CardHeader className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100">Resumen</CardTitle>
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {TAB_LABELS[tab]}
                  </Badge>
                </div>
                {meta ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900">
                    <Image src={meta.company.logoUrl} alt={meta.company.name} width={40} height={40} />
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{meta.company.name}</p>
                      <p>{meta.company.address}</p>
                      <p>{meta.company.phone}</p>
                    </div>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Cliente (opcional)
                  </label>
                  <Popover open={clientOpen} onOpenChange={setClientOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        role="combobox"
                        aria-expanded={clientOpen}
                      >
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {clientName || "Sin cliente"}
                        </span>
                        <span className="text-xs text-slate-400">Buscar</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>No hay clientes.</CommandEmpty>
                          <CommandGroup heading="Clientes registrados">
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  setClientName(client.name)
                                  setContactName(client.email || client.phone || "")
                                  setWhatsAppPhone(client.phone || "")
                                  setClientOpen(false)
                                }}
                              >
                                <span className="flex-1">{client.name}</span>
                                {clientName === client.name ? <Check className="h-4 w-4" /> : null}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Sin cliente">
                            <CommandItem
                              value="sin-cliente"
                              onSelect={() => {
                                setClientName("")
                                setContactName("")
                                setWhatsAppPhone("")
                                setClientOpen(false)
                              }}
                            >
                              Usar sin cliente
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="Contacto"
                  />
                  <Input
                    value={whatsAppPhone}
                    onChange={(event) => setWhatsAppPhone(event.target.value)}
                    placeholder="WhatsApp para envío"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Validez</label>
                    <Input value={validity} onChange={(event) => setValidity(event.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Moneda</label>
                    <Input value={currency} onChange={(event) => setCurrency(event.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Condiciones</label>
                  <Textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Margen %</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={Math.round(marginRate * 100)}
                        onChange={(event) => setMarginRate(Number(event.target.value || 0) / 100)}
                      />
                      <Button variant="outline" size="sm" onClick={handleSaveMargin} disabled={savingMargin}>
                        {savingMargin ? "Guardando" : "Guardar"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Impuesto (18%)</label>
                    <Input
                      type="number"
                      value={Math.round(taxRate * 100)}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Modo de compatibilidad
                  </label>
                  <select
                    value={compatibilityMode}
                    onChange={(event) => setCompatibilityMode(event.target.value as CompatibilityMode)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="soft">Suave (solo alertas)</option>
                    <option value="block">Bloqueo (impide incompatibles)</option>
                    <option value="mixed">Mixto (bloquea críticas)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mixto bloquea incompatibilidades críticas y deja alertas para el resto.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-3 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                  <input
                    id="limit-by-stock"
                    type="checkbox"
                    checked={limitByStock}
                    onChange={(event) => setLimitByStock(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="limit-by-stock" className="space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Limitar cantidades por stock
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      Evita cotizar cantidades mayores al inventario disponible.
                    </span>
                  </label>
                </div>

                
                {compatibilityIssues.length > 0 ? (
                  <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Compatibilidad a revisar
                    </div>
                    <ul className="mt-2 space-y-1">
                      {compatibilityIssues.map((issue) => (
                        <li key={issue.title}>
                          <span className="mr-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {issue.severity === "critical"
                              ? "Crítica"
                              : issue.severity === "warning"
                                ? "Advertencia"
                                : "Sin datos"}
                          </span>
                          {issue.title}: {issue.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}<Separator />

                <div className="space-y-2">
                  {selectedItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Selecciona componentes para ver el resumen.
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {item.name}
                          {item.id === "service-assembly-free" || item.id === "warranty-12-free" ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Incluido
                            </span>
                          ) : null}
                          {isQuantityEditable(item) ? (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              x {Math.max(1, quantities[item.id] ?? 1)}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {currency}{" "}
                          {(
                            (priceOverrides[item.id] ?? item.price) *
                            Math.max(1, quantities[item.id] ?? 1)
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-2xl border border-cyan-200/60 bg-cyan-50/60 p-4 dark:border-cyan-800/40 dark:bg-cyan-950/40">
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span>{currency} {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Margen</span>
                      <span>{currency} {marginAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Impuestos</span>
                      <span>{currency} {taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span>Total estimado</span>
                    <span>
                      {currency} {total.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    Presupuesto actualizado al instante.
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </TooltipProvider>
  )
}


































