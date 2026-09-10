import type { Section, SectionItem } from "./section";
import type { Image } from "./base";

export type LandingModuleType =
  | "hero" | "tool" | "intro" | "features" | "benefits" | "steps"
  | "examples" | "content" | "toc" | "related" | "pricing"
  | "testimonials" | "faq" | "cta" | "branding" | "stats";

export type LandingSurface = "default" | "alt" | "emphasis";

export interface LandingModule {
  /** Unique DOM anchor, also used by the generated table of contents. */
  id: string;
  type: LandingModuleType | (string & {});
  /** A key in page.sections or an existing top-level content field. */
  source?: string;
  disabled?: boolean;
  /** Named entry in page.tools, supported on hero and standalone tool modules. */
  tool?: string;
  include_in_toc?: boolean;
  /**
   * Section band background. Uses CSS variables (--section-surface*).
   * Omit to auto-alternate (cta defaults to emphasis).
   */
  surface?: LandingSurface;
}

export interface LandingTool {
  type: string;
  disabled?: boolean;
  config?: Record<string, unknown>;
}

export interface ExampleValue {
  label?: string;
  text?: string;
  image?: Image;
}

export interface LandingSectionItem extends SectionItem {
  paragraphs?: string[];
  input?: ExampleValue;
  output?: ExampleValue;
  action?: {
    label: string;
    tool: string;
    values: Record<string, string>;
  };
}

export interface LandingSection extends Section {
  items?: LandingSectionItem[];
  paragraphs?: string[];
  /** Plain text comparison data, never injected HTML. */
  table?: { caption?: string; columns: string[]; rows: string[][] };
  layout?: "default" | "stacked";
}
