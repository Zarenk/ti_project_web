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