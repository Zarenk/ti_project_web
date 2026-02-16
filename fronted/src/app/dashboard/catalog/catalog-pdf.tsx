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

export type CatalogLayoutMode = 'grid' | 'list'

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
  previousPrice?: string
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

function computePreviousPrice(value: number, seedSource: number | undefined): number {
  const seed = Math.abs(Math.sin((seedSource ?? value) || 1))
  const upliftPercent = 0.05 + seed * 0.05
  return Math.max(value, Math.round(value * (1 + upliftPercent)))
}

const LOGO_DISPLAY_SIZE = 25
const LOGO_RASTER_SCALE = 4
const IMAGE_OVERLAY_COLOR = '#145DA0'
const TECH_LABEL = 'TECNOLOGIA INFORMATICA'
const COMPANY_LOGO_PATH = '/ti_logo_final_2024.png'

const svgRasterCache = new Map<string, string>()
const rasterLogoCache = new Map<string, string>()

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
  page: { position: 'relative', padding: 16 },
  pageFrame: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    border: '1.5 solid #1d4ed8',
    borderRadius: 12
  },
  pageAccentTop: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 20,
    height: 4,
    backgroundColor: '#38bdf8',
    borderRadius: 999
  },
  pageAccentBottom: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 20,
    height: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.5)',
    borderRadius: 999
  },
  coverWithImage: { flex: 1, width: '100%', alignItems: 'center', paddingBottom: 24 },
  coverImageRegion: { width: '100%', height: 560 },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
  coverTextRegion: { width: '100%', alignItems: 'center', gap: 2, paddingTop: 4, paddingBottom: 12 },
  pageBackgroundLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pageBackground: { width: '100%', height: '100%', objectFit: 'cover' },
  pageContent: { position: 'relative', zIndex: 1, flex: 1, padding: 16 },
  coverPageContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 },
  coverPageContentPlain: { paddingTop: 0, paddingBottom: 0 },
  coverHeading: { width: '100%', alignItems: 'center' },
  coverLogo: { width: 96, height: 96, marginBottom: 16 },
  coverTextBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  coverTextBoxFirst: { marginTop: 0 },
  coverTextBoxOnImage: { backgroundColor: 'rgba(15, 23, 42, 0.78)' },
  coverTextBoxPlain: { backgroundColor: '#e2e8f0' },
  coverTextBoxMinimal: { backgroundColor: 'transparent', paddingVertical: 4, paddingHorizontal: 0 },
  coverTextLayer: { position: 'relative', alignSelf: 'stretch' },
  coverTitleShadow: { position: 'absolute', top: 1, left: 0, right: 0, fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: 'rgba(148, 163, 184, 0.5)' },
  coverTitleShadowOnImage: { color: 'rgba(15, 23, 42, 0.65)' },
  coverSelectionShadow: { position: 'absolute', top: 1, left: 0, right: 0, fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: 'rgba(148, 163, 184, 0.45)' },
  coverSelectionShadowOnImage: { color: 'rgba(15, 23, 42, 0.55)' },
  coverSubtitleShadow: { position: 'absolute', top: 1, left: 0, right: 0, fontSize: 12, textAlign: 'center', color: 'rgba(148, 163, 184, 0.4)' },
  coverSubtitleShadowOnImage: { color: 'rgba(15, 23, 42, 0.5)' },
  coverTechLabel: { fontSize: 12, textAlign: 'center', color: '#1f2937', letterSpacing: 1 },
  coverTechLabelOnImage: { color: '#f8fafc' },
  coverPlainContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverPlainContent: { alignItems: 'center', gap: 4 },
  coverPlainLogo: { width: 80, height: 80, marginBottom: 6 },
  coverPlainTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5, color: '#0f172a', textAlign: 'center' },
  coverPlainSelection: { fontSize: 11, letterSpacing: 1, color: '#1f2937', textTransform: 'uppercase', textAlign: 'center' },
  coverPlainSubtitle: { fontSize: 10, color: '#1f2937', textAlign: 'center' },
  coverPlainTech: { fontSize: 10, letterSpacing: 1.5, color: '#475569', textAlign: 'center' },
  headerContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerLogo: { width: 56, height: 56, marginBottom: 8 },
  coverTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#0f172a' },
  coverTitleOnImage: { color: '#f8fafc' },
  coverSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 0, color: '#1f2937' },
  coverSubtitleOnImage: { color: '#e2e8f0' },
  coverSelection: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 0, color: '#0f172a', letterSpacing: 0.5 },
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
  listContainer: { display: 'flex', flexDirection: 'column', gap: 14, paddingHorizontal: 12 },
  listItem: {
    flexDirection: 'row',
    border: '1.5 solid #cbd5f5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 0,
    gap: 12,
    backgroundColor: '#fff',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1e293b',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  listItemDivider: { position: 'absolute', top: 0, left: 0, right: 0, borderTop: '3 solid #38bdf8' },
  listImageWrapper: {
    width: 120,
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listImage: { width: '100%', height: '100%', objectFit: 'contain' },
  listBody: { flex: 1, gap: 4 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  listCompanyLogo: { width: 24, height: 24 },
  listDescription: { fontSize: 10, color: '#475569' },
  listSpecList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  listSpecRow: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  listSpecText: { fontSize: 9, color: '#1f2937', flexShrink: 1 },
  listSpecLabel: { fontWeight: 'bold' },
  listPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  listPriceLabel: { fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'uppercase' },
  listPriceValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  listLogos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  listLogo: { width: 32, height: 32, objectFit: 'contain' },
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
  companyLogo: { position: 'absolute', top: 4, right: 4, width: 24, height: 24 },
  priceBlock: { marginTop: 6, alignItems: 'center', justifyContent: 'center', display: 'flex' },
  priceBefore: {
    fontSize: 9,
    color: '#94a3b8',
    textDecoration: 'line-through',
    textTransform: 'uppercase'
  },
  listPriceBefore: {
    fontSize: 10,
    color: '#94a3b8',
    textDecoration: 'line-through',
    marginRight: 6
  }
})

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function estimateItemComplexity(item: CatalogPdfItem): number {
  const descWeight = item.description ? Math.min(item.description.length / 180, 1.2) : 0
  const specWeight = item.specs ? Math.min(item.specs.length * 0.12, 0.9) : 0
  return 1 + descWeight + specWeight
}

const GRID_COLUMNS = 3
const GRID_MAX_ITEMS = 6
const LIST_MAX_ITEMS = 3

function paginateGridItems(items: CatalogPdfItem[]): CatalogPdfItem[][] {
  if (items.length <= GRID_MAX_ITEMS) {
    return [items]
  }

  const rows = chunk(items, GRID_COLUMNS)
  const pages: CatalogPdfItem[][] = []
  let current: CatalogPdfItem[] = []
  let rowUnits = 0

  for (const row of rows) {
    const rowComplexity = Math.max(...row.map(estimateItemComplexity))
    const requiredUnits = rowComplexity > 1.5 ? 1.2 : 1
    const wouldOverflow = current.length > 0 && (rowUnits + requiredUnits > 2 || current.length + row.length > GRID_MAX_ITEMS)
    if (wouldOverflow) {
      pages.push(current)
      current = []
      rowUnits = 0
    }
    current.push(...row)
    rowUnits += requiredUnits
  }

  if (current.length) {
    pages.push(current)
  }

  // Fallback guard: ensure no page exceeds the hard limit
  return pages.flatMap((page) =>
    page.length > GRID_MAX_ITEMS ? chunk(page, GRID_MAX_ITEMS) : [page]
  )
}

function paginateListItems(items: CatalogPdfItem[]): CatalogPdfItem[][] {
  return chunk(items, LIST_MAX_ITEMS)
}

function paginateSectionItems(items: CatalogPdfItem[], layout: CatalogLayoutMode): CatalogPdfItem[][] {
  if (layout === 'grid') {
    const result = paginateGridItems(items)
    return result.length ? result : chunk(items, GRID_MAX_ITEMS)
  }
  const result = paginateListItems(items)
  return result.length ? result : chunk(items, LIST_MAX_ITEMS)
}

function CatalogPdfDocument({
  sections,
  coverImage,
  title,
  subtitle,
  selectionSummary,
  companyLogo,
  layout,
}: {
  sections: CatalogSection[]
  coverImage?: string
  title: string
  subtitle: string
  selectionSummary?: string
  companyLogo: string
  layout: CatalogLayoutMode
}) {
  const pages: { category: string; items: CatalogPdfItem[] }[] = []

  for (const section of sections) {
    const groups = paginateSectionItems(section.items, layout)
    for (const items of groups) {
      pages.push({ category: section.category, items })
    }
  }

  return (
    <Document>
      <Page key="cover" size="A4" style={styles.page}>
        <View style={styles.pageFrame} fixed />
        <View style={styles.pageAccentTop} fixed />
        <View style={styles.pageAccentBottom} fixed />
        {coverImage ? (
          <View style={styles.coverWithImage}>
            <View style={styles.coverImageRegion}>
              <PdfImage style={styles.coverImage} src={coverImage} />
            </View>
            <View style={styles.coverTextRegion}>
              <PdfImage style={styles.coverPlainLogo} src={companyLogo} />
              <Text style={styles.coverPlainTitle}>{title.toUpperCase()}</Text>
              {selectionSummary && (
                <Text style={styles.coverPlainSelection}>
                  {selectionSummary}
                </Text>
              )}
              <Text style={styles.coverPlainSubtitle}>{subtitle}</Text>
              <Text style={styles.coverPlainTech}>{TECH_LABEL}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.coverPlainContainer}>
            <PdfImage style={styles.coverPlainLogo} src={companyLogo} />
            <Text style={styles.coverPlainTitle}>{title.toUpperCase()}</Text>
            {selectionSummary && (
              <Text style={styles.coverPlainSelection}>
                {selectionSummary}
              </Text>
            )}
            <Text style={styles.coverPlainSubtitle}>{subtitle}</Text>
            <Text style={styles.coverPlainTech}>{TECH_LABEL}</Text>
          </View>
        )}
      </Page>
      {pages.map((page, index) => (
        <Page key={`page-${index}`} size="A4" style={styles.page}>
          <View style={styles.pageFrame} fixed />
          <View style={styles.pageAccentTop} fixed />
          <View style={styles.pageAccentBottom} fixed />
          <View style={styles.pageContent}>
            <Text style={styles.category}>{page.category}</Text>
            <View style={styles.categorySeparator} />
            <View style={layout === 'grid' ? styles.grid : styles.listContainer}>
              {page.items.map((item, idx) =>
                layout === 'grid' ? (
                  <GridItem key={idx} item={item} companyLogo={companyLogo} />
                ) : (
                  <ListItem key={idx} item={item} companyLogo={companyLogo} />
                )
              )}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}

function GridItem({ item, companyLogo }: { item: CatalogPdfItem; companyLogo: string }) {
  return (
    <View style={styles.item}>
      <PdfImage style={styles.companyLogo} src={companyLogo} />
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
          <PdfImage style={styles.badgeLogo} src={companyLogo} />
          <Text style={styles.badgeText}>{TECH_LABEL}</Text>
        </View>
        <View style={[styles.badgeEdge, styles.badgeEdgeRight]} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.description && <Text style={styles.description}>{item.description}</Text>}
      {(item.price || item.previousPrice) && (
        <View style={styles.priceBlock}>
          {item.previousPrice && (
            <Text style={styles.priceBefore}>
              Antes {item.previousPrice}
            </Text>
          )}
          {item.price && <Text style={styles.price}>{item.price}</Text>}
        </View>
      )}
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
  )
}

function ListItem({ item, companyLogo }: { item: CatalogPdfItem; companyLogo: string }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listItemDivider} />
      <View style={styles.listImageWrapper}>
        {item.imageUrl ? (
          <PdfImage style={styles.listImage} src={item.imageUrl} />
        ) : (
          <Text style={styles.imagePlaceholder}>Imagen no disponible</Text>
        )}
      </View>
      <View style={styles.listBody}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <PdfImage style={styles.listCompanyLogo} src={companyLogo} />
        </View>
        {item.description && (
          <Text style={styles.listDescription}>{item.description}</Text>
        )}
        {item.specs && item.specs.length > 0 && (
          <View style={styles.listSpecList}>
            {item.specs.slice(0, 6).map((spec, idx) => (
              <View key={idx} style={styles.listSpecRow}>
                {renderSpecIcon(spec.key)}
                <Text style={styles.listSpecText}>
                  <Text style={styles.listSpecLabel}>{spec.label}: </Text>
                  {spec.value}
                </Text>
              </View>
            ))}
          </View>
        )}
        {(item.price || item.previousPrice) && (
          <View style={styles.listPriceRow}>
            {item.previousPrice && (
              <Text style={styles.listPriceBefore}>
                Antes {item.previousPrice}
              </Text>
            )}
            {item.price && <Text style={styles.listPriceValue}>{item.price}</Text>}
          </View>
        )}
        {item.logos && item.logos.length > 0 && (
          <View style={styles.listLogos}>
            {item.logos.map((logo, id) => (
              <PdfImage key={id} style={styles.listLogo} src={logo} />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

async function svgToPngDataUrl(src: string, size = LOGO_DISPLAY_SIZE): Promise<string> {
  const cacheKey = `${src}@${size}`
  if (svgRasterCache.has(cacheKey)) {
    return svgRasterCache.get(cacheKey) as string
  }
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
  const dataUrl = canvas.toDataURL('image/png')
  svgRasterCache.set(cacheKey, dataUrl)
  return dataUrl
}

async function rasterImageToDataUrl(src: string): Promise<string | null> {
  if (src.startsWith('data:')) {
    return src
  }

  if (rasterLogoCache.has(src)) {
    return rasterLogoCache.get(src) as string
  }

  try {
    const response = await fetch(src)
    if (!response.ok) {
      return null
    }
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Unable to convert image to data URL'))
      reader.readAsDataURL(blob)
    })
    rasterLogoCache.set(src, dataUrl)
    return dataUrl
  } catch {
    return null
  }
}

function resolveLogoSource(src: string): string {
  if (src.startsWith('data:')) return src
  if (src.startsWith('/api/image?url=')) return src
  if (src.startsWith('http')) {
    return `/api/image?url=${encodeURIComponent(src)}`
  }
  return src
}

async function normalizeLogo(src?: string): Promise<string | null> {
  if (!src) return null
  const resolved = resolveLogoSource(src)
  const lower = resolved.toLowerCase()
  if (/\.svg($|\?)/.test(lower)) {
    try {
      return await svgToPngDataUrl(resolved)
    } catch {
      return null
    }
  }
  return rasterImageToDataUrl(resolved)
}

export async function generateCatalogPdf(
  products: Product[],
  coverImageUrl?: string,
  layout: CatalogLayoutMode = 'grid',
  companyLogoOverride?: string,
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

  const resolvedCompanyLogo = companyLogoOverride
    ? resolveImageUrl(companyLogoOverride) ?? companyLogoOverride
    : COMPANY_LOGO_PATH
  const companyLogo =
    (await normalizeLogo(resolvedCompanyLogo)) ?? resolvedCompanyLogo

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

    const previousValue =
      typeof (p as any).previousPriceOverride === 'number'
        ? (p as any).previousPriceOverride
        : typeof priceValue === 'number'
          ? computePreviousPrice(priceValue, p.id)
          : undefined

    const item: CatalogPdfItem = {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? formatPrice(priceValue) : undefined,
      previousPrice: typeof previousValue === 'number' ? formatPrice(previousValue) : undefined,
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
      if (normalized) {
        coverSrc = (await rasterImageToDataUrl(normalized)) ?? normalized
      }
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
      companyLogo={companyLogo}
      layout={layout}
    />
  )

  const blob = await pdf(document).toBlob()
  return blob
}











