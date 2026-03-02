'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Copy,
  Crown,
  ImageOff,
  Loader2,
  Megaphone,
  Package,
  Pencil,
  Send,
  SmilePlus,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveImageUrl } from '@/lib/images'
import { AdOptionCard } from '../../new/components/ad-option-card'
import { AdEditor } from '@/components/ads/ad-editor'
import { NetworkSelector } from '@/components/ads/network-selector'
import { ConnectAccountDialog } from '@/components/ads/connect-account-dialog'
import { useAdPromotion } from './use-ad-promotion'
import type { AdTone, AdStyle } from '../../ads.api'
import { generateAdsFromProduct } from '../../ads.api'

// ── Tone & Style visual options ─────────────────────────────────────────────

const TONE_OPTIONS: { value: AdTone; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'profesional', label: 'Profesional', icon: <Briefcase className="h-4 w-4" />, desc: 'Formal y confiable' },
  { value: 'casual', label: 'Casual', icon: <SmilePlus className="h-4 w-4" />, desc: 'Amigable y cercano' },
  { value: 'urgente', label: 'Urgente', icon: <Zap className="h-4 w-4" />, desc: 'Ofertas limitadas' },
  { value: 'aspiracional', label: 'Aspiracional', icon: <Crown className="h-4 w-4" />, desc: 'Premium y exclusivo' },
]

const STYLE_OPTIONS: { value: AdStyle; label: string; color: string; desc: string }[] = [
  { value: 'moderno', label: 'Moderno', color: 'bg-blue-500', desc: 'Limpio y actual' },
  { value: 'minimalista', label: 'Minimalista', color: 'bg-gray-400', desc: 'Menos es más' },
  { value: 'vibrante', label: 'Vibrante', color: 'bg-purple-500', desc: 'Colores intensos' },
  { value: 'elegante', label: 'Elegante', color: 'bg-amber-600', desc: 'Sofisticado' },
]

// ── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: number
  name: string
  price: number
  priceSell?: number | null
  images?: string[] | null
  image?: string | null
  description?: string | null
  category_name?: string | null
  brandName?: string | null
  brand?: { name: string } | null
}

interface PromoteClientProps {
  product: Product
}

// ── Component ───────────────────────────────────────────────────────────────

