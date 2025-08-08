import { Product, ProductSpecification, ProductFeature } from '@prisma/client'

export type ProductSpecInput = Omit<
  ProductSpecification,
  'id' | 'productId' | 'createdAt' | 'updatedAt'
>

export type ProductFeatureInput = Omit<
  ProductFeature,
  'id' | 'productId' | 'createdAt' | 'updatedAt'
>

export type CreateProductDto = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'specification' | 'brandName'
> & {
  specification?: ProductSpecInput
  features?: ProductFeatureInput[]
  images?: string[]
}