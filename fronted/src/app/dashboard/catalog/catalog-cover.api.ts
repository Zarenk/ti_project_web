import { getAuthHeaders } from '@/utils/auth-token'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.40:4000'

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
  const headers = await getAuthHeaders()
  const res = await fetch(`${BACKEND_URL}/api/catalog/cover`, {
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Error al obtener la caratula del catalogo')
  }

  const data = await res.json()
  return data?.cover ?? null
}

export async function uploadCatalogCover(file: File): Promise<CatalogCover> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BACKEND_URL}/api/catalog/cover`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
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
  const headers = await getAuthHeaders()
  const res = await fetch(`${BACKEND_URL}/api/catalog/cover`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Error al eliminar la caratula del catalogo')
  }
}
