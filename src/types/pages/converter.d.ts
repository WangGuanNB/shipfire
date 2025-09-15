export interface ConverterPage {
  metadata: {
    title: string;
    description: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    features: {
      free: string;
      no_registration: string;
      instant: string;
      official_palette: string;
    };
  };
  tool: {
    title: string;
    description: string;
  };
  upload: {
    title: string;
    click_upload: string;
    format_support: string;
    processing: string;
    download: string;
    copy: string;
  };
  settings: {
    title: string;
    pixel_size: string;
    scale: string;
    zoom_level: string;
    show_grid: string;
  };
  color_stats: {
    title: string;
    total: string;
    free: string;
    premium: string;
    blocks: string;
  };
  palette: {
    title: string;
    all: string;
    free_only: string;
    premium_note: string;
  };
  features: {
    title: string;
    instant: {
      title: string;
      description: string;
    };
    official: {
      title: string;
      description: string;
    };
    analysis: {
      title: string;
      description: string;
    };
  };
  how_to_use: {
    title: string;
    steps: {
      upload: {
        title: string;
        description: string;
      };
      adjust: {
        title: string;
        description: string;
      };
      analyze: {
        title: string;
        description: string;
      };
      download: {
        title: string;
        description: string;
      };
    };
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  faq: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}
