import { ProviderRouter } from "@/aisdk/provider-router";
import { createProvider } from "@/aisdk/provider-adapters";
import type { ImageConfig } from "@/aisdk/image-provider";
import { respData, respErr, respJson } from "@/lib/resp";
import { getUuid } from "@/lib/hash";
import { newStorage } from "@/lib/storage";
import {
  CreditsTransType,
  decreaseCredits,
  getUserCredits,
} from "@/services/credit";
import { getAIChatCreditCost } from "@/services/config";
import { getUserUuid } from "@/services/user";
import { ErrorCode } from "@/lib/error-handler";

export const runtime = "nodejs";

const ALLOWED_ASPECT_RATIOS: ImageConfig["aspect_ratio"][] = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
];

function mapAspectRatio(
  value: string
): ImageConfig["aspect_ratio"] | undefined {
  if (value === "auto") return "16:9";
  if (ALLOWED_ASPECT_RATIOS.includes(value as any)) return value as ImageConfig["aspect_ratio"];
  return "16:9";
}

/**
 * POST /api/generate-image
 * ShipFire: AI 图像生成（kie.ai + fal.ai + replicate 三重容错）
 * Body: { prompt, aspect_ratio?, resolution?, output_format?, locale? }
 * 仅在实际生成成功并上传后扣减积分。
 * 
 * Provider 策略：
 * - 主力：kie.ai ($0.09/张) - 便宜
 * - 备用：fal.ai ($0.039/张) - 稳定
 * - 第三备用：replicate ($0.05/张) - 现有
 * - 自动容错：主力失败时自动切换到备用
 */
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return respErr("prompt is required");
    }

    // 获取用户语言偏好（从请求体或 header）
    const locale = body.locale || req.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    const creditCost = getAIChatCreditCost();
    const userCredits = await getUserCredits(user_uuid);
    const leftCredits = userCredits.left_credits ?? 0;

    if (leftCredits < creditCost) {
      return respJson(-3, "insufficient credits", {
        insufficient: true,
        required: creditCost,
        available: leftCredits,
      });
    }

    // Get provider configuration from environment variables
    const primaryProvider = process.env.PRIMARY_PROVIDER || 'replicate';
    const fallbackProvider = process.env.FALLBACK_PROVIDER || 'replicate';
    
    const kieApiKey = process.env.KIE_API_KEY;
    const kieModel = process.env.KIE_MODEL || 'nano-banana-pro';
    
    const falApiKey = process.env.FAL_KEY;
    const falModel = process.env.FAL_MODEL || 'fal-ai/nano-banana-2';
    
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    const replicateModel = process.env.REPLICATE_MODEL || 'google/nano-banana';

    // Validate API keys based on provider configuration
    if (primaryProvider === 'kie' && !kieApiKey) {
      console.error("generate-image: KIE_API_KEY not set");
      return respErr("service unavailable");
    }
    if (primaryProvider === 'fal' && !falApiKey) {
      console.error("generate-image: FAL_KEY not set");
      return respErr("service unavailable");
    }
    if (primaryProvider === 'replicate' && !replicateApiToken) {
      console.error("generate-image: REPLICATE_API_TOKEN not set");
      return respErr("service unavailable");
    }

    const aspectRatio = mapAspectRatio(body.aspect_ratio ?? "auto");
    const resolution = (body.resolution ?? "2K") as ImageConfig["resolution"];
    const outputFormat =
      body.output_format === "jpg" || body.output_format === "png"
        ? (body.output_format as "jpg" | "png")
        : "png";

    // Create provider instances based on configuration
    let primaryProviderInstance;
    let fallbackProviderInstance;

    try {
      // Create primary provider
      if (primaryProvider === 'kie' && kieApiKey) {
        primaryProviderInstance = createProvider('kie', kieApiKey, kieModel);
      } else if (primaryProvider === 'fal' && falApiKey) {
        primaryProviderInstance = createProvider('fal', falApiKey, falModel);
      } else if (primaryProvider === 'replicate' && replicateApiToken) {
        primaryProviderInstance = createProvider('replicate', replicateApiToken, replicateModel);
      } else {
        // Fallback to replicate if primary is not configured
        primaryProviderInstance = createProvider('replicate', replicateApiToken!, replicateModel);
      }

      // Create fallback provider
      if (fallbackProvider === 'kie' && kieApiKey) {
        fallbackProviderInstance = createProvider('kie', kieApiKey, kieModel);
      } else if (fallbackProvider === 'fal' && falApiKey) {
        fallbackProviderInstance = createProvider('fal', falApiKey, falModel);
      } else if (fallbackProvider === 'replicate' && replicateApiToken) {
        fallbackProviderInstance = createProvider('replicate', replicateApiToken, replicateModel);
      } else {
        // Fallback to replicate if fallback is not configured
        fallbackProviderInstance = createProvider('replicate', replicateApiToken!, replicateModel);
      }
    } catch (providerError) {
      console.error("Failed to create providers:", providerError);
      return respErr("service configuration error");
    }

    // Create provider router with primary and fallback providers
    const router = new ProviderRouter({
      primary: primaryProviderInstance,
      fallback: fallbackProviderInstance,
      timeout: 180000, // 180 seconds (3 minutes) timeout
    });

    const config: ImageConfig = {
      aspect_ratio: aspectRatio,
      resolution,
      output_format: outputFormat,
    };

    // Add reference images if provided
    if (body.reference_images && Array.isArray(body.reference_images)) {
      config.reference_images = body.reference_images;
    }

    console.log(`🎨 Generating image for user ${user_uuid} (locale: ${locale})`);
    console.log(`🔧 Primary provider: ${primaryProvider}, Fallback: ${fallbackProvider}`);
    
    // Generate with automatic fallback (传递 locale 用于错误消息)
    const { images, provider, fallbackUsed } = await router.generateWithFallback(prompt, config, locale);
    
    if (!images?.length || !images[0].imageBytes) {
      return respErr("no image generated");
    }

    const storage = newStorage();
    const ext = outputFormat === "jpg" ? "jpg" : "png";
    const contentType = outputFormat === "jpg" ? "image/jpeg" : "image/png";
    const key = `shipfire/${user_uuid}/${getUuid()}.${ext}`;
    const bodyBuffer = Buffer.from(images[0].imageBytes, "base64");

    const uploadResult = await storage.uploadFile({
      body: bodyBuffer,
      key,
      contentType,
      disposition: "inline",
    });

    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.ImageGen,
      credits: creditCost,
    });

    const url =
      uploadResult.url ||
      (process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : uploadResult.location);

    // Log statistics periodically (every 10 requests)
    if (Math.random() < 0.1) {
      router.logStats();
    }

    return respData({ 
      url, 
      key: uploadResult.key,
      provider, // Which provider was used
      fallbackUsed, // Whether fallback was triggered
    });
  } catch (e: any) {
    console.error("generate-image failed:", e);
    
    // 检查是否是积分不足错误（需要弹出购买页面）
    if (e.code === ErrorCode.INSUFFICIENT_CREDITS || e.shouldShowPricing) {
      return respJson(-3, e.message || "积分不足", {
        insufficient: true,
        shouldShowPricing: true,
      });
    }
    
    // 其他错误：返回用户友好的错误信息
    const message = e.message || "图片生成失败，请稍后重试";
    return respErr(message);
  }
}
