export const VIDEO_TEXT_SAMPLE_PROMPTS = [
  "A serene Japanese garden with cherry blossoms falling gently in the breeze.",
  "A red sports car driving through a neon-lit city at night, smooth tracking shot.",
  "Ocean waves crashing on a rocky shore at golden hour, cinematic slow motion.",
  "A barista pouring latte art in a cozy café, warm morning light through the window.",
  "An astronaut floating above Earth, stars shimmering in the background.",
  "A golden retriever running through a sunlit meadow, camera following from behind.",
  "Rain falling on a city street at night, reflections on wet pavement, moody atmosphere.",
  "Northern lights dancing over a frozen lake, wide cinematic view.",
] as const;

export const VIDEO_IMAGE_MOTION_SAMPLE_PROMPTS = [
  "Gentle camera push-in with soft natural lighting and subtle parallax.",
  "Slow zoom out revealing more of the scene with cinematic depth of field.",
  "Smooth pan from left to right with light wind moving hair and fabric.",
  "Subtle handheld motion with realistic ambient movement in the background.",
] as const;

export function pickRandomSample<T extends string>(pool: readonly T[], exclude?: string): T {
  if (pool.length === 0) return "" as T;
  const candidates = exclude ? pool.filter((item) => item !== exclude) : [...pool];
  const list = candidates.length > 0 ? candidates : [...pool];
  return list[Math.floor(Math.random() * list.length)];
}
