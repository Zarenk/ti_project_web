import { Product, ProductSpecification } from '@prisma/client'

export type ProductSpecInput = Omit<
  ProductSpecification,
  'id' | 'productId' | 'createdAt' | 'updatedAt'
>

export type CreateProductDto = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'specification'
> & {
  specification?: ProductSpecInput
  images?: string[]
}