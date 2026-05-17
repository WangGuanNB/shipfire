/**
 * Provider Router with Fallback Support
 * 
 * Implements intelligent provider switching:
 * 1. Try primary provider (kie.ai) first
 * 2. If primary fails, automatically fallback to secondary provider (fal.ai)
 * 3. Log all attempts and failures for monitoring
 */

import type { ImageProvider, ImageConfig, ProviderResult } from './image-provider';
import { ErrorClassifier, ErrorLogger } from '@/lib/error-handler';

export interface ProviderRouterConfig {
  primary: ImageProvider;
  fallback: ImageProvider;
  timeout?: number; // Timeout in milliseconds (default: 30000)
}

export class ProviderRouter {
  private primary: ImageProvider;
  private fallback: ImageProvider;
  private timeout: number;

  // Statistics for monitoring
  private stats = {
    primaryAttempts: 0,
    primarySuccesses: 0,
    primaryFailures: 0,
    fallbackAttempts: 0,
    fallbackSuccesses: 0,
    fallbackFailures: 0,
  };

  constructor(config: ProviderRouterConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.timeout = config.timeout || 180000; // Default 180 seconds (3 minutes)
  }

  /**
   * Generate images with automatic fallback
   * @param prompt 提示词
   * @param config 图片配置
   * @param locale 语言代码（用于错误消息）
   */
  async generateWithFallback(
    prompt: string,
    config?: ImageConfig,
    locale?: string
  ): Promise<ProviderResult> {
    // Try primary provider first
    try {
      console.log(`🎨 [ProviderRouter] Using primary provider: ${this.primary.name}`);
      this.stats.primaryAttempts++;

      const images = await this.withTimeout(
        this.primary.generateImages(prompt, config),
        this.timeout,
        `${this.primary.name} timeout`
      );

      this.stats.primarySuccesses++;
      console.log(`✅ [ProviderRouter] Primary provider (${this.primary.name}) succeeded`);

      return {
        images,
        provider: this.primary.name,
        fallbackUsed: false,
      };

    } catch (primaryError) {
      // Primary provider failed
      this.stats.primaryFailures++;
      
      // 简化日志：只记录错误消息，不记录完整 stack trace
      const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.warn(`⚠️ [ProviderRouter] Primary provider (${this.primary.name}) failed: ${errorMessage}`);

      // Check if error is retryable
      if (!this.shouldRetry(primaryError)) {
        console.log(`⚠️ [ProviderRouter] Error is not retryable, throwing immediately`);
        
        // 转换为用户友好的多语言错误消息
        const errorInput = primaryError instanceof Error ? primaryError : String(primaryError);
        const userFriendlyError = ErrorClassifier.classify(errorInput, locale);
        ErrorLogger.log(userFriendlyError, {
          provider: this.primary.name,
          retryable: false,
        });
        
        const error = new Error(userFriendlyError.message) as any;
        error.code = userFriendlyError.code;
        error.shouldShowPricing = userFriendlyError.shouldShowPricing;
        throw error;
      }

      // Try fallback provider
      try {
        console.log(`🔄 [ProviderRouter] Falling back to: ${this.fallback.name}`);
        this.stats.fallbackAttempts++;

        const images = await this.withTimeout(
          this.fallback.generateImages(prompt, config),
          this.timeout,
          `${this.fallback.name} timeout`
        );

        this.stats.fallbackSuccesses++;
        console.log(`✅ [ProviderRouter] Fallback provider (${this.fallback.name}) succeeded`);

        return {
          images,
          provider: this.fallback.name,
          fallbackUsed: true,
        };

      } catch (fallbackError) {
        // Both providers failed
        this.stats.fallbackFailures++;
        
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error(`❌ [ProviderRouter] Fallback provider (${this.fallback.name}) failed: ${fallbackErrorMessage}`);
        console.error(`💥 [ProviderRouter] All providers failed`);

        // 选择最合适的错误返回给用户（支持多语言）
        const primaryErrorInput = primaryError instanceof Error ? primaryError : String(primaryError);
        const fallbackErrorInput = fallbackError instanceof Error ? fallbackError : String(fallbackError);
        const userFriendlyError = ErrorClassifier.selectBestError([
          primaryErrorInput,
          fallbackErrorInput,
        ], locale);

        // 记录技术错误信息
        ErrorLogger.log(userFriendlyError, {
          primaryProvider: this.primary.name,
          fallbackProvider: this.fallback.name,
          primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });

        // 抛出用户友好的错误
        const error = new Error(userFriendlyError.message) as any;
        error.code = userFriendlyError.code;
        error.shouldShowPricing = userFriendlyError.shouldShowPricing;
        throw error;
      }
    }
  }

  /**
   * Determine if an error should trigger a retry with fallback provider
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true; // Unknown error, try fallback
    }

    const message = error.message.toLowerCase();

    // Don't retry for these errors (user/input issues - both providers will fail)
    const nonRetryableErrors = [
      'invalid parameter',
      'bad request',
      'content policy',
      'nsfw',
      'inappropriate content',
    ];

    for (const nonRetryable of nonRetryableErrors) {
      if (message.includes(nonRetryable)) {
        return false;
      }
    }

    // Retry for authentication/authorization errors (provider config issues)
    // These errors mean the current provider has issues, but fallback might work
    const retryableAuthErrors = [
      'unauthorized',
      'authentication failed',
      'invalid api key',
      'forbidden',
      '401',
      '403',
    ];

    for (const retryable of retryableAuthErrors) {
      if (message.includes(retryable)) {
        return true;
      }
    }

    // Retry for service errors
    const retryableServiceErrors = [
      'timeout',
      'service unavailable',
      '503',
      '429', // Rate limit
      '500', // Internal server error
      '502', // Bad gateway
      '504', // Gateway timeout
      'network error',
      'connection',
      'econnrefused',
      'enotfound',
      'capacity',
      'overloaded',
    ];

    for (const retryable of retryableServiceErrors) {
      if (message.includes(retryable)) {
        return true;
      }
    }

    // Default: retry (conservative approach)
    return true;
  }

  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    const totalAttempts = this.stats.primaryAttempts + this.stats.fallbackAttempts;
    const fallbackRate = totalAttempts > 0
      ? (this.stats.fallbackAttempts / totalAttempts * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      totalAttempts,
      fallbackRate: `${fallbackRate}%`,
    };
  }

  /**
   * Log statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log(`📊 [ProviderRouter] Statistics:
  Primary (${this.primary.name}):
    - Attempts: ${stats.primaryAttempts}
    - Successes: ${stats.primarySuccesses}
    - Failures: ${stats.primaryFailures}
  Fallback (${this.fallback.name}):
    - Attempts: ${stats.fallbackAttempts}
    - Successes: ${stats.fallbackSuccesses}
    - Failures: ${stats.fallbackFailures}
  Overall:
    - Total Attempts: ${stats.totalAttempts}
    - Fallback Rate: ${stats.fallbackRate}
`);
  }
}
