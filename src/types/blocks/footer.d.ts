import { Brand, Social, Nav, Agreement, Image } from "@/types/blocks/base";

export interface Badge {
  title: string;
  url: string;
  target?: string;
  /**
   * Footer badges default to nofollow.
   * Set dofollow: true only for explicitly approved partner sites.
   */
  dofollow?: boolean;
  /** @deprecated Prefer omitting dofollow (default nofollow). Kept for older JSON. */
  nofollow?: boolean;
  /** Optional; omit for text-only partner links (preferred). */
  image?: Image;
}

export interface Footer {
  disabled?: boolean;
  name?: string;
  brand?: Brand;
  nav?: Nav;
  copyright?: string;
  social?: Social;
  agreement?: Agreement;
  badge?: Badge; // 保持向后兼容
  badges?: Badge[];
}
