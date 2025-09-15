import { replicate } from "@ai-sdk/replicate";
import { experimental_generateImage as generateImage } from "ai";
import type { GeminiImageConfig, GeneratedGeminiImage } from "./replicate-gemini-types";
import Replicate from 'replicate';
import { newStorage } from '@/lib/storage';
import { getUuid } from '@/lib/hash';
import { Buffer } from 'buffer';

export interface ReplicateGeminiSettings {
  apiToken: string;
  model?: string;
}

export class ReplicateGeminiProvider {
  private apiToken: string;
  private model: string;
  private replicateClient: Replicate;

  constructor(settings: ReplicateGeminiSettings) {
    this.apiToken = settings.apiToken;
    this.model = settings.model || 'google/nano-banana';
    
    // Initialize native Replicate client
    this.replicateClient = new Replicate({
      auth: this.apiToken,
    });
    
    // Set the API token for replicate
    if (typeof process !== 'undefined' && process.env) {
      process.env.REPLICATE_API_TOKEN = this.apiToken;
    }
  }

  async generateImages(
    prompt: string,
    config?: GeminiImageConfig
  ): Promise<GeneratedGeminiImage[]> {
    try {
      // 🎯 回到 AI SDK 方式，更稳定可靠
      const imageModel = replicate.image(this.model);
      
      const input: Record<string, any> = {
        prompt: prompt,
      };

      // Add optional parameters
      if (config?.aspect_ratio) input.aspect_ratio = config.aspect_ratio;
      if (config?.output_format) input.output_format = config.output_format;
      if (config?.output_quality && config.output_quality >= 1 && config.output_quality <= 100) {
        input.output_quality = config.output_quality;
      }
      if (config?.seed) input.seed = config.seed;

      // 🎯 处理参考图片 - 正确的数组格式
      if (config?.reference_images && config.reference_images.length > 0) {
        console.log('Adding reference images for Nano Banana, count:', config.reference_images.length);
        
        // ✅ CRITICAL FIX: image_input 需要数组格式！
        const imageDataUrls = config.reference_images.map(base64Image => 
          `data:image/jpeg;base64,${base64Image}`
        );
        
        // 正确的数组格式
        input.image_input = imageDataUrls;  // 官方要求的数组格式
        
        console.log('✅ Set image_input as array:', imageDataUrls.length, 'images');
        console.log('First image data length:', config.reference_images[0].length);
      }

      console.log('Final input parameters:', Object.keys(input));

      // 使用 AI SDK，让它处理复杂的响应格式
      const { images } = await generateImage({
        model: imageModel,
        prompt: prompt,
        n: 1,
        providerOptions: {
          replicate: input,
        },
      });

      if (!images || images.length === 0) {
        throw new Error('No images generated from Replicate Gemini');
      }

      console.log('✅ AI SDK returned images count:', images.length);

      // 转换为我们的格式
      return await Promise.all(images.map(async (image, index) => {
        const base64 = await this.imageToBase64(image);
        return {
          imageBytes: base64,
          mimeType: this.getMimeType(config?.output_format || 'png'),
          seed: input.seed
        };
      }));

    } catch (error) {
      console.error('❌ Nano Banana generation error:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateMiniatureImage(
    prompt: string,
    referenceImages: string[],
    options?: {
      scale?: '1/7' | '1/8' | '1/12';
      style?: 'realistic' | 'anime' | 'cartoon';
      environment?: 'desk' | 'display' | 'diorama';
      includePackaging?: boolean;
    }
  ): Promise<GeneratedGeminiImage[]> {
    const miniaturePrompt = this.buildMiniaturePrompt(prompt, options);
    
    return this.generateImages(miniaturePrompt, {
      aspect_ratio: '16:9',
      output_format: 'png',
      reference_images: referenceImages // This will be processed correctly now
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

    let basePrompt = `Using the uploaded reference image as the primary source, transform the person shown into a ${scale} scale collectible figurine. The figurine must exactly match the person's face, hairstyle, clothing, and pose from the reference image. ${userPrompt}. `;

    // Style-specific descriptions optimized for Nano Banana's fusion capabilities
    switch (style) {
      case 'realistic':
        basePrompt += 'Generate a highly detailed realistic figurine that captures the exact appearance, facial features, hair, and clothing style of the person in the input images. ';
        break;
      case 'anime':
        basePrompt += 'Create an anime-style figurine that maintains the person\'s distinctive features while applying vibrant anime aesthetics with glossy finish. ';
        break;
      case 'cartoon':
        basePrompt += 'Design a cartoon-style figurine with the person\'s key characteristics stylized into a clean, appealing cartoon design. ';
        break;
    }

    // Environment-specific settings
    switch (environment) {
      case 'desk':
        basePrompt += 'Positioned on a modern computer desk with transparent acrylic display base. Background shows computer screen displaying 3D modeling software interface. ';
        break;
      case 'display':
        basePrompt += 'Professional collector display case with LED accent lighting, pristine showcase environment. ';
        break;
      case 'diorama':
        basePrompt += 'Detailed miniature diorama scene with environmental storytelling elements and atmospheric background. ';
        break;
    }

    // Packaging option
    if (includePackaging) {
      basePrompt += 'Premium collector edition packaging box positioned beside figurine showing character artwork and product branding. ';
    }

    // Technical photography details
    basePrompt += 'Sharp focus on figurine with shallow depth of field, professional product photography lighting, commercial quality, 4K resolution, perfect exposure and color accuracy.';

    return basePrompt;
  }

  private async imageToBase64(image: any): Promise<string> {
    try {
      // Handle different image object formats from AI SDK
      if (image && image.uint8ArrayData && image.uint8ArrayData instanceof Uint8Array) {
        return Buffer.from(image.uint8ArrayData).toString('base64');
      }
      
      if (image && typeof image.base64Data === 'string') {
        return image.base64Data;
      }
      
      if (typeof image === 'string') {
        // If it's a URL, fetch and convert
        if (image.startsWith('http')) {
          return await this.urlToBase64(image);
        }
        // If it's already base64
        return image;
      }
      
      if (image && typeof image.url === 'string') {
        return await this.urlToBase64(image.url);
      }
      
      if (image instanceof Uint8Array) {
        return Buffer.from(image).toString('base64');
      }
      
      console.error('Unexpected image format:', image);
      throw new Error('Unable to convert image to base64');
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

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

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[format.toLowerCase()] || 'image/png';
  }
}

export function createReplicateGemini(settings: ReplicateGeminiSettings): ReplicateGeminiProvider {
  return new ReplicateGeminiProvider(settings);
}

export const replicateGemini = createReplicateGemini;