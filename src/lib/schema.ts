/**
 * Schema.org 结构化数据生成工具
 * 用于生成符合 Google 2026 SEO 标准的 JSON-LD 数据
 */

import { getBaseUrl } from "./utils";

// ========================================
// 基础 Schema 类型
// ========================================

/**
 * 生成 Organization Schema
 * 用于品牌识别和知识图谱
 */
export function generateOrganizationSchema(params?: {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}) {
  const baseUrl = getBaseUrl();
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": params?.name || "ShipFire",
    "url": params?.url || baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": params?.logo || `${baseUrl}/logo.png`,
    },
    "description": params?.description || "Next.js SaaS Boilerplate - Ship your product in days, not months",
    "sameAs": params?.sameAs || [
      process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/shipfire",
      process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/shipfire",
    ],
  };
}

/**
 * 生成 WebSite Schema
 * 用于搜索框功能和网站识别
 */
export function generateWebSiteSchema(params?: {
  name?: string;
  url?: string;
  description?: string;
  searchUrl?: string;
}) {
  const baseUrl = getBaseUrl();
  
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": params?.name || "ShipFire",
    "url": params?.url || baseUrl,
    "description": params?.description || "Next.js SaaS Boilerplate",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": params?.searchUrl || `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ========================================
// FAQ Schema
// ========================================

export interface FAQItem {
  title?: string;
  question?: string;
  description?: string;
  answer?: string;
}

/**
 * 生成 FAQPage Schema
 * 用于 FAQ 富媒体搜索结果
 */
export function generateFAQSchema(items?: FAQItem[]) {
  if (!items || items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.title || item.question || "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.description || item.answer || "",
      },
    })),
  };
}

// ========================================
// Review & Rating Schema
// ========================================

export interface TestimonialItem {
  title?: string;
  name?: string;
  label?: string;
  role?: string;
  description?: string;
  review?: string;
  image?: {
    src?: string;
    alt?: string;
  };
  rating?: number;
}

/**
 * 生成 Product + AggregateRating Schema
 * 用于显示星级评分和用户评价
 */
export function generateProductWithReviewsSchema(params: {
  productName: string;
  description?: string;
  testimonials: TestimonialItem[];
  ratingValue?: number;
}) {
  const { productName, description, testimonials, ratingValue = 5 } = params;
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productName,
    "description": description || `${productName} - Next.js SaaS Boilerplate`,
    "image": `${baseUrl}/logo.png`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingValue.toString(),
      "bestRating": "5",
      "worstRating": "1",
      "reviewCount": testimonials.length.toString(),
    },
    "review": testimonials.map((item) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": item.title || item.name || "Anonymous",
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": (item.rating || 5).toString(),
        "bestRating": "5",
        "worstRating": "1",
      },
      "reviewBody": item.description || item.review || "",
    })),
  };
}

// ========================================
// Article/BlogPosting Schema
// ========================================

export interface ArticleSchemaParams {
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorImage?: string;
  url?: string;
}

/**
 * 生成 BlogPosting Schema
 * 用于博客文章富媒体搜索结果
 */
export function generateArticleSchema(params: ArticleSchemaParams) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": params.headline,
    "description": params.description || params.headline,
    "image": params.image || `${baseUrl}/logo.png`,
    "datePublished": params.datePublished || new Date().toISOString(),
    "dateModified": params.dateModified || params.datePublished || new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": params.authorName || "ShipFire Team",
      "image": params.authorImage,
    },
    "publisher": {
      "@type": "Organization",
      "name": "ShipFire",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`,
      },
    },
    "url": params.url || baseUrl,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": params.url || baseUrl,
    },
  };
}

// ========================================
// BreadcrumbList Schema
// ========================================

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * 生成 BreadcrumbList Schema
 * 用于面包屑导航
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

// ========================================
// Product/Offer Schema (for Pricing)
// ========================================

export interface PricingSchemaParams {
  name: string;
  description?: string;
  price: number;
  priceCurrency?: string;
  interval?: string;
  features?: string[];
}

/**
 * 生成 Product + Offer Schema
 * 用于价格页面
 */
export function generatePricingSchema(params: PricingSchemaParams) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": params.name,
    "description": params.description || params.name,
    "image": `${baseUrl}/logo.png`,
    "offers": {
      "@type": "Offer",
      "price": params.price.toString(),
      "priceCurrency": params.priceCurrency || "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      "url": baseUrl,
    },
  };
}

// ========================================
// WebApplication Schema (for Tools)
// ========================================

export interface WebApplicationSchemaParams {
  name: string;
  description: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
}

/**
 * 生成 WebApplication Schema
 * 用于工具页面
 */
export function generateWebApplicationSchema(params: WebApplicationSchemaParams) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": params.name,
    "description": params.description,
    "url": params.url || baseUrl,
    "applicationCategory": params.applicationCategory || "DeveloperApplication",
    "operatingSystem": params.operatingSystem || "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };
}
