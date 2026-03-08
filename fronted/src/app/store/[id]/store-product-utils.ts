import { resolveImageUrl } from "@/lib/images"

export interface ProductSpecs {
  processor: string
  ram: string
  storage: string
  graphics: string
  screen: string
  resolution: string
  refreshRate: string
  connectivity: string
}

export interface ProductPricing {
  price: number
  originalPrice: number
  discountPercentage: number
  specs: ProductSpecs
}

export function resolveProductImages(product: any): string[] {
  const baseImages: string[] =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ["/placeholder.svg?height=600&width=600"]

  return baseImages.map((image) => {
    const resolved = resolveImageUrl(image)
    return resolved && resolved.trim() !== ""
      ? resolved
      : "/placeholder.svg?height=600&width=600"
  })
}

export function calculatePricing(product: any): ProductPricing {
  const price = product?.priceSell ?? product?.price ?? 0
  const originalPrice = +(price * 1.2).toFixed(2)

  const specs: ProductSpecs = {
    processor: product?.specification?.processor ?? "",
    ram: product?.specification?.ram ?? "",
    storage: product?.specification?.storage ?? "",
    graphics: product?.specification?.graphics ?? "",
    screen: product?.specification?.screen ?? "",
    resolution: product?.specification?.resolution ?? "",
    refreshRate: product?.specification?.refreshRate ?? "",
    connectivity: product?.specification?.connectivity ?? "",
  }

  const discountPercentage =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0

  return { price, originalPrice, discountPercentage, specs }
}

export function hasAnySpecs(specs: ProductSpecs): boolean {
  return Object.values(specs).some((v) => v && v.toString().trim() !== "")
}

export function getProductCartItem(product: any, quantity?: number) {
  return {
    id: product.id,
    name: product.name,
    price: product.priceSell ?? product.price,
    image:
      product.images && product.images.length > 0
        ? resolveImageUrl(product.images[0])
        : resolveImageUrl(product.image),
    quantity: quantity ?? 1,
  }
}
