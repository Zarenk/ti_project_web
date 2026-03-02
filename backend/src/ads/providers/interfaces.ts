export interface GenerationRequest {
  /** Prompt or instruction for generating image */
  prompt: string;
  /** Optional size in WIDTHxHEIGHT (defaults provider-specific) */
  size?: string;
}

export interface GenerationResult {
  /** Public URL where the generated image can be fetched */
  url: string;
  /** Normalized cost of generation in USD */
  cost: number;
  /** Name of provider that generated the image */
  provider: string;
}

export interface ImageGenerationProvider {
  /** Unique provider name */
  name(): string;
  /** Generate image according to request */
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

// ── Ad Generation from Product ──────────────────────────────────────────────

export interface ProductContext {
  name: string;
  description?: string;
  price: number;
  priceSell?: number;
  brand?: string;
  category?: string;
  features?: Array<{ title: string; description?: string }>;
  images: string[];
}

export interface ProductAnalysis {
  dominantColors: string[];
  productType: string;
  mood: string;
  targetAudience: string;
  keyFeatures: string[];
}

export interface AdCopyVariation {
  title: string;
  description: string;
  hashtags: string[];
  cta: string;
  tone: string;
}

export type AdTone = 'profesional' | 'casual' | 'urgente' | 'aspiracional';
export type AdStyle = 'moderno' | 'minimalista' | 'vibrante' | 'elegante';

export interface AdGenerationResult {
  analysis: ProductAnalysis;
  variations: AdCopyVariation[];
  imageUrls: string[];
  costUsd: number;
}
