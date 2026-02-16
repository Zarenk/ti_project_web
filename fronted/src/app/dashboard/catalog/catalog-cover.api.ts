import { BACKEND_URL } from '@/lib/utils'
import { authFetch, UnauthenticatedError } from '@/utils/auth-fetch'

export interface CatalogCover {
  id: number
  imagePath: string
  imageUrl?: string
  pdfImageUrl?: string
  originalName?: string
  mimeType?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export async function getCatalogCover(): Promise<CatalogCover | null> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/catalog/cover`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('Error al obtener la caratula del catalogo')
    }

    const data = await res.json()
    return data?.cover ?? null
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null
    }
    throw error
  }
}

export async function uploadCatalogCover(file: File): Promise<CatalogCover> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await authFetch(`${BACKEND_URL}/api/catalog/cover`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Error al guardar la caratula del catalogo')
  }

  const data = await res.json()
  if (!data?.cover) {
    throw new Error('Respuesta invalida al guardar la caratula')
  }

  return data.cover as CatalogCover
}

export async function deleteCatalogCover(): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/catalog/cover`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    throw new Error('Error al eliminar la caratula del catalogo')
  }
}
