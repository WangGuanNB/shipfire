import type { KieGeminiImageConfig, GeneratedKieGeminiImage } from "./kie-gemini-types";
import { Buffer } from 'buffer';

export interface KieGeminiSettings {
  apiKey: string;
  model?: string;  // kie.ai model ID (e.g., 'nano-banana-pro')
}

export class KieGeminiProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(settings: KieGeminiSettings) {
    this.apiKey = settings.apiKey;
    // Default to nano-banana-pro ($0.09/image)
    this.model = settings.model || 'nano-banana-pro';
    this.baseUrl = 'https://api.kie.ai';
  }

  async generateImages(
    prompt: string,
    config?: KieGeminiImageConfig
  ): Promise<GeneratedKieGeminiImage[]> {
    console.log('🚀 [kie.ai] Starting image generation...');
    console.log('📝 [kie.ai] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    console.log('⚙️ [kie.ai] Config:', JSON.stringify(config, null, 2));
    
    try {
      // Build input parameters for kie.ai Market API
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: config?.aspect_ratio || '16:9',
        resolution: config?.resolution || '2K',
        output_format: config?.output_format || 'png',
      };

      // Reference images for fusion (if supported)
      if (config?.reference_images && config.reference_images.length > 0) {
        input.image_input = config.reference_images.map(
          (base64Image) => `data:image/jpeg;base64,${base64Image}`
        );
      }

      const requestBody = {
        model: this.model,
        input,
      };

      console.log('🎯 [kie.ai] Model:', this.model);
      console.log('🔑 [kie.ai] API Key:', this.apiKey.substring(0, 10) + '...');
      console.log('🌐 [kie.ai] API URL:', `${this.baseUrl}/api/v1/jobs/createTask`);
      console.log('📦 [kie.ai] Request payload:', JSON.stringify({
        ...requestBody,
        input: {
          ...requestBody.input,
          prompt: requestBody.input.prompt.substring(0, 50) + '...',
        },
      }, null, 2));

      // Step 1: Create task
      console.log('📡 [kie.ai] Creating generation task...');
      const startTime = Date.now();
      
      const createResponse = await fetch(`${this.baseUrl}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const createElapsed = Date.now() - startTime;
      console.log(`⏱️ [kie.ai] Task creation completed in ${createElapsed}ms`);
      console.log('📊 [kie.ai] Response status:', createResponse.status, createResponse.statusText);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ [kie.ai] API error response:', errorText);
        throw new Error(`kie.ai API error (${createResponse.status}): ${errorText}`);
      }

      const createResult = await createResponse.json();
      console.log('📦 [kie.ai] Task created:', JSON.stringify(createResult, null, 2));

      if (createResult.code !== 200 || !createResult.data?.taskId) {
        console.error('❌ [kie.ai] Task creation failed:', createResult.msg);
        throw new Error(`Task creation failed: ${createResult.msg || 'Unknown error'}`);
      }

      const taskId = createResult.data.taskId;
      console.log('✅ [kie.ai] Task ID:', taskId);

      // Step 2: Poll for task completion
      console.log('⏳ [kie.ai] Polling for task completion...');
      const maxAttempts = 90; // 90 attempts
      const pollInterval = 2000; // 2 seconds (total: 180 seconds = 3 minutes)
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 [kie.ai] Poll attempt ${attempts}/${maxAttempts}...`);

        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const statusResponse = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!statusResponse.ok) {
          console.warn(`⚠️ [kie.ai] Status check failed (${statusResponse.status}), retrying...`);
          continue;
        }

        const statusResult = await statusResponse.json();
        const state = statusResult.data?.state;
        console.log(`📊 [kie.ai] Task state:`, state);

        if (statusResult.code !== 200) {
          console.warn(`⚠️ [kie.ai] Status check returned code ${statusResult.code}, retrying...`);
          continue;
        }

        // Task states: waiting, queuing, generating, success, fail
        if (state === 'success') {
          // Success - parse resultJson
          const resultJson = statusResult.data?.resultJson;
          if (!resultJson) {
            console.error('❌ [kie.ai] No resultJson in completed task');
            throw new Error('No resultJson returned from kie.ai');
          }

          const result = JSON.parse(resultJson);
          const resultUrls = result.resultUrls;
          
          if (!resultUrls || !resultUrls.length) {
            console.error('❌ [kie.ai] No resultUrls in resultJson');
            throw new Error('No image URLs returned from kie.ai');
          }

          const imageUrl = resultUrls[0];
          console.log('🖼️ [kie.ai] Image URL:', imageUrl);

          console.log('📥 [kie.ai] Downloading image from URL...');
          const base64 = await this.urlToBase64(imageUrl);
          console.log('✅ [kie.ai] Image downloaded, size:', base64.length, 'bytes');

          const totalElapsed = Date.now() - startTime;
          console.log(`✨ [kie.ai] Image generation completed successfully in ${totalElapsed}ms!`);
          
          return [
            {
              imageBytes: base64,
              mimeType: this.getMimeType(config?.output_format || 'png'),
              seed: config?.seed,
            },
          ];
        } else if (state === 'fail') {
          // Failed
          const failMsg = statusResult.data?.failMsg || 'Unknown error';
          const failCode = statusResult.data?.failCode || '';
          console.error('❌ [kie.ai] Task failed:', failCode, failMsg);
          throw new Error(`Task failed: ${failCode} ${failMsg}`);
        }

        // States: waiting, queuing, generating = still processing, continue polling
      }

      // Timeout
      console.error('❌ [kie.ai] Task timeout after', maxAttempts, 'attempts');
      throw new Error('Task timeout: generation took too long');

    } catch (error) {
      // 简化错误日志：只记录错误消息
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("❌ [kie.ai] Generation failed:", errorMessage);
      
      // 只在开发环境输出详细的 stack trace
      if (process.env.NODE_ENV === 'development') {
        console.error("🔍 [kie.ai] Stack trace:", error instanceof Error ? error.stack : undefined);
      }
      
      throw new Error(`Image generation failed: ${errorMessage}`);
    }
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

export function createKieGemini(settings: KieGeminiSettings): KieGeminiProvider {
  return new KieGeminiProvider(settings);
}

export const kieGemini = createKieGemini;
