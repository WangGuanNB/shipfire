/** Shared wait-state copy for async video jobs (template sites). */
export function videoWaitCopy(zh: boolean) {
  if (zh) {
    return {
      generating: "正在生成视频…",
      hintKeepOpen: "通常需要 2–5 分钟，请保持此页面打开。",
      hintResultBelow: "通常需要 2–5 分钟。完成后会显示在下方，也可在「我的视频」查看进度。",
      hintResultRight: "通常需要 2–5 分钟。完成后会显示在右侧。",
      queued: "任务排队中…",
      submitting: "正在提交任务…",
      uploading: "正在上传图片…",
    };
  }
  return {
    generating: "Generating your video…",
    hintKeepOpen: "This usually takes 2–5 minutes. Please keep this tab open.",
    hintResultBelow: "This usually takes 2–5 minutes. Your clip will appear below when ready—you can also check My videos.",
    hintResultRight: "This usually takes 2–5 minutes. The result will appear on the right when ready.",
    queued: "Waiting in queue…",
    submitting: "Preparing your request…",
    uploading: "Uploading image…",
  };
}
