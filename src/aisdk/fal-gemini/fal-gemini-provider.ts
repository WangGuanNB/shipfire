import * as falClient from "@fal-ai/client";
import type { FalGeminiImageConfig, GeneratedFalGeminiImage } from "./fal-gemini-types";
import { Buffer } from 'buffer';

// Get the fal singleton instance
const fal = falClient.fal;

export interface FalGeminiSettings {
  apiKey: string;
  model?: string;  // fal.ai model ID (e.g., 'fal-ai/nano-banana-2')
}

export class FalGeminiProvider {
  private apiKey: string;
  private model: string;

  constructor(settings: FalGeminiSettings) {
    this.apiKey = settings.apiKey;
    // Default to nano-banana-2 (most cost-effective)
    this.model = settings.model || 'fal-ai/nano-banana-2';
  }

  async generateImages(
    prompt: string,
    config?: FalGeminiImageConfig
  ): Promise<GeneratedFalGeminiImage[]> {
    try {
      // Configure fal client with API key
      // fal.ai expects the key in format: "key_id:key_secret"
      fal.config({
        credentials: this.apiKey,
      });

      console.log('🎨 [fal.ai] Calling model:', this.model);
      console.log('🔑 [fal.ai] API Key format:', this.apiKey.includes(':') ? 'key_id:key_secret' : 'single_key');
      console.log('🔑 [fal.ai] API Key prefix:', this.apiKey.substring(0, 20) + '...');

      // Build input parameters for fal.ai
      // nano-banana-2 uses aspect_ratio string, not image_size object
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: config?.aspect_ratio || '16:9',
        resolution: config?.resolution || '2K',
        num_inference_steps: 4,
        num_images: 1,
      };

      // Add optional parameters
      if (config?.seed) {
        input.seed = config.seed;
      }

      if (config?.output_format) {
        input.output_format = config.output_format;
      }

      // Reference images for fusion (if supported)
      if (config?.reference_images && config.reference_images.length > 0) {
        input.image_input = config.reference_images.map(
          (base64Image) => `data:image/jpeg;base64,${base64Image}`
        );
      }

      console.log('📦 [fal.ai] Input parameters:', JSON.stringify({
        ...input,
        prompt: input.prompt.substring(0, 50) + '...',
      }, null, 2));

      // Call fal.ai API using the correct method
      console.log('📡 [fal.ai] Calling fal.subscribe...');
      const result: any = await fal.subscribe(this.model, {
        input,
        logs: true, // Enable logs for debugging
      });

      console.log('✅ [fal.ai] Generation completed');
      console.log('📦 [fal.ai] Result keys:', Object.keys(result));

      // fal.ai returns { data: { images: [...] }, requestId: '...' }
      const images = result.data?.images || result.images;
      
      if (!images || images.length === 0) {
        console.error('❌ [fal.ai] No images in result:', JSON.stringify(result, null, 2));
        throw new Error('No images returned from fal.ai');
      }

      const imageUrl = images[0].url;
      console.log('🖼️ [fal.ai] Image URL:', imageUrl);

      console.log('📥 [fal.ai] Downloading image...');
      const base64 = await this.urlToBase64(imageUrl);
      console.log('✅ [fal.ai] Image downloaded, size:', base64.length, 'bytes');

      return [
        {
          imageBytes: base64,
          mimeType: this.getMimeType(config?.output_format || 'png'),
          seed: config?.seed,
        },
      ];
    } catch (error: any) {
      // 简化错误日志：只记录关键信息
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ [fal.ai] Generation failed:", errorMessage);
      
      // 只在开发环境输出详细信息
      if (process.env.NODE_ENV === 'development') {
        console.error("🔍 [fal.ai] Error details:", {
          status: error.status,
          body: error.body,
          requestId: error.requestId,
        });
      }
      
      throw new Error(`Image generation failed: ${errorMessage}`);
    }
  }

  /**
   * Map aspect ratio from Replicate format to fal.ai format
   */
  private mapAspectRatio(ratio: string): string {
    const mapping: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
      '3:2': '3:2',
      '2:3': '2:3',
    };
    return mapping[ratio] || '16:9';
  }

  /**
   * Convert image URL to base64
   */
  private async urlToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return base64;
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from format
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[format.toLowerCase()] || 'image/png';
  }
}

export function createFalGemini(settings: FalGeminiSettings): FalGeminiProvider {
  return new FalGeminiProvider(settings);
}

export const falGemini = createFalGemini;
