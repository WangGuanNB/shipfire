import { cache } from 'react';
import { LandingPage, PricingPage, ShowcasePage, AboutPage, ImageGeneratorPage } from "@/types/pages/landing";
import { replaceSocialMediaUrls } from "@/lib/utils";
import {
  getAvailableGroups,
  getPricingTabAllowlist,
  type PricingTabGroup,
} from "@/services/config";

export const getLandingPage = cache(async (locale: string): Promise<LandingPage> => {
  const pageData = (await getPage("landing", locale)) as LandingPage;
  // 注入环境变量配置的社交媒体链接
  return replaceSocialMediaUrls(pageData);
});

export const getPricingPage = cache(async (locale: string): Promise<PricingPage> => {
  const page = (await getPage("pricing", locale)) as PricingPage;

  if (!page.pricing) return page;

  // 根据环境变量过滤可用的 Tab（groups）和对应套餐（items）
  const available = getAvailableGroups();

  const groupMap: Record<string, boolean> = {
    monthly: available.monthly,
    yearly: available.yearly,
    "one-time": available.onetime,
  };

  const availableGroupNames = Object.entries(groupMap)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  const tabAllowlist = getPricingTabAllowlist();
  const effectiveGroupNames =
    tabAllowlist && tabAllowlist.length > 0
      ? availableGroupNames.filter((name) =>
          tabAllowlist.includes(name as PricingTabGroup)
        )
      : availableGroupNames;

  if (effectiveGroupNames.length === 0) {
    // 没有任何可用模式，整个定价区块关闭
    page.pricing.disabled = true;
    return page;
  }

  const filteredGroups = (page.pricing.groups ?? []).filter(
    (g) => g.name && effectiveGroupNames.includes(g.name)
  );

  if (tabAllowlist && tabAllowlist.length > 0) {
    const order = new Map<PricingTabGroup, number>(
      tabAllowlist.map((n, i) => [n, i])
    );
    page.pricing.groups = [...filteredGroups].sort((a, b) => {
      const ia =
        a.name != null ? order.get(a.name as PricingTabGroup) ?? 99 : 99;
      const ib =
        b.name != null ? order.get(b.name as PricingTabGroup) ?? 99 : 99;
      return ia - ib;
    });
  } else {
    page.pricing.groups = filteredGroups;
  }

  page.pricing.items = (page.pricing.items ?? []).filter(
    (item) => !item.group || effectiveGroupNames.includes(item.group)
  );

  return page;
});

export const getShowcasePage = cache(async (locale: string): Promise<ShowcasePage> => {
  return (await getPage("showcase", locale)) as ShowcasePage;
});

export const getAboutPage = cache(async (locale: string): Promise<AboutPage> => {
  return (await getPage("about", locale)) as AboutPage;
});

export const getImageGeneratorPage = cache(async (locale: string): Promise<ImageGeneratorPage> => {
  return (await getPage("image-generator", locale)) as ImageGeneratorPage;
});

export async function getPage(
  name: string,
  locale: string
): Promise<LandingPage | PricingPage | ShowcasePage | AboutPage | ImageGeneratorPage> {
  try {
    if (locale === "zh-CN") {
      locale = "zh";
    }

    const result = await import(
      `@/i18n/pages/${name}/${locale.toLowerCase()}.json`
    ).then((module) => module.default);
    return result;
  } catch (error) {
    console.warn(`Failed to load ${name}/${locale}.json, falling back to en.json`);

    return await import(`@/i18n/pages/${name}/en.json`).then(
      (module) => module.default
    );
  }
}
