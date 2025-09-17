'use client'

import {
  pdf,
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  StyleSheet,
  Svg,
  Path,
  Rect
} from '@react-pdf/renderer'
import { brandAssets } from '@/catalog/brandAssets'
import { getBrands, getKeywords } from '../brands/brands.api'
import { resolveImageUrl } from '@/lib/images'

interface Product {
  id: number
  name: string
  description?: string
  price?: number
  priceSell?: number
  image?: string
  imageUrl?: string
  images?: string[]
  brand?: {
    name: string
    logoSvg?: string
    logoPng?: string
  } | null
  category?: {
    id?: number
    name: string
  }
  specification?: {
    processor?: string
    ram?: string
    storage?: string
    graphics?: string
    screen?: string
    resolution?: string
    refreshRate?: string
    connectivity?: string
  }
}

interface CatalogPdfItem {
  title: string
  description?: string
  price?: string
  imageUrl?: string
  logos?: string[]
  specs?: CatalogPdfSpec[]
}

interface CatalogSection {
  category: string
  items: CatalogPdfItem[]
}

type SpecKey = keyof NonNullable<Product['specification']>

interface CatalogPdfSpec {
  key: SpecKey
  label: string
  value: string
}

function getLogos(p: Product, brandMap: Record<string, string>): string[] {
  const logos = new Set<string>()

  // Primary brand
  const brandKey = p.brand?.name?.toLowerCase()
  const brandLogo =
    resolveImageUrl(p.brand?.logoSvg || p.brand?.logoPng) ||
    brandAssets.brands[brandKey ?? '']
  if (brandLogo) logos.add(brandLogo)

  const haystack = `${p.name} ${p.description ?? ''}`.toLowerCase()

  // Additional brands detected from keywords
  for (const [keyword, logoPath] of Object.entries(brandMap)) {
    if (keyword === brandKey) continue
    if (haystack.includes(keyword)) {
      logos.add(logoPath)
    }
  }

  // CPU brand detection using backend brands
  const processor = p.specification?.processor?.toLowerCase() || ''
  for (const [key, brandKey] of Object.entries(brandAssets.cpus)) {
    if (processor.includes(key)) {
      const logoUrl = brandMap[brandKey]
      if (logoUrl) logos.add(logoUrl)
      break
    }
  }

  // GPU brand detection using backend brands
  const graphics = p.specification?.graphics?.toLowerCase() || ''
  for (const [key, brandKey] of Object.entries(brandAssets.gpus)) {
    if (graphics.includes(key)) {
      const logoUrl = brandMap[brandKey]
      if (logoUrl) logos.add(logoUrl)
      break
    }
  }

  return Array.from(logos)
}

function formatPrice(value: number): string {
  return `S/. ${value.toLocaleString('en-US')}`
}

const LOGO_DISPLAY_SIZE = 25
const LOGO_RASTER_SCALE = 4
const IMAGE_OVERLAY_COLOR = '#145DA0'
const TECH_LABEL = 'TECNOLOGIA INFORMATICA'

const SPEC_CONFIG: Array<{ key: SpecKey; label: string }> = [
  { key: 'processor', label: 'Procesador' },
  { key: 'ram', label: 'Memoria' },
  { key: 'storage', label: 'Almacenamiento' },
  { key: 'graphics', label: 'Graficos' },
  { key: 'screen', label: 'Pantalla' },
  { key: 'resolution', label: 'Resolucion' },
  { key: 'refreshRate', label: 'Refresco' },
  { key: 'connectivity', label: 'Conectividad' }
]

