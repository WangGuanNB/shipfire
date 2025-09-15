export interface ColorPage {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
  loading: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    features: {
      quality: string;
      privacy: string;
      preview: string;
    };
  };
  upload: {
    title: string;
    heading: string;
    description: string;
    support: string;
    processing: string;
    download: string;
  };
  settings: {
    title: string;
    pixel_size: string;
    preview_scale: string;
    show_grid: string;
  };
  status: {
    title: string;
    image_loaded: string;
    file: string;
    size: string;
    colors_used: string;
    total: string;
    free: string;
    premium: string;
    no_image: string;
    upload_to_start: string;
    description: string;
  };
  palette: {
    title: string;
    premium_section: string;
    premium_identification: string;
    standard_colors: string;
    standard_description: string;
    integration_title: string;
    integration_description: string;
  };
  why_choose: {
    title: string;
    free: {
      title: string;
      description: string;
    };
    privacy: {
      title: string;
      description: string;
    };
    accuracy: {
      title: string;
      description: string;
    };
  };
  how_to_use: {
    title: string;
    description: string;
    steps: {
      upload: {
        title: string;
        description: string;
      };
      convert: {
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
  why_choose_details: {
    free: {
      prefix: string;
      suffix: string;
    };
    privacy: {
      description: string;
    };
    interface: {
      title: string;
      description: string;
    };
    no_limits: {
      title: string;
      description: string;
    };
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: Array<{
      rating: string;
      text: string;
      author: string;
    }>;
  };
}
