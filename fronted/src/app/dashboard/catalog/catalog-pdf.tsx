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

function getLogos(p: Product): string[] {
  const logos: string[] = []
  const brandLogo = p.brand?.logoSvg || p.brand?.logoPng
  if (brandLogo) logos.push(brandLogo)

  const cpuMap: Record<string, string> = {
    intel: '/assets/logos/intel.svg',
    core: '/assets/logos/intel.svg',
    amd: '/assets/logos/amd.svg',
    ryzen: '/assets/logos/amd.svg',
  }
  const gpuMap: Record<string, string> = {
    nvidia: '/assets/logos/nvidia.svg',
    geforce: '/assets/logos/nvidia.svg',
    rtx: '/assets/logos/nvidia.svg',
    gtx: '/assets/logos/nvidia.svg',
    amd: '/assets/logos/amd.svg',
    radeon: '/assets/logos/amd.svg',
  }
  const processor = p.specification?.processor?.toLowerCase() || ''
  for (const [key, path] of Object.entries(cpuMap)) {
    if (processor.includes(key)) {
      logos.push(path)
      break
    }
  }
  const graphics = p.specification?.graphics?.toLowerCase() || ''
  for (const [key, path] of Object.entries(gpuMap)) {
    if (graphics.includes(key)) {
      logos.push(path)
      break
    }
  }
  return logos
}

function formatPrice(value: number): string {
  return `S/. ${value.toLocaleString('en-US')}`
}

const styles = StyleSheet.create({
  page: { padding: 16 },
  category: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
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
  logo: { width: 24, height: 24, marginRight: 4 },
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

  return (
    <Document>
      {pages.map((page, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <Text style={styles.category}>{page.category}</Text>
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
  const svgText = await fetch(src).then((r) => r.text())
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.src = url
  await new Promise((resolve) => {
    img.onload = resolve
  })
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, 0, 0, size, size)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/png')
}

async function normalizeLogo(src: string): Promise<string> {
  if (src.endsWith('.svg')) {
    try {
      return await svgToPngDataUrl(src)
    } catch {
      return src
    }
  }
  return src
}

export async function generateCatalogPdf(products: Product[]): Promise<Blob> {
  const grouped: Record<string, CatalogPdfItem[]> = {}

  for (const p of products) {
    const priceValue = p.priceSell ?? p.price
    const imageUrl = p.imageUrl ?? p.image ?? p.images?.[0]
    const proxied = imageUrl
      ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      : undefined

    const logos = await Promise.all(getLogos(p).map(normalizeLogo))
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
