import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  images?: Image[];
  /** Showcase clip beside the title. Path comes from landing JSON, for example `/video/hero.mp4`. */
  video?: {
    src?: string;
    poster?: string;
    title?: string;
  };
  tip?: string;
  show_happy_users?: boolean;
  show_badge?: boolean;
  layout?: string;
  variant?: "default" | "compact" | "split" | "tool";
  metrics?: string[];
}
