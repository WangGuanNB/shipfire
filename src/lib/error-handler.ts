/**
 * 错误处理工具
 * 将技术错误转换为用户友好的提示信息（支持多语言）
 */

export enum ErrorCode {
  // 用户侧错误
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  
  // 服务侧错误
  SERVICE_BUSY = 'SERVICE_BUSY',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 系统错误
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface UserFriendlyError {
  code: ErrorCode;
  message: string;
  technicalMessage?: string; // 仅用于日志
  shouldShowPricing?: boolean; // 是否应该弹出购买页面
}

// 错误消息多语言映射
const ERROR_MESSAGES: Record<ErrorCode, Record<string, string>> = {
  [ErrorCode.INSUFFICIENT_CREDITS]: {
    en: 'Insufficient credits. Please purchase more credits to continue.',
    zh: '您的积分不足，请充值后继续使用',
  },
  [ErrorCode.CONTENT_POLICY_VIOLATION]: {
    en: 'Content does not meet our guidelines. Please modify and try again.',
    zh: '内容不符合规范，请修改后重试',
  },
  [ErrorCode.INVALID_PARAMETER]: {
    en: 'Invalid input parameters. Please check and try again.',
    zh: '输入参数有误，请检查后重试',
  },
  [ErrorCode.SERVICE_TIMEOUT]: {
    en: 'Generation is taking longer than expected. Please try again later.',
    zh: '生成时间较长，请稍后重试',
  },
  [ErrorCode.RATE_LIMITED]: {
    en: 'Too many requests. Please try again later.',
    zh: '请求过于频繁，请稍后重试',
  },
  [ErrorCode.SERVICE_BUSY]: {
    en: 'Service is busy. Please try again later.',
    zh: '服务繁忙，请稍后重试',
  },
  [ErrorCode.NETWORK_ERROR]: {
    en: 'Network connection failed. Please check your network and try again.',
    zh: '网络连接失败，请检查网络后重试',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    en: 'Service is temporarily unavailable. Please try again later.',
    zh: '服务暂时不可用，请稍后重试',
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    en: 'Generation failed. Please try again later.',
    zh: '生成失败，请稍后重试',
  },
};

/**
 * 错误分类器
 * 根据原始错误信息判断错误类型
 */
export class ErrorClassifier {
  /**
   * 分类错误并返回用户友好的错误信息
   * @param error 原始错误
   * @param locale 语言代码（en, zh 等）
   */
  static classify(error: Error | string, locale: string = 'en'): UserFriendlyError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerMessage = errorMessage.toLowerCase();

    // 标准化 locale
    const normalizedLocale = this.normalizeLocale(locale);

    // 1. 积分不足（最高优先级）
    if (
      lowerMessage.includes('credits insufficient') ||
      lowerMessage.includes('insufficient credits') ||
      lowerMessage.includes('balance isn\'t enough') ||
      lowerMessage.includes('not enough credits')
    ) {
      return {
        code: ErrorCode.INSUFFICIENT_CREDITS,
        message: ERROR_MESSAGES[ErrorCode.INSUFFICIENT_CREDITS][normalizedLocale],
        technicalMessage: errorMessage,
        shouldShowPricing: true,
      };
    }

