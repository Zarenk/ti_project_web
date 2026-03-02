import { BACKEND_URL } from '@/lib/utils'
import { authFetch } from '@/utils/auth-fetch'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ProductAnalysis {
  dominantColors: string[]
  productType: string
  mood: string
  targetAudience: string
  keyFeatures: string[]
}

export interface AdCopyVariation {
  title: string
  description: string
  hashtags: string[]
  cta: string
  tone: string
}

export interface AdGenerationResult {
  id: number
  analysis: ProductAnalysis
  variations: AdCopyVariation[]
  imageUrls: string[]
  costUsd: number
}

export interface AdGeneration {
  id: number
  productId: number
  analysis: ProductAnalysis | null
  variations: AdCopyVariation[]
  imageUrls: string[]
  selectedIndex: number | null
  editorState: unknown | null
  exportedImage: string | null
  publishedTo: string[]
  publishStatus: Record<string, string> | null
  publishedAt: string | null
  tone: string | null
  style: string | null
  costUsd: number | null
  createdAt: string
}

export type AdTone = 'profesional' | 'casual' | 'urgente' | 'aspiracional'
export type AdStyle = 'moderno' | 'minimalista' | 'vibrante' | 'elegante'
export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK'

export interface SocialAccount {
  id: number
  platform: SocialPlatform
  accountName: string
  accountId: string
  tokenExpiresAt: string | null
  metadata: Record<string, any> | null
  isActive: boolean
  createdAt: string
}

export interface PublishResult {
  [network: string]: {
    status: 'success' | 'error'
    externalId?: string
    error?: string
  }
}

// ── API Functions ───────────────────────────────────────────────────────────

export async function generateAdsFromProduct(
  productId: number,
  tone?: AdTone,
  style?: AdStyle,
): Promise<AdGenerationResult> {
  const res = await authFetch(`${BACKEND_URL}/api/ads/generate-from-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, tone, style }),
  })

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw {
      message: errorData?.message || 'Error al generar publicidad',
      response: { status: res.status, data: errorData },
    }
  }

  return res.json()
}

export async function getAdGenerations(
  productId: number,
): Promise<AdGeneration[]> {
  const res = await authFetch(
    `${BACKEND_URL}/api/ads/generations/${productId}`,
  )

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw {
      message: errorData?.message || 'Error al obtener generaciones',
      response: { status: res.status, data: errorData },
    }
  }

  return res.json()
}

// ── Selection ──────────────────────────────────────────────────────────────

export async function selectAdVariation(
  adGenerationId: number,
  selectedIndex: number,
): Promise<AdGeneration> {
  const res = await authFetch(
    `${BACKEND_URL}/api/ads/generations/${adGenerationId}/select`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedIndex }),
    },
  )

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw {
      message: errorData?.message || 'Error al guardar selección',
      response: { status: res.status, data: errorData },
    }
  }

  return res.json()
}

// ── Publish ────────────────────────────────────────────────────────────────

export async function publishAd(
  adGenerationId: number,
  networks: SocialPlatform[],
): Promise<PublishResult> {
  const res = await authFetch(`${BACKEND_URL}/api/ads/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adGenerationId, networks }),
  })

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw {
      message: errorData?.message || 'Error al publicar',
      response: { status: res.status, data: errorData },
    }
  }

  return res.json()
}

// ── Social Accounts ────────────────────────────────────────────────────────

export async function getSocialAccounts(): Promise<SocialAccount[]> {
  const res = await authFetch(`${BACKEND_URL}/api/ads/social-accounts`)

  if (!res.ok) return []
  return res.json()
}

export async function createSocialAccount(data: {
  platform: SocialPlatform
  accountName: string
  accountId: string
  accessToken: string
  refreshToken?: string
}): Promise<SocialAccount> {
  const res = await authFetch(`${BACKEND_URL}/api/ads/social-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    let errorData: any = null
    try {
      errorData = await res.json()
    } catch {
      /* ignore */
    }
    throw {
      message: errorData?.message || 'Error al vincular cuenta',
      response: { status: res.status, data: errorData },
    }
  }

  return res.json()
}

export async function deleteSocialAccount(id: number): Promise<void> {
  await authFetch(`${BACKEND_URL}/api/ads/social-accounts/${id}`, {
    method: 'DELETE',
  })
}

// ── OAuth ──────────────────────────────────────────────────────────────────

export interface OAuthUrlResponse {
  url: string
  state: string
}

export interface PlatformConfig {
  FACEBOOK: boolean
  INSTAGRAM: boolean
  TIKTOK: boolean
}

export async function getOAuthUrl(
  platform: SocialPlatform,
): Promise<OAuthUrlResponse> {
  const res = await fetch(`/api/ads/oauth/authorize?platform=${platform}`)

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al obtener URL de autorización')
  }

  return res.json()
}

export async function getConfiguredPlatforms(): Promise<PlatformConfig> {
  const res = await authFetch(`${BACKEND_URL}/api/ads/oauth/platforms`)
  if (!res.ok) return { FACEBOOK: false, INSTAGRAM: false, TIKTOK: false }
  return res.json()
}
