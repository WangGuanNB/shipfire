import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface HeroWorkflow {
  id: string;
  title: string;
  description: string;
  priceLabel?: string;
  disabled?: boolean;
  placeholder?: boolean;
  beforeImage?: string;
  afterImage?: string;
  action?: {
    label?: string;
    tool: string;
    values: Record<string, string>;
    kind?: "photo-upload" | "video-upload" | "select";
  };
}

export interface HeroPreview {
  video: string;
  poster?: string;
  badge?: string;
  overlayCta?: string;
  caption?: string;
}

export interface HeroFooterLink {
  prefix?: string;
  highlight: string;
  suffix?: string;
  url?: string;
  action?: {
    tool: string;
    values: Record<string, string>;
  };
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  /** Substring in `title` that gets the yellow highlight mark (jean-phil layout). */
  title_mark?: string;
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  images?: Image[];
  video?: {
    src?: string;
    poster?: string;
    title?: string;
  };
  tip?: string;
  show_happy_users?: boolean;
  show_badge?: boolean;
  layout?: string;
  variant?: "default" | "compact" | "split" | "tool" | "jean-phil";
  metrics?: string[];
  preview?: HeroPreview;
  workflows?: HeroWorkflow[];
  footerLinks?: HeroFooterLink[];
  /** Legacy split hero card (non jean-phil). */
  offer?: {
    title?: string;
    description?: string;
    price?: string;
  };
}
