'use client'

import {
  pdf,
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  StyleSheet
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
    graphics?: string
  }
}

interface CatalogPdfItem {
  title: string
  description?: string
  price?: string
  imageUrl?: string
  logos?: string[]
}

interface CatalogSection {
  category: string
  items: CatalogPdfItem[]
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

const styles = StyleSheet.create({
  page: { padding: 16 },
  titlePage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
  },
  titleText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
  },
  category: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  categorySeparator: {
    width: '100%',
    height: 4,
    backgroundColor: '#007bff',
    marginBottom: 8,
  },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  item: {
    width: '33.33%',
    padding: 8,
    border: '1 solid #cccccc',
    borderRadius: 4,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 8,
    position: 'relative'
  },
  image: { width: '100%', height: 120, objectFit: 'cover', marginBottom: 4 },
  title: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  description: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  price: { fontSize: 10, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
  logos: { flexDirection: 'row', marginTop: 4 },
  logo: { width: 40, height: 40, marginRight: 4 },
  companyLogo: { position: 'absolute', top: 4, right: 4, width: 24, height: 24 }
})

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function CatalogPdfDocument({ sections }: { sections: CatalogSection[] }) {
  const ITEMS_PER_PAGE = 9
  const pages: { category: string; items: CatalogPdfItem[] }[] = []

  for (const section of sections) {
    const groups = chunk(section.items, ITEMS_PER_PAGE)
    for (const items of groups) {
      pages.push({ category: section.category, items })
    }
  }

  const categoriesList = sections.map((s) => s.category).join(', ')
  const title = `CATALOGO DE ${categoriesList} de TECNOLOGIA INFORMATICA de la fecha ${new Date().toLocaleDateString()}`

  return (
    <Document>
      <Page size="A4" style={styles.titlePage}>
        <Text style={styles.titleText}>{title}</Text>
      </Page>
      {pages.map((page, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <Text style={styles.category}>{page.category}</Text>
          <View style={styles.categorySeparator} />
          <View style={styles.grid}>
            {page.items.map((item, idx) => (
              <View key={idx} style={styles.item}>
                <PdfImage style={styles.companyLogo} src='/ti_logo_final_2024.png' />
                {item.imageUrl && <PdfImage style={styles.image} src={item.imageUrl} />}
                <Text style={styles.title}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.description}>{item.description}</Text>
                )}
                {item.price && <Text style={styles.price}>{item.price}</Text>}
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
        </Page>
      ))}
    </Document>
  )
}

async function svgToPngDataUrl(src: string, size = 24): Promise<string> {
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
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, 0, 0, size, size)
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

export async function generateCatalogPdf(products: Product[]): Promise<Blob> {
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
    const item: CatalogPdfItem = {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? formatPrice(priceValue) : undefined,
      imageUrl: proxied,
      logos
    }

    const catName = p.category?.name || 'Sin categoría'
    grouped[catName] = grouped[catName] ? [...grouped[catName], item] : [item]
  }

  const sections: CatalogSection[] = Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((cat) => ({
      category: cat,
      items: grouped[cat].sort((a, b) => a.title.localeCompare(b.title))
    }))

  const blob = await pdf(<CatalogPdfDocument sections={sections} />).toBlob()
  return blob
}
