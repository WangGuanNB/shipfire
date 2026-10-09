"use client";

import { useLocale } from "next-intl";
import { useAppContext } from "@/contexts/app";
import { useAITasks } from "@/hooks/use-ai-tasks";
import HistoryList from "./history-list";

export default function HistoryPage() {
  const locale = useLocale();
  const zh = locale === "zh";
  const { user } = useAppContext();
  const { tasks } = useAITasks("", user?.uuid);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{zh ? "历史记录" : "History"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {zh
          ? "查看你生成的图片与视频，支持下载。"
          : "View and download your generated images and videos."}
      </p>
      <HistoryList tasks={tasks} locale={locale} />
    </div>
  );
}
