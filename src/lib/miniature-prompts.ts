export interface MiniaturePromptConfig {
  character: string;
  style: 'realistic' | 'anime' | 'cartoon';
  scale: '1/7' | '1/8' | '1/12';
  environment: 'desk' | 'display' | 'diorama';
  packaging: boolean;
}

export interface PromptOptimizationOptions {
  includeEnvironment?: boolean;
  includePackaging?: boolean;
  includeTechnicalDetails?: boolean;
  lightingStyle?: 'studio' | 'natural' | 'dramatic';
  cameraAngle?: 'front' | 'three-quarter' | 'profile' | 'top-down';
}

export function buildMiniaturePrompt(
  userInstructions: string, 
  config: MiniaturePromptConfig,
  options?: PromptOptimizationOptions
): string {
  const opts = {
    includeEnvironment: true,
    includePackaging: true,
    includeTechnicalDetails: true,
    lightingStyle: 'studio' as const,
    cameraAngle: 'three-quarter' as const,
    ...options
  };

  let prompt = '';

  // 基础描述
  const styleDescriptions = {
    realistic: `Professional product photography of a ${config.scale} scale hyper-realistic collectible figurine`,
    anime: `${config.scale} scale anime-style figurine with vibrant colors and glossy finish`,
    cartoon: `${config.scale} scale stylized cartoon figurine with bright, playful colors`
  };

  prompt += `${styleDescriptions[config.style]} based on: ${userInstructions}. `;

  // 环境设置
  if (opts.includeEnvironment) {
    const environmentDescriptions = {
      desk: 'Placed on a modern computer desk with transparent acrylic display base. Computer monitor in background showing ZBrush 3D modeling interface',
      display: 'Professional display case setup with LED strip lighting, museum-quality clear acrylic base, collector room environment',
      diorama: 'Miniature diorama scene with detailed background environment, props, and atmospheric lighting'
    };
    prompt += `${environmentDescriptions[config.environment]}. `;
  }

  // 包装选项
  if (opts.includePackaging && config.packaging) {
    prompt += 'BANDAI-style collector edition product packaging box positioned beside the figurine, showing product artwork and branding. ';
  }

  // 光照设置
  const lightingDescriptions = {
    studio: 'Professional studio lighting with key light, fill light, and rim lighting for dimensional depth',
    natural: 'Soft natural window lighting with subtle shadows',
    dramatic: 'Dramatic lighting with strong contrast and directional shadows'
  };
  prompt += `${lightingDescriptions[opts.lightingStyle]}. `;

  // 相机角度
  const angleDescriptions = {
    front: 'Front-facing view showing full detail of the figurine',
    'three-quarter': 'Three-quarter angle view showcasing depth and dimensional details',
    profile: 'Profile side view highlighting the figurine silhouette',
    'top-down': 'Elevated top-down angle showing the full scene'
  };
  prompt += `${angleDescriptions[opts.cameraAngle]}. `;

  // 技术细节
  if (opts.includeTechnicalDetails) {
    prompt += 'Sharp focus on figurine with shallow depth of field background, 4K ultra-high resolution, professional photography quality, fine detail capture, smooth surface textures, accurate color reproduction.';
  }

  return prompt;
}

export function optimizePromptForImagen(prompt: string): string {
  // Imagen-specific optimizations based on Google's documentation
  const optimizedPrompt = prompt
    // Ensure descriptive language
    .replace(/\b(good|nice|beautiful)\b/g, 'high-quality, detailed')
    // Add photography-specific terms that work well with Imagen
    .replace(/photo/g, 'professional photograph')
    // Enhance lighting descriptions
    .replace(/lighting/g, 'studio lighting setup');

  return optimizedPrompt;
}

export const MINIATURE_STYLE_PRESETS = {
  realistic_desk: {
    style: 'realistic' as const,
    environment: 'desk' as const,
    packaging: true,
    scale: '1/7' as const
  },
  anime_display: {
    style: 'anime' as const,
    environment: 'display' as const,
    packaging: true,
    scale: '1/8' as const
  },
  cartoon_diorama: {
    style: 'cartoon' as const,
    environment: 'diorama' as const,
    packaging: false,
    scale: '1/12' as const
  }
} as const;
