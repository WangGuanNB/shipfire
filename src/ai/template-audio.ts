import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";
import trustedTemplates from "@/config/site-templates.json";

export class TemplateValidationError extends Error {
  constructor(message: string) { super(message); this.name = "TemplateValidationError"; }
}

export type TrustedTemplate = {
  path: string;
  sha256: string;
  bytes: number;
  duration: number;
  width: number;
  height: number;
  audio: boolean;
};

export async function templateSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

/** Exact build-recorded files skip runtime metadata parsing. Other files are fully inspected. */
export async function verifyTemplateForPreflight(bytes: Uint8Array, expectedDuration: number | undefined, requireAudio = true) {
  const digest = bytes.byteLength > 0 ? await templateSha256(bytes) : "";
  const trusted = (trustedTemplates as TrustedTemplate[]).find(item => item.bytes === bytes.byteLength && item.sha256 === digest);
  if (trusted) {
    if (expectedDuration !== undefined && (!Number.isFinite(expectedDuration) || Math.abs(expectedDuration - trusted.duration) > 0.25)) {
      throw new TemplateValidationError(`Video must contain the complete ${expectedDuration}-second performance`);
    }
    if (requireAudio && !trusted.audio) throw new TemplateValidationError("Template video has no audio");
    return { duration: trusted.duration, width: trusted.width, height: trusted.height, verifiedBy: "sha256" as const };
  }
  const info = await inspectTemplateVideo(bytes, expectedDuration, requireAudio);
  return { ...info, verifiedBy: "metadata" as const };
}

/** Metadata checks do not decode or re-encode the uploaded video. Aspect ratio is not fixed. */
export async function inspectTemplateVideo(bytes: Uint8Array, expectedDuration: number | undefined, requireAudio = true) {
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new TemplateValidationError("Template has no video track");
    const duration = await input.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0) throw new TemplateValidationError("Video duration is invalid");
    if (expectedDuration !== undefined && (!Number.isFinite(expectedDuration) || Math.abs(duration - expectedDuration) > 0.25)) throw new TemplateValidationError(`Video must contain the complete ${expectedDuration}-second performance`);
    const width = await video.getDisplayWidth();
    const height = await video.getDisplayHeight();
    const audio = Boolean(await input.getPrimaryAudioTrack());
    if (requireAudio && !audio) throw new TemplateValidationError("Template video has no audio");
    return { duration, width, height, audio };
  } finally {
    input.dispose();
  }
}

/** Keep the generated picture and replace its sound with the template clip, trimmed to the picture length. */
export async function attachTemplateAudio(video: Uint8Array, template: Uint8Array): Promise<Uint8Array> {
  const picture = new Input({ formats: ALL_FORMATS, source: new BufferSource(video) });
  const soundtrack = new Input({ formats: ALL_FORMATS, source: new BufferSource(template) });
  try {
    const templateAudio = await soundtrack.getPrimaryAudioTrack();
    if (!templateAudio) throw new TemplateValidationError("Template video has no audio");
    const duration = await picture.computeDuration();
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const pictureConversion = await Conversion.init({
      input: picture, output, composable: true, audio: { discard: true }, showWarnings: false,
    });
    const soundConversion = await Conversion.init({
      input: soundtrack, output, composable: true, video: { discard: true }, showWarnings: false,
      trim: { start: 0, end: duration },
    });
    if (!pictureConversion.isValid || !soundConversion.isValid) throw new Error("Template audio could not be attached");
    await output.start();
    await Promise.all([pictureConversion.execute(), soundConversion.execute()]);
    await output.finalize();
    if (!target.buffer) throw new Error("Template audio could not be attached");
    return new Uint8Array(target.buffer);
  } finally {
    picture.dispose();
    soundtrack.dispose();
  }
}
