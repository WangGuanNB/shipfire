import { GoogleGenAI, PersonGeneration } from "@google/genai";
import type { ImageGenerationConfig, GeneratedImage } from "./google-imagen-types";

export interface GoogleImagenSettings {
  apiKey: string;
  model?: string;
}

export class GoogleImagenProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(settings: GoogleImagenSettings) {
    this.client = new GoogleGenAI({ apiKey: settings.apiKey });
    this.model = settings.model || 'imagen-4.0-generate-001';
  }

  async generateImages(
    prompt: string,
    config?: ImageGenerationConfig
  ): Promise<GeneratedImage[]> {
    try {
      const response = await this.client.models.generateImages({
        model: this.model,
        prompt,
        config: {
          numberOfImages: config?.numberOfImages || 1,
          aspectRatio: config?.aspectRatio || '1:1',
          personGeneration: config?.personGeneration || PersonGeneration.ALLOW_ADULT,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images generated from Google Imagen');
      }

      return response.generatedImages
        .filter(img => img.image && img.image.imageBytes)
        .map(img => {
          if (!img.image || !img.image.imageBytes) {
            throw new Error('Invalid image data received from Google Imagen');
          }
          return {
            imageBytes: img.image.imageBytes,
            mimeType: 'image/png'
          };
        });
    } catch (error) {
      console.error('Google Imagen generation error:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateMiniatureImage(
    prompt: string,
    options?: {
      scale?: '1/7' | '1/8' | '1/12';
      style?: 'realistic' | 'anime' | 'cartoon';
      environment?: 'desk' | 'display' | 'diorama';
      includePackaging?: boolean;
    }
  ): Promise<GeneratedImage[]> {
    const miniaturePrompt = this.buildMiniaturePrompt(prompt, options);
    
    return this.generateImages(miniaturePrompt, {
      numberOfImages: 1,
      aspectRatio: '16:9',
      personGeneration: PersonGeneration.ALLOW_ADULT
    });
  }

  private buildMiniaturePrompt(
    userPrompt: string, 
    options?: {
      scale?: '1/7' | '1/8' | '1/12';
      style?: 'realistic' | 'anime' | 'cartoon';
      environment?: 'desk' | 'display' | 'diorama';
      includePackaging?: boolean;
    }
  ): string {
    const scale = options?.scale || '1/7';
    const style = options?.style || 'realistic';
    const environment = options?.environment || 'desk';
    const includePackaging = options?.includePackaging !== false;

    let basePrompt = `Professional product photography of a ${scale} scale collectible figurine based on: ${userPrompt}. `;

    switch (style) {
      case 'realistic':
        basePrompt += 'Hyper-realistic details, studio lighting, high-quality sculpting with fine details. ';
        break;
      case 'anime':
        basePrompt += 'Anime-style figurine with vibrant colors, glossy finish typical of high-end anime figures. ';
        break;
      case 'cartoon':
        basePrompt += 'Stylized cartoon figurine with bright, playful colors and clean sculpting details. ';
        break;
    }

    switch (environment) {
      case 'desk':
        basePrompt += 'Placed on a computer desk with transparent acrylic base. Computer screen showing ZBrush 3D modeling interface in background. ';
        break;
      case 'display':
        basePrompt += 'Display case setup with LED lighting, clear acrylic base, collector room environment. ';
        break;
      case 'diorama':
        basePrompt += 'Miniature diorama scene with detailed background environment and props. ';
        break;
    }

    if (includePackaging) {
      basePrompt += 'BANDAI-style product packaging box positioned beside the figurine. ';
    }

    basePrompt += 'Sharp focus on figurine, shallow depth of field background, professional photography lighting, 4K quality.';

    return basePrompt;
  }
}

export function createGoogleImagen(settings: GoogleImagenSettings): GoogleImagenProvider {
  return new GoogleImagenProvider(settings);
}

export const googleImagen = createGoogleImagen;
