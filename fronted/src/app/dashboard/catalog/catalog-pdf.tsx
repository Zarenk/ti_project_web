'use client'

import { pdf, Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { brandAssets } from '@/catalog/brandAssets'

interface Product {
  id: number
  name: string
  description?: string
  price?: number
  priceSell?: number
  image?: string
  imageUrl?: string
  images?: string[]
  brand?: string
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

function getLogos(p: Product): string[] {
  const logos: string[] = []
  if (p.brand) {
    const brandLogo = brandAssets.brands[p.brand.toLowerCase()]
    if (brandLogo) logos.push(brandLogo)
  }
  const processor = p.specification?.processor?.toLowerCase() || ''
  for (const [key, path] of Object.entries(brandAssets.cpus)) {
    if (processor.includes(key)) {
      logos.push(path)
      break
    }
  }
  const graphics = p.specification?.graphics?.toLowerCase() || ''
  for (const [key, path] of Object.entries(brandAssets.gpus)) {
    if (graphics.includes(key)) {
      logos.push(path)
      break
    }
  }
  return logos
}

const styles = StyleSheet.create({
  page: { padding: 16 },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '33.33%', padding: 8 },
  image: { width: '100%', height: 120, objectFit: 'cover', marginBottom: 4 },
  title: { fontSize: 12, fontWeight: 'bold' },
  description: { fontSize: 10, marginTop: 2 },
  price: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  logos: { flexDirection: 'row', marginTop: 4 },
  logo: { width: 24, height: 24, marginRight: 4 }
})

function CatalogPdfDocument({ items }: { items: CatalogPdfItem[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {items.map((item, index) => (
            <View key={index} style={styles.item}>
              {item.imageUrl && <Image style={styles.image} src={item.imageUrl} />}
              <Text style={styles.title}>{item.title}</Text>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}
              {item.price && <Text style={styles.price}>{item.price}</Text>}
              {item.logos && item.logos.length > 0 && (
                <View style={styles.logos}>
                  {item.logos.map((logo, idx) => (
                    <Image key={idx} style={styles.logo} src={logo} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export async function generateCatalogPdf(products: Product[]): Promise<Blob> {
  const items: CatalogPdfItem[] = products.map((p) => {
    const priceValue = p.priceSell ?? p.price
    return {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? `$${priceValue}` : undefined,
      imageUrl: p.imageUrl ?? p.image ?? p.images?.[0],
      logos: getLogos(p)
    }
  })

  const blob = await pdf(<CatalogPdfDocument items={items} />).toBlob()
  return blob
}