function renderSpecIcon(key: SpecKey) {
  const color = IMAGE_OVERLAY_COLOR
  switch (key) {
    case 'processor':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth={1.5} fill="none" />
          <Rect x="9" y="9" width="6" height="6" fill={color} />
        </Svg>
      )
    case 'ram':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Rect x="4" y="8" width="16" height="8" rx="2" stroke={color} strokeWidth={1.5} fill="none" />
          <Rect x="6" y="10" width="2" height="4" fill={color} />
          <Rect x="10" y="10" width="2" height="4" fill={color} />
          <Rect x="14" y="10" width="2" height="4" fill={color} />
          <Rect x="18" y="7" width="2" height="10" fill={color} />
        </Svg>
      )
    case 'storage':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Path d="M6 7c0-1.1 2.2-2 6-2s6 .9 6 2v10c0 1.1-2.2 2-6 2s-6-.9-6-2V7z" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M6 11c0 1.1 2.2 2 6 2s6-.9 6-2" stroke={color} strokeWidth={1.5} fill="none" />
        </Svg>
      )
    case 'graphics':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Rect x="4" y="6" width="16" height="10" rx="2" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M8 16v2" stroke={color} strokeWidth={1.5} />
          <Path d="M16 16v2" stroke={color} strokeWidth={1.5} />
          <Path d="M10 12l2-3 2 3" stroke={color} strokeWidth={1.5} fill="none" />
        </Svg>
      )
    case 'screen':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Rect x="4" y="5" width="16" height="10" rx="1.8" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M10 19h4" stroke={color} strokeWidth={1.5} />
          <Path d="M12 15v4" stroke={color} strokeWidth={1.5} />
        </Svg>
      )
    case 'resolution':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Rect x="5" y="5" width="14" height="14" rx="3" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M12 8v8" stroke={color} strokeWidth={1.5} />
          <Path d="M8 12h8" stroke={color} strokeWidth={1.5} />
        </Svg>
      )
    case 'refreshRate':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Path d="M6 9a6 6 0 0 1 10-3" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M18 15a6 6 0 0 1-10 3" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M14 3h4v4" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M10 21H6v-4" stroke={color} strokeWidth={1.5} fill="none" />
        </Svg>
      )
    case 'connectivity':
      return (
        <Svg style={styles.specIcon} viewBox="0 0 24 24">
          <Path d="M4 9c2.5-2.5 13.5-2.5 16 0" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M7 12c1.8-1.8 8.2-1.8 10 0" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M10 15c.9-.9 3.1-.9 4 0" stroke={color} strokeWidth={1.5} fill="none" />
          <Path d="M12 18h.01" stroke={color} strokeWidth={2} />
        </Svg>
      )
    default:
      return null
  }
}


