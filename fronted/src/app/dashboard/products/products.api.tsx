import { getAuthHeaders } from '@/utils/auth-token'
import { isProductActive, normalizeProductStatus } from './status.utils'

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const auth = await getAuthHeaders()
  const headers = new Headers(init.headers ?? {})

  for (const [key, value] of Object.entries(auth)) {
    if (value != null && value !== '') {
      headers.set(key, value)
    }
  }

  return fetch(url, { ...init, headers })
}

type ProductFilters = {
  migrationStatus?: 'legacy' | 'migrated'
  includeInactive?: boolean
}

function normalizeProducts(raw: unknown[]) {
  return raw.map((product: any) => ({
    ...product,
    status: normalizeProductStatus(product?.status ?? null),
  }))
}

export async function getProducts(filters?: ProductFilters) {
  const url = new URL(`${BACKEND_URL}/api/products`)
  if (filters?.migrationStatus) {
    url.searchParams.set('migrationStatus', filters.migrationStatus)
  }

  const response = await authorizedFetch(url.toString(), {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Error al obtener productos: ${response.status}`)
  }

  const raw = await response.json()
  const products = Array.isArray(raw) ? normalizeProducts(raw) : []

  if (filters?.includeInactive) {
    return products
  }

  return products.filter((product: any) => isProductActive(product.status))
}

export async function getProduct(id: string) {
  const response = await authorizedFetch(`${BACKEND_URL}/api/products/${id}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Error al obtener el producto ${id}: ${response.status}`)
  }

  const json = await response.json()

  const formattedProduct = {
    ...json,
    status: normalizeProductStatus(json.status),
    createAt: new Date(json.createdAt),
  }

  console.log('Producto formateado:', formattedProduct)
  return formattedProduct
}

export async function createProduct(productData: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  })

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch (err) {
      /* ignore */
    }
    const message = errorData?.message || 'Error al crear el producto'
    throw { message, response: { status: res.status, data: errorData } }
  }

  const data = await res.json()
  const normalized = {
    ...data,
    status: normalizeProductStatus(data?.status ?? null),
  }
  console.log(normalized)
  return normalized
}

export async function verifyOrCreateProducts(products: { name: string; price: number; description?: string; brand?: string; categoryId?: number }[]) {
  try {
    const res = await authorizedFetch(`${BACKEND_URL}/api/products/verify-or-create-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(products),
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw { response: { status: res.status, data: errorData } }
    }

    const data = await res.json()
    console.log('Respuesta del backend:', data)
    return data
  } catch (error) {
    console.error('Error al verificar o crear productos:', error)
    throw error
  }
}

export async function deleteProduct(id: string) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/products/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData?.message || 'Error al eliminar el producto')
  }

  return res.json()
}

export async function updateProduct(id: string, newProduct: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newProduct),
    cache: 'no-store',
  })

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw { response: { status: res.status, data: errorData } }
  }

  const data = await res.json()
  return {
    ...data,
    status: normalizeProductStatus(data?.status ?? null),
  }
}

export async function updateManyProducts(products: any[]) {
  console.log('Enviando productos al backend para actualización masiva:', products)

  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/products`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(products),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error al actualizar productos:', errorData)
      throw { response: { status: response.status, data: errorData } }
    }

    const data = await response.json()
    console.log('Respuesta del backend:', data)
    return data
  } catch (error) {
    console.error('Error en updateManyProducts:', error)
    throw error
  }
}

export const deleteProducts = async (ids: string[]) => {
  console.log('Enviando IDs al backend:', ids)

  try {
    const numericIds = ids.map((id) => Number(id))

    const response = await authorizedFetch(`${BACKEND_URL}/api/products/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: numericIds }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData?.message || 'Error eliminando productos')
    }

    return await response.json()
  } catch (error) {
    console.error('Error en deleteProducts:', error)
    throw error
  }
}

export async function uploadProductImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await authorizedFetch(`${BACKEND_URL}/api/products/upload-image`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.message || 'Error al subir la imagen')
  }

  return res.json() as Promise<{ url: string }>
}

export async function getLegacyProducts() {
  return getProducts({ migrationStatus: 'legacy', includeInactive: true })
}

export async function markProductAsMigrated(productId: number) {
  const res = await authorizedFetch(
    `${BACKEND_URL}/api/products/${productId}/vertical-migration`,
    { method: 'PATCH' },
  )
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.message || 'No se pudo marcar el producto')
  }
  return res.json()
}

export type ProductVerticalMigrationPayload = {
  extraAttributes: Record<string, unknown>
  markMigrated?: boolean
}

export async function updateProductVerticalAttributes(
  productId: number,
  payload: ProductVerticalMigrationPayload,
) {
  const res = await authorizedFetch(
    `${BACKEND_URL}/api/products/${productId}/vertical-migration`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(
      errorData?.message || 'No se pudieron guardar los atributos del producto',
    )
  }

  return res.json()
}
