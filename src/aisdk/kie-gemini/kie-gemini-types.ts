export interface KieGeminiImageConfig {
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
  resolution?: '1K' | '2K' | '4K';
  output_format?: 'jpg' | 'png';
  output_quality?: number;
  seed?: number;
  reference_images?: string[];
}

export interface GeneratedKieGeminiImage {
  imageBytes: string;
  mimeType: string;
  seed?: number;
}
