const BEATS_EN = [
  "both stand still and trade short phrases toward the microphone, hands near the waist",
  "the person on the right reaches both hands forward; the person on the left gestures at chest height",
  "both look down at their own hands and gesture",
  "they face each other again and trade short phrases with playful hand gestures",
];

const BEATS_ZH = [
  "两人站着，对着麦克风轮流说短句，手在腰腹附近",
  "右侧的人双手向前伸，左侧的人在胸前做手势",
  "两人都低头看自己的手并做手势",
  "两人重新面对面，用轻松的手势轮流说短句",
];

/** Four beats spread across the selected duration. */
export function duoImageBeats(duration: number): [number, number][] {
  const count = BEATS_EN.length;
  return Array.from({ length: count }, (_, index) => {
    const start = Math.round((duration * index) / count);
    const end = index === count - 1 ? duration : Math.round((duration * (index + 1)) / count);
    return [start, end] as [number, number];
  }).filter(([start, end]) => end > start);
}

/** Visible prompt for the photo route. Duration and aspect follow the form. */
export function duoImagePrompt(locale: "en" | "zh", duration: number, aspectRatio: string): string {
  const beats = duoImageBeats(duration).map(([start, end], index) => {
    const action = locale === "zh" ? BEATS_ZH[index] : BEATS_EN[index];
    return `${start}-${end}s: ${action}.`;
  });
  if (locale === "zh") {
    return [
      `实拍棚内画面，${aspectRatio}，机位锁定的中景双人，正面柔和均匀的光。`,
      "纯橙色无缝背景。画面正上方正中悬挂一支银色电容麦克风。画面里没有其他物体。不要商标、水印、字幕或角落标记。",
      "Reference image 1 站在左侧。Reference image 2 站在右侧。两人隔着麦克风面对面。脸和衣服与各自的参考图保持一致。不要额外添加首饰，也不要更换衣服。",
      ...beats,
      "声音：原创、有弹性的节奏，鼓点清楚，两个人对着麦克风轮流说短句，轻松、节奏偏快。",
    ].join("\n");
  }
  return [
    `Live-action studio footage, ${aspectRatio}, locked medium two-shot, soft even frontal light.`,
    "Seamless saturated orange backdrop. One silver condenser microphone hangs at top center. Nothing else in the frame. No logos, watermarks, captions, or corner marks.",
    "Reference image 1 stands on the left. Reference image 2 stands on the right. They face each other across the microphone. Keep each face and outfit exactly as in the reference photo. Do not add jewelry or change clothes.",
    ...beats,
    "Audio: original bouncy groove, punchy drums, two people trading short spoken phrases toward the microphone, playful and upbeat.",
  ].join("\n");
}
