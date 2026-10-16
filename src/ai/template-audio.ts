import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

/** Keep the generated picture and replace its sound with the template clip, trimmed to the picture length. */
export async function attachTemplateAudio(video: Uint8Array, template: Uint8Array): Promise<Uint8Array> {
  const picture = new Input({ formats: ALL_FORMATS, source: new BufferSource(video) });
  const soundtrack = new Input({ formats: ALL_FORMATS, source: new BufferSource(template) });
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
}