    // 2. 内容违规
    if (
      lowerMessage.includes('content policy') ||
      lowerMessage.includes('inappropriate content') ||
      lowerMessage.includes('nsfw') ||
      lowerMessage.includes('违规')
    ) {
      return {
        code: ErrorCode.CONTENT_POLICY_VIOLATION,
        message: ERROR_MESSAGES[ErrorCode.CONTENT_POLICY_VIOLATION][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 3. 参数错误
    if (
      lowerMessage.includes('invalid parameter') ||
      lowerMessage.includes('bad request') ||
      lowerMessage.includes('validation error') ||
      lowerMessage.includes('参数错误')
    ) {
      return {
        code: ErrorCode.INVALID_PARAMETER,
        message: ERROR_MESSAGES[ErrorCode.INVALID_PARAMETER][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 4. 超时
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('took too long') ||
      lowerMessage.includes('超时')
    ) {
      return {
        code: ErrorCode.SERVICE_TIMEOUT,
        message: ERROR_MESSAGES[ErrorCode.SERVICE_TIMEOUT][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 5. 限流
    if (
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many requests') ||
      lowerMessage.includes('429')
    ) {
      return {
        code: ErrorCode.RATE_LIMITED,
        message: ERROR_MESSAGES[ErrorCode.RATE_LIMITED][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 6. 服务繁忙
    if (
      lowerMessage.includes('service unavailable') ||
      lowerMessage.includes('503') ||
      lowerMessage.includes('capacity') ||
      lowerMessage.includes('overloaded') ||
      lowerMessage.includes('繁忙')
    ) {
      return {
        code: ErrorCode.SERVICE_BUSY,
        message: ERROR_MESSAGES[ErrorCode.SERVICE_BUSY][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 7. 网络错误
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('网络')
    ) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 8. 服务不可用（配置问题，如 API Key 错误）
    if (
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('401') ||
      lowerMessage.includes('403') ||
      lowerMessage.includes('invalid api key') ||
      lowerMessage.includes('authentication failed') ||
      lowerMessage.includes('api error')
    ) {
      return {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: ERROR_MESSAGES[ErrorCode.SERVICE_UNAVAILABLE][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 9. 任务失败（provider 特定错误）
    if (
      lowerMessage.includes('task failed') ||
      lowerMessage.includes('no images') ||
      lowerMessage.includes('generation failed')
    ) {
      return {
        code: ErrorCode.UNKNOWN_ERROR,
        message: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR][normalizedLocale],
        technicalMessage: errorMessage,
      };
    }

    // 10. 未知错误（默认）
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR][normalizedLocale],
      technicalMessage: errorMessage,
    };
  }

  /**
   * 从多个错误中选择最合适的返回给用户
   * 优先级：用户侧错误 > 服务侧错误 > 系统错误
   * @param errors 错误列表
   * @param locale 语言代码
   */
  static selectBestError(errors: (Error | string)[], locale: string = 'en'): UserFriendlyError {
    const classifiedErrors = errors.map(e => this.classify(e, locale));

    // 优先级 1: 积分不足（用户必须处理）
    const creditsError = classifiedErrors.find(
      e => e.code === ErrorCode.INSUFFICIENT_CREDITS
    );
    if (creditsError) return creditsError;

    // 优先级 2: 其他用户侧错误
    const userErrors = classifiedErrors.filter(e =>
      [
        ErrorCode.INVALID_PARAMETER,
        ErrorCode.CONTENT_POLICY_VIOLATION,
      ].includes(e.code)
    );
    if (userErrors.length > 0) return userErrors[0];

    // 优先级 3: 服务侧错误
    const serviceErrors = classifiedErrors.filter(e =>
      [
        ErrorCode.SERVICE_TIMEOUT,
        ErrorCode.RATE_LIMITED,
        ErrorCode.SERVICE_BUSY,
      ].includes(e.code)
    );
    if (serviceErrors.length > 0) return serviceErrors[0];

    // 优先级 4: 系统错误
    const systemErrors = classifiedErrors.filter(e =>
      [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE,
      ].includes(e.code)
    );
    if (systemErrors.length > 0) return systemErrors[0];

    // 默认：返回第一个错误
    return classifiedErrors[0] || {
      code: ErrorCode.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR][this.normalizeLocale(locale)],
    };
  }

  /**
   * 标准化 locale 代码
   * @param locale 原始 locale（如 zh-CN, zh-cn, zh, en-US, en）
   * @returns 标准化后的 locale（en 或 zh）
   */
  private static normalizeLocale(locale: string): string {
    if (!locale) return 'en';
    
    const lower = locale.toLowerCase();
    
    // 中文变体都映射到 zh
    if (lower.startsWith('zh')) {
      return 'zh';
    }
    
    // 英文变体都映射到 en
    if (lower.startsWith('en')) {
      return 'en';
    }
    
    // 其他语言默认使用英文
    return 'en';
  }
}

/**
 * 日志记录器
 * 记录技术错误信息用于调试
 */
export class ErrorLogger {
  static log(userError: UserFriendlyError, context?: Record<string, any>) {
    console.error('❌ [ErrorHandler] User-facing error:', {
      code: userError.code,
      message: userError.message,
      technicalMessage: userError.technicalMessage,
      shouldShowPricing: userError.shouldShowPricing,
      context,
    });
  }
}