const styles = StyleSheet.create({
  page: { position: 'relative' },
  pageBackgroundLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pageBackground: { width: '100%', height: '100%', objectFit: 'cover' },
  pageBackgroundOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  pageContent: { position: 'relative', zIndex: 1, flex: 1, padding: 16 },
  coverPageContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 },
  coverLogo: { width: 96, height: 96, marginBottom: 16 },
  coverTechLabel: { fontSize: 12, textAlign: 'center', marginTop: 12, color: '#1f2937', letterSpacing: 1 },
  coverTechLabelOnImage: { color: '#e2e8f0' },
  headerContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerLogo: { width: 56, height: 56, marginBottom: 8 },
  coverTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#0f172a' },
  coverTitleOnImage: { color: '#f8fafc' },
  coverSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 4, color: '#1f2937' },
  coverSubtitleOnImage: { color: '#e2e8f0' },
  coverSelection: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 8, color: '#0f172a', letterSpacing: 0.5 },
  coverSelectionOnImage: { color: '#f8fafc' },
  category: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#0f172a' },
  categoryCover: { color: '#f8fafc' },
  categorySeparator: { width: '100%', height: 4, backgroundColor: '#007bff', marginBottom: 8 },
  categorySeparatorCover: { backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  item: {
    width: '33.33%',
    padding: 8,
    border: '1 solid #cccccc',
    borderRadius: 4,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 8,
    position: 'relative',
    backgroundColor: 'white'
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#f5f7fb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { fontSize: 9, color: '#5a6275' },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  badgeEdge: {
    width: 18,
    height: 22,
    backgroundColor: IMAGE_OVERLAY_COLOR
  },
  badgeEdgeLeft: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  badgeEdgeRight: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  badgeCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    height: 22,
    backgroundColor: IMAGE_OVERLAY_COLOR
  },
  badgeLogo: { width: 14, height: 14, marginRight: 4 },
  badgeText: { fontSize: 8, fontWeight: 'bold', color: 'white' },
  title: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  description: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  price: { fontSize: 10, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
  logos: { flexDirection: 'row', marginTop: 4 },
  logo: { width: LOGO_DISPLAY_SIZE, height: LOGO_DISPLAY_SIZE, marginRight: 6 },
  specList: { alignSelf: 'stretch', marginTop: 6 },
  specRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  specIcon: { width: 14, height: 14, marginRight: 4 },
  specText: { fontSize: 9, color: '#1a1a1a', flexShrink: 1 },
  specLabel: { fontWeight: 'bold' },
  companyLogo: { position: 'absolute', top: 4, right: 4, width: 24, height: 24 }
})

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function CatalogPdfDocument({
  sections,
  coverImage,
  title,
  subtitle,
  selectionSummary,
}: {
  sections: CatalogSection[]
  coverImage?: string
  title: string
  subtitle: string
  selectionSummary?: string
}) {
  const ITEMS_PER_PAGE = 9
  const pages: { category: string; items: CatalogPdfItem[] }[] = []

  for (const section of sections) {
    const groups = chunk(section.items, ITEMS_PER_PAGE)
    for (const items of groups) {
      pages.push({ category: section.category, items })
    }
  }

  return (
    <Document>
      <Page key="cover" size="A4" style={styles.page}>
        {coverImage && (
          <View style={styles.pageBackgroundLayer}>
            <PdfImage style={styles.pageBackground} src={coverImage} />
            <View style={styles.pageBackgroundOverlay} />
          </View>
        )}
        <View style={[styles.pageContent, styles.coverPageContent]}>
          <PdfImage style={styles.coverLogo} src='/ti_logo_final_2024.png' />
          <Text
            style={[
              styles.coverTitle,
              ...(coverImage ? [styles.coverTitleOnImage] : []),
            ]}
          >
            {title}
          </Text>
          {selectionSummary && (
            <Text
              style={[
                styles.coverSelection,
                ...(coverImage ? [styles.coverSelectionOnImage] : []),
              ]}
            >
              {selectionSummary}
            </Text>
          )}
          <Text
            style={[
              styles.coverSubtitle,
              ...(coverImage ? [styles.coverSubtitleOnImage] : []),
            ]}
          >
            {subtitle}
          </Text>
          <Text
            style={[
              styles.coverTechLabel,
              ...(coverImage ? [styles.coverTechLabelOnImage] : []),
            ]}
          >
            {TECH_LABEL}
          </Text>
        </View>
      </Page>
      {pages.map((page, index) => (
        <Page key={`page-${index}`} size="A4" style={styles.page}>
          <View style={styles.pageContent}>
            <Text style={styles.category}>{page.category}</Text>
            <View style={styles.categorySeparator} />
            <View style={styles.grid}>
              {page.items.map((item, idx) => (
                <View key={idx} style={styles.item}>
                  <PdfImage style={styles.companyLogo} src='/ti_logo_final_2024.png' />
                  <View style={styles.imageWrapper}>
                    {item.imageUrl ? (
                      <PdfImage style={styles.image} src={item.imageUrl} />
                    ) : (
                      <Text style={styles.imagePlaceholder}>Imagen no disponible</Text>
                    )}
                  </View>
                  <View style={styles.imageBadge}>
                    <View style={[styles.badgeEdge, styles.badgeEdgeLeft]} />
                    <View style={styles.badgeCenter}>
                      <PdfImage style={styles.badgeLogo} src='/ti_logo_final_2024.png' />
                      <Text style={styles.badgeText}>{TECH_LABEL}</Text>
                    </View>
                    <View style={[styles.badgeEdge, styles.badgeEdgeRight]} />
                  </View>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.description}>{item.description}</Text>
                  )}
                  {item.price && <Text style={styles.price}>{item.price}</Text>}
                  {item.specs && item.specs.length > 0 && (
                    <View style={styles.specList}>
                      {item.specs.map((spec, specIdx) => (
                        <View key={specIdx} style={styles.specRow}>
                          {renderSpecIcon(spec.key)}
                          <Text style={styles.specText}>
                            <Text style={styles.specLabel}>{spec.label}: </Text>
                            {spec.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.logos && item.logos.length > 0 && (
                    <View style={styles.logos}>
                      {item.logos.map((logo, id) => (
                        <PdfImage key={id} style={styles.logo} src={logo} />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}

async function svgToPngDataUrl(src: string, size = LOGO_DISPLAY_SIZE): Promise<string> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.status}`)
  }
  const svgText = await response.text()
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.src = url
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  const canvas = document.createElement('canvas')
  const deviceScale =
    typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
      ? window.devicePixelRatio
      : 1
  const scale = Math.max(deviceScale, LOGO_RASTER_SCALE)
  const targetSize = Math.round(size * scale)
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(url)
    throw new Error('Canvas context not available')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, targetSize, targetSize)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/png')
}

async function normalizeLogo(src: string): Promise<string | null> {
  if (src.endsWith('.svg')) {
    try {
      return await svgToPngDataUrl(src)
    } catch {
      return null
    }
  }
  try {
    const response = await fetch(src)
    return response.ok ? src : null
  } catch {
    return null
  }
}

export async function generateCatalogPdf(
  products: Product[],
  coverImageUrl?: string
): Promise<Blob> {
  const [{ data }, keywordRes] = await Promise.all([
    getBrands(1, 1000),
    getKeywords(),
  ])

  const brandMap: Record<string, string> = {}
  for (const b of data) {
    const logo = b.logoSvg || b.logoPng
    if (logo) {
      brandMap[b.name.toLowerCase()] = resolveImageUrl(logo)
    }
  }

  for (const k of keywordRes?.data || []) {
    const keyword = k.keyword?.toLowerCase()
    const brandName = k.brand?.name?.toLowerCase()
    const logo = brandName ? brandMap[brandName] : undefined
    if (keyword && logo) {
      brandMap[keyword] = logo
    }
  }

  const grouped: Record<string, CatalogPdfItem[]> = {}

  for (const p of products) {
    const priceValue = p.priceSell ?? p.price
    const raw = p.imageUrl ?? p.image ?? p.images?.[0]
    const img = resolveImageUrl(raw)
    const proxied = img ? `/api/image?url=${encodeURIComponent(img)}` : undefined

    const logos = (
      await Promise.all(getLogos(p, brandMap).map(normalizeLogo))
    ).filter(Boolean) as string[]

    const specs: CatalogPdfSpec[] = []
    if (p.specification) {
      for (const { key, label } of SPEC_CONFIG) {
        const rawValue = p.specification[key]
        if (rawValue) {
          const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue)
          if (value.length > 0) {
            specs.push({ key, label, value })
          }
        }
      }
    }

    const item: CatalogPdfItem = {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? formatPrice(priceValue) : undefined,
      imageUrl: proxied,
      logos,
      specs: specs.length > 0 ? specs : undefined,
    }

    const catName = p.category?.name || 'Sin categoria'
    grouped[catName] = grouped[catName] ? [...grouped[catName], item] : [item]
  }

  const sections: CatalogSection[] = Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((cat) => ({
      category: cat,
      items: grouped[cat].sort((a, b) => a.title.localeCompare(b.title)),
    }))

  let coverSrc: string | undefined
  if (coverImageUrl) {
    if (coverImageUrl.startsWith('data:')) {
      coverSrc = coverImageUrl
    } else {
      const normalized = resolveImageUrl(coverImageUrl)
      coverSrc = normalized
        ? `/api/image?url=${encodeURIComponent(normalized)}`
        : undefined
    }
  }

  const categories = sections.map((s) => s.category)
  const catalogSubject =
    categories.length === 1
      ? categories[0]
      : categories.length > 1
        ? categories.join(', ')
        : 'productos'
  const selectionSummary =
    categories.length > 0
      ? categories.map((name) => name.toUpperCase()).join(' • ')
      : undefined
  const printedDate = new Date().toLocaleDateString()
  const title = `Catalogo de ${catalogSubject}`
  const subtitle = `Fecha: ${printedDate}`

  const document = (
    <CatalogPdfDocument
      sections={sections}
      coverImage={coverSrc}
      title={title}
      subtitle={subtitle}
      selectionSummary={selectionSummary}
    />
  )

  const blob = await pdf(document).toBlob()
  return blob
}