export function PromoteClient({ product }: PromoteClientProps) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  const hasImage = images.length > 0
  const imageUrl = hasImage ? resolveImageUrl(images[0]) : null
  const brandName = product.brand?.name ?? product.brandName ?? null
  const categoryName = product.category_name ?? null
  const priceSell = product.priceSell ?? product.price

  const promo = useAdPromotion({ productId: product.id })
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  // Derive current step from state
  type Step = 'configure' | 'generating' | 'review' | 'actions'
  const currentStep: Step = useMemo(() => {
    if (promo.isGenerating) return 'generating'
    if (promo.result && promo.selectedIndex !== null) return 'actions'
    if (promo.result) return 'review'
    return 'configure'
  }, [promo.isGenerating, promo.result, promo.selectedIndex])

  return (
    <div className="w-full min-w-0">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="cursor-pointer shrink-0">
            <Link href="/dashboard/products">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Productos
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl break-words">Promocionar producto</h1>
            <p className="text-sm text-muted-foreground truncate">{product.name}</p>
          </div>
        </div>
        {promo.result?.costUsd != null && promo.result.costUsd > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0">
            Costo: ~${promo.result.costUsd.toFixed(4)}
          </Badge>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left sidebar — product context */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="overflow-hidden w-full min-w-0">
              {/* Product image */}
              {imageUrl ? (
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted/30">
                  <Package className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}

              <CardContent className="space-y-3 p-4">
                <h2 className="text-lg font-semibold break-words">{product.name}</h2>

                <div className="flex flex-wrap items-center gap-2">
                  {categoryName && (
                    <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
                  )}
                  {brandName && (
                    <Badge variant="outline" className="text-xs">{brandName}</Badge>
                  )}
                </div>

                <div className="flex justify-between border-t pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio venta</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      S/ {Number(priceSell).toFixed(2)}
                    </p>
                  </div>
                  {product.priceSell && product.price !== product.priceSell && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Costo</p>
                      <p className="text-sm text-muted-foreground">
                        S/ {Number(product.price).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {/* No-image warning */}
                {!hasImage && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <ImageOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Sin imagen. La IA usará solo datos textuales.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous generations */}
            {promo.previousGenerations.length > 0 && (
              <Card className="overflow-hidden w-full min-w-0">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Generaciones anteriores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4 pt-0">
                  {promo.previousGenerations.slice(0, 5).map((gen) => (
                    <div
                      key={gen.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {gen.tone ?? 'profesional'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right main content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Step: Configure */}
          {currentStep === 'configure' && (
            <Card className="animate-step-fade-in overflow-hidden w-full min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Configurar publicidad
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Elige el tono y estilo para generar opciones con IA
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tone selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Tono</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => promo.setTone(t.value)}
                        className={`cursor-pointer flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all duration-200 hover:border-primary/50 ${
                          promo.tone === t.value
                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          promo.tone === t.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {t.icon}
                        </div>
                        <span className="text-xs font-medium">{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Estilo visual</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STYLE_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => promo.setStyle(s.value)}
                        className={`cursor-pointer flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all duration-200 hover:border-primary/50 ${
                          promo.style === s.value
                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-full ${s.color}`} />
                        <span className="text-xs font-medium">{s.label}</span>
                        <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={promo.generate}
                  disabled={promo.isGenerating}
                  className="w-full gap-2 cursor-pointer sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  Generar 3 opciones con IA
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Generating skeleton */}
          {currentStep === 'generating' && (
            <div className="space-y-4 animate-step-fade-in">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando opciones publicitarias...
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Card
                    key={i}
                    className="animate-pulse overflow-hidden"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="aspect-square bg-muted" />
                    <CardContent className="space-y-3 p-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <div className="flex gap-1">
                        <Skeleton className="h-4 w-12 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-10 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step: Review (3 cards) */}
          {(currentStep === 'review' || currentStep === 'actions') && promo.result && (
            <div className="space-y-4 animate-step-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {currentStep === 'review' ? 'Elige una opción' : 'Opción seleccionada'}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={promo.generate}
                  disabled={promo.isGenerating}
                  className="cursor-pointer gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerar
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {promo.result.variations.map((variation, i) => (
                  <div
                    key={i}
                    className="animate-step-fade-in"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <AdOptionCard
                      variation={variation}
                      imageUrl={promo.result!.imageUrls[0]}
                      index={i}
                      isSelected={promo.selectedIndex === i}
                      onSelect={() => promo.setSelectedIndex(i)}
                    />
                  </div>
                ))}
              </div>

              {/* Actions bar (visible when a card is selected) */}
              {promo.selectedIndex !== null && promo.selectedVariation && (
                <div className="animate-step-fade-in space-y-4 border-t pt-4">
                  {/* Selected info + buttons */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Opción {promo.selectedIndex + 1} seleccionada
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={promo.copyToClipboard}
                        className="cursor-pointer gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar texto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promo.setShowEditor(true)}
                        className="cursor-pointer gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar diseño
                      </Button>
                    </div>
                  </div>

                  {/* Network selector + publish */}
                  <div className="space-y-3 border-t pt-3">
                    <NetworkSelector
                      selectedNetworks={promo.selectedNetworks}
                      onToggle={promo.toggleNetwork}
                      socialAccounts={promo.socialAccounts}
                      onManageAccounts={() => setShowConnectDialog(true)}
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={promo.selectedNetworks.length === 0 || promo.isPublishing}
                        onClick={promo.publish}
                        className="cursor-pointer gap-1.5"
                      >
                        {promo.isPublishing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {promo.isPublishing ? 'Publicando...' : 'Publicar ahora'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        onClick={() => {
                          toast.success('Publicidad guardada como borrador')
                        }}
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        Guardar borrador
                      </Button>
                    </div>

                    {/* Publish results */}
                    {promo.publishResult && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(promo.publishResult).map(([network, res]) => (
                          <Badge
                            key={network}
                            variant={res.status === 'success' ? 'default' : 'destructive'}
                            className="gap-1 text-xs"
                          >
                            {res.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {network}: {res.status === 'success' ? 'Publicado' : res.error}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connect accounts dialog */}
      <ConnectAccountDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        onAccountsChanged={promo.setSocialAccounts}
      />

      {/* Full editor overlay */}
      {promo.showEditor && promo.result && promo.selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4">
          <AdEditor
            productImageUrl={resolveImageUrl(promo.result.imageUrls[0])}
            adTitle={promo.result.variations[promo.selectedIndex]?.title}
            adPrice={`S/ ${promo.result.variations[promo.selectedIndex]?.cta || ''}`}
            adCta={promo.result.variations[promo.selectedIndex]?.cta}
            onClose={() => promo.setShowEditor(false)}
            onSave={() => {
              promo.setShowEditor(false)
              toast.success('Diseño guardado')
            }}
            onRegenerate={async () => {
              const data = await generateAdsFromProduct(product.id, promo.tone, promo.style)
              const v = data.variations[0]
              return v
                ? { title: v.title, price: `S/ ${v.cta || ''}`, cta: v.cta, imageUrl: data.imageUrls[0] }
                : null
            }}
          />
        </div>
      )}
    </div>
  )
}
