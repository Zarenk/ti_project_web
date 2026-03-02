'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  generateAdsFromProduct,
  getAdGenerations,
  getSocialAccounts,
  publishAd,
  selectAdVariation,
  type AdGenerationResult,
  type AdGeneration,
  type AdTone,
  type AdStyle,
  type AdCopyVariation,
  type SocialAccount,
  type SocialPlatform,
  type PublishResult,
} from '../../ads.api'

interface UseAdPromotionOptions {
  productId: number
}

export function useAdPromotion({ productId }: UseAdPromotionOptions) {
  // Configuration
  const [tone, setTone] = useState<AdTone>('profesional')
  const [style, setStyle] = useState<AdStyle>('moderno')

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<AdGenerationResult | null>(null)

  // Selection
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Editor
  const [showEditor, setShowEditor] = useState(false)

  // Publishing
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [selectedNetworks, setSelectedNetworks] = useState<SocialPlatform[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)

  // History
  const [previousGenerations, setPreviousGenerations] = useState<AdGeneration[]>([])

  // Load social accounts and previous generations on mount
  useEffect(() => {
    getSocialAccounts().then(setSocialAccounts).catch(() => {})
    getAdGenerations(productId)
      .then(setPreviousGenerations)
      .catch(() => {})
  }, [productId])

  const generate = useCallback(async () => {
    setIsGenerating(true)
    setResult(null)
    setSelectedIndex(null)
    setPublishResult(null)

    try {
      const data = await generateAdsFromProduct(productId, tone, style)
      setResult(data)
      toast.success('Publicidad generada correctamente')
      // Refresh history
      getAdGenerations(productId)
        .then(setPreviousGenerations)
        .catch(() => {})
    } catch (err: any) {
      toast.error(err.message || 'Error al generar publicidad')
    } finally {
      setIsGenerating(false)
    }
  }, [productId, tone, style])

  const handleSelectVariation = useCallback(
    (index: number) => {
      setSelectedIndex(index)
      if (result?.id) {
        selectAdVariation(result.id, index).catch(() => {})
      }
    },
    [result],
  )

  const selectedVariation: AdCopyVariation | null =
    result && selectedIndex !== null ? result.variations[selectedIndex] ?? null : null

  const copyToClipboard = useCallback(() => {
    if (!selectedVariation) return
    const text = `${selectedVariation.title}\n\n${selectedVariation.description}\n\n${selectedVariation.hashtags.join(' ')}\n\n${selectedVariation.cta}`
    navigator.clipboard.writeText(text)
    toast.success('Texto copiado al portapapeles')
  }, [selectedVariation])

  const toggleNetwork = useCallback((platform: SocialPlatform) => {
    setSelectedNetworks((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    )
  }, [])

  const publish = useCallback(async () => {
    if (!result || selectedNetworks.length === 0) return
    setIsPublishing(true)
    setPublishResult(null)

    try {
      const res = await publishAd(result.id, selectedNetworks)
      setPublishResult(res)
      const successes = Object.values(res).filter((r) => r.status === 'success').length
      if (successes > 0) {
        toast.success(`Publicado en ${successes} red(es) correctamente`)
      } else {
        toast.error('No se pudo publicar en ninguna red')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al publicar')
    } finally {
      setIsPublishing(false)
    }
  }, [result, selectedNetworks])

  return {
    // Config
    tone,
    setTone,
    style,
    setStyle,
    // Generation
    isGenerating,
    result,
    generate,
    // Selection
    selectedIndex,
    setSelectedIndex: handleSelectVariation,
    selectedVariation,
    // Clipboard
    copyToClipboard,
    // Editor
    showEditor,
    setShowEditor,
    // Publishing
    socialAccounts,
    setSocialAccounts,
    selectedNetworks,
    toggleNetwork,
    isPublishing,
    publishResult,
    publish,
    // History
    previousGenerations,
  }
}
