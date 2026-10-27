import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

/** Metadata checks do not decode or re-encode the uploaded video. */
export async function inspectTemplateVideo(bytes: Uint8Array, expectedDuration: number, requireAudio = true) {
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new Error("Template has no video track");
    const duration = await input.computeDuration();
    if (!Number.isFinite(duration) || Math.abs(duration - expectedDuration) > 0.25) throw new Error(`Video must contain the complete ${expectedDuration}-second performance`);
    const width = await video.getDisplayWidth();
    const height = await video.getDisplayHeight();
    if (requireAudio && !(await input.getPrimaryAudioTrack())) throw new Error("Template video has no audio");
    return { duration, width, height };
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
    if (!templateAudio) throw new Error("Template video has no audio");
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
