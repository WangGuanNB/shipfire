export * from "./generate-video";
export * from "./google-imagen";
export * from "./replicate-gemini";
export * from "./kie-gemini";
export * from "./fal-gemini";

// Export unified provider interfaces with explicit names to avoid conflicts
export type {
  ImageConfig,
  GeneratedImage as UnifiedGeneratedImage,
  ImageProvider,
  ProviderResult,
} from "./image-provider";

export { ProviderRouter } from "./provider-router";
export type { ProviderRouterConfig } from "./provider-router";

export {
  createProvider,
  KieProviderAdapter,
  FalProviderAdapter,
  ReplicateProviderAdapter,
} from "./provider-adapters";
