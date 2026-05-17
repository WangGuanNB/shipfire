/**
 * Unified Image Provider Interface
 * 
 * This interface abstracts different image generation providers (kie.ai, fal.ai, replicate)
 * to enable seamless switching and fallback mechanisms.
 */

export interface ImageConfig {
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
  resolution?: '1K' | '2K' | '4K';
  output_format?: 'jpg' | 'png';
  output_quality?: number;
  seed?: number;
  reference_images?: string[];
}

export interface GeneratedImage {
  imageBytes: string;
  mimeType: string;
  seed?: number;
}

export interface ImageProvider {
  name: string;
  generateImages(prompt: string, config?: ImageConfig): Promise<GeneratedImage[]>;
}

export interface ProviderResult {
  images: GeneratedImage[];
  provider: string;
  fallbackUsed: boolean;
}
