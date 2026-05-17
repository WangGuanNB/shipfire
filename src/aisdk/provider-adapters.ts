/**
 * Provider Adapters
 * 
 * Adapts different provider implementations to the unified ImageProvider interface
 */

import type { ImageProvider, ImageConfig, GeneratedImage } from './image-provider';
import { KieGeminiProvider } from './kie-gemini/kie-gemini-provider';
import { FalGeminiProvider } from './fal-gemini/fal-gemini-provider';
import { ReplicateGeminiProvider } from './replicate-gemini/replicate-gemini-provider';

/**
 * Kie.ai Provider Adapter
 */
export class KieProviderAdapter implements ImageProvider {
  name = 'kie';
  private provider: KieGeminiProvider;

  constructor(apiKey: string, model?: string) {
    this.provider = new KieGeminiProvider({ apiKey, model });
  }

  async generateImages(prompt: string, config?: ImageConfig): Promise<GeneratedImage[]> {
    return this.provider.generateImages(prompt, config);
  }
}

/**
 * Fal.ai Provider Adapter
 */
export class FalProviderAdapter implements ImageProvider {
  name = 'fal';
  private provider: FalGeminiProvider;

  constructor(apiKey: string, model?: string) {
    this.provider = new FalGeminiProvider({ apiKey, model });
  }

  async generateImages(prompt: string, config?: ImageConfig): Promise<GeneratedImage[]> {
    return this.provider.generateImages(prompt, config);
  }
}

/**
 * Replicate Provider Adapter
 */
export class ReplicateProviderAdapter implements ImageProvider {
  name = 'replicate';
  private provider: ReplicateGeminiProvider;

  constructor(apiToken: string, model?: string) {
    this.provider = new ReplicateGeminiProvider({ apiToken, model });
  }

  async generateImages(prompt: string, config?: ImageConfig): Promise<GeneratedImage[]> {
    return this.provider.generateImages(prompt, config);
  }
}

/**
 * Factory function to create provider based on configuration
 */
export function createProvider(
  type: 'kie' | 'fal' | 'replicate',
  apiKey: string,
  model?: string
): ImageProvider {
  switch (type) {
    case 'kie':
      return new KieProviderAdapter(apiKey, model);
    case 'fal':
      return new FalProviderAdapter(apiKey, model);
    case 'replicate':
      return new ReplicateProviderAdapter(apiKey, model);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
