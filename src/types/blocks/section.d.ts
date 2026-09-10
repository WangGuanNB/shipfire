import { Image, Button } from "@/types/blocks/base";

export interface SectionItem {
  rating?: number;
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  buttons?: Button[];
  url?: string;
  target?: string;
  children?: SectionItem[];
  list?: string[];
  /** Fills a landing tool slot; does not navigate or start generation. */
  action?: {
    label: string;
    tool: string;
    values: Record<string, string>;
  };
}

export interface Section {
  /** Opt in only when items contain genuine ratings for this product. */
  review_schema?: { product_name: string; description?: string };
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  buttons?: Button[];
  items?: SectionItem[];
}
