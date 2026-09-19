import { Header } from "@/types/blocks/header";
import { Hero } from "@/types/blocks/hero";
import { Section } from "@/types/blocks/section";
import { Footer } from "@/types/blocks/footer";
import { Pricing } from "@/types/blocks/pricing";
import { LandingModule, LandingSection, LandingTool } from "@/types/blocks/landing";

export interface LandingPage {
  /** Absent on legacy pages, which keep their original section order. */
  page_type?: "tool" | "introduction";
  /** Explicit order. An empty array intentionally renders no body modules. */
  modules?: LandingModule[];
  /** Additional content sources; existing top-level fields remain supported. */
  sections?: Record<string, LandingSection>;
  /** Named tool slots. The tool implementation is registered separately. */
  tools?: Record<string, LandingTool>;
  metadata?: { title: string; description: string; keywords?: string[] };
  /** Stable identifiers consumed by the shared theme and landing-page factory. */
  theme_id?: "saas-minimal" | "saas-product";
  layout_preset?: "product-split" | "centered";
  copy_profile?: "outcome-led" | "technical" | "editorial";
  header?: Header;
  hero?: Hero;
  branding?: Section;
  introduce?: Section;
  benefit?: Section;
  usage?: Section;
  feature?: Section;
  stats?: Section;
  pricing?: Pricing;
  testimonial?: Section;
  faq?: Section;
  cta?: Section;
  footer?: Footer;
}

export interface PricingPage {
  pricing?: Pricing;
  faq?: Section;
}

export interface ImageGeneratorPage extends LandingPage {
  metadata?: {
    title: string;
    description: string;
    keywords?: string[];
  };
  tool?: {
    title?: string;
    description?: string;
    promptPlaceholder?: string;
    styleLabel?: string;
    styles?: { value: string; label: string }[];
    buttonText?: string;
    generatingText?: string;
  };
}
