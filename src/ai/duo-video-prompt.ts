/** Fixed video-reference prompt. Duration and resolution follow the form. */
export function duoVideoPrompt(locale: "en" | "zh", duration: number, resolution: string): string {
  const settings = locale === "zh"
    ? `输出设置：${duration} 秒，${resolution}。`
    : `Output settings: ${duration} seconds, ${resolution}.`;
  const body = locale === "zh"
    ? [
      "Reference image 1 是画面左侧的人，Reference image 2 是画面右侧的人。其余一切以 Reference video 1 为准，包括背景、光线、构图、动作、节奏和镜头。",
      "只替换这两个人。整段视频里，每个人都固定对应原来的一侧。脸、发型、肤色、衣服、配饰、身材比例和相对身高都跟各自的照片保持一致。",
      "参照视频的背景保持原样，包括物体、颜色、反光和空间位置。不要加人、字幕、商标或角落标记。",
      "跟随原片两个人的姿态、手势、位置、间距、互动和动作时间。镜头角度、取景和剪辑节奏也跟原片一致；原片没有硬切时就保持锁定镜头。",
      "成片除了两名主角换成参考图里的人，其余与参照视频一致。",
      "避免身份对调、脸融合、面部变形、换衣服、多出的人、多余肢体、手部扭曲、闪烁，以及原片里没有的突然运镜。",
    ]
    : [
      "Use Reference image 1 as the person on the left and Reference image 2 as the person on the right. Use Reference video 1 for everything else: background, lighting, composition, movements, timing, and camera.",
      "Replace only those two people. Keep each uploaded person matched to the same side for the whole clip. Preserve each person's face, hairstyle, skin tone, outfit, accessories, body proportions, and relative height from their own photo.",
      "Keep the reference video's background unchanged, including objects, colors, reflections, and spatial arrangement. Do not add people, captions, logos, or corner marks.",
      "Follow the two original characters' posture, gestures, positions, spacing, interactions, and movement timing. Preserve the original camera angle, framing, and editing pace, including a locked shot when the reference has no cuts.",
      "The result should match the reference video except that its two main characters are the two people from the reference images.",
      "Avoid identity swaps, merged faces, facial distortion, changed outfits, extra people, duplicated limbs, warped hands, flickering, and sudden camera moves that are not in the reference video.",
    ];
  return [...body, settings].join("\n");
}
