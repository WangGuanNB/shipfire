import type { ToolInput } from "../types";

export type KieVideoMapper = "seedance" | "seedance2" | "wan";

/** Seedance 1.5 Pro — uses input_urls for image mode. */
export function mapSeedanceInput(input: ToolInput): Record<string, unknown> {
  const base = {
    prompt: String(input.prompt ?? "").trim(),
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
    duration: input.duration,
    fixed_lens: false,
    generate_audio: false,
  };
  if (input.mode === "image" && input.imageUrl) {
    return { ...base, input_urls: [input.imageUrl] };
  }
  return base;
}

/** Seedance 2 / 2 Fast — uses first_frame_url for image mode. */
export function mapSeedance2Input(input: ToolInput): Record<string, unknown> {
  const base = {
    prompt: String(input.prompt ?? "").trim(),
    resolution: input.resolution,
    aspect_ratio: input.aspectRatio,
    duration: input.duration,
    generate_audio: false,
    web_search: false,
    nsfw_checker: false,
    return_last_frame: false,
  };
  if (input.mode === "image" && input.imageUrl) {
    return { ...base, first_frame_url: input.imageUrl };
  }
  return base;
}

/** Wan 2.6 — duration is a string; separate T2V/I2V endpoints via providerModels. */
export function mapWanInput(input: ToolInput): Record<string, unknown> {
  const base = {
    prompt: String(input.prompt ?? "").trim(),
    resolution: input.resolution,
    duration: String(input.duration),
    multi_shots: false,
    nsfw_checker: false,
  };
  if (input.mode === "image" && input.imageUrl) {
    return { ...base, image_urls: [input.imageUrl] };
  }
  return base;
}

export function mapKieInput(mapper: KieVideoMapper, input: ToolInput): Record<string, unknown> {
  switch (mapper) {
    case "seedance":
      return mapSeedanceInput(input);
    case "seedance2":
      return mapSeedance2Input(input);
    case "wan":
      return mapWanInput(input);
  }
}
