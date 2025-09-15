import { NextRequest, NextResponse } from 'next/server';
import { replicateGemini } from '@/aisdk/replicate-gemini';
import { buildMiniaturePrompt, optimizePromptForImagen, MINIATURE_STYLE_PRESETS } from '@/lib/miniature-prompts';
import { auth } from '@/auth';

export interface MiniatureGenerationRequest {
  images?: {
    data: string;
    mimeType: string;
    name: string;
  }[];
  instructions: string;
  enableTranslate?: boolean;
  config?: {
    style?: 'realistic' | 'anime' | 'cartoon';
    scale?: '1/7' | '1/8' | '1/12';
    environment?: 'desk' | 'display' | 'diorama';
    includePackaging?: boolean;
    numberOfImages?: number;
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (optional, based on your business logic)
    const session = await auth();
    
    // Parse request body
    const body: MiniatureGenerationRequest = await request.json();
    const { 
      images, 
      instructions, 
      enableTranslate = false,
      config = {}
    } = body;

    // Validate required fields
    if (!instructions?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Instructions are required' },
        { status: 400 }
      );
    }

    // Set default configuration
    const generationConfig = {
      style: config.style || 'realistic',
      scale: config.scale || '1/7',
      environment: config.environment || 'desk',
      includePackaging: config.includePackaging !== false,
      numberOfImages: config.numberOfImages || 1,
      aspectRatio: config.aspectRatio || '16:9',
      ...config
    };

    // Build optimized prompt for miniature generation
    const miniaturePrompt = buildMiniaturePrompt(
      instructions,
      {
        character: instructions,
        style: generationConfig.style,
        scale: generationConfig.scale,
        environment: generationConfig.environment,
        packaging: generationConfig.includePackaging
      }
    );

    // Optimize prompt for Imagen
    const optimizedPrompt = optimizePromptForImagen(miniaturePrompt);

    // Initialize Replicate Gemini provider
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error('Replicate API token not configured');
      return NextResponse.json(
        { success: false, error: 'Image generation service not available' },
        { status: 500 }
      );
    }

    const geminiProvider = replicateGemini({
      apiToken,
      model: 'google/nano-banana'
    });

    // Prepare reference images if provided
    const referenceImages = images?.map(img => img.data) || [];

    // Generate miniature images using Nano Banana (Gemini 2.5 Flash Image)
    const generatedImages = await geminiProvider.generateMiniatureImage(
      optimizedPrompt,
      referenceImages,
      {
        scale: generationConfig.scale,
        style: generationConfig.style,
        environment: generationConfig.environment,
        includePackaging: generationConfig.includePackaging
      }
    );

    // Return generated images
    return NextResponse.json({
      success: true,
      images: generatedImages.map(img => ({
        data: img.imageBytes,
        mimeType: img.mimeType
      })),
      prompt: optimizedPrompt, // For debugging/feedback
      config: generationConfig
    });

  } catch (error) {
    console.error('Miniature generation error:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to generate miniature';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Authentication failed';
        statusCode = 401;
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Service temporarily unavailable';
        statusCode = 429;
      } else if (error.message.includes('prompt')) {
        errorMessage = 'Invalid prompt content';
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: statusCode }
    );
  }
}

// Optional: Add a simple GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    service: 'Miniature Generation API',
    status: 'active',
    provider: 'Replicate',
    models: ['google/nano-banana'],
    version: '1.0.0'
  });
}
