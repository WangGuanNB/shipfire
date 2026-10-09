"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export default function ToolHistoryLink() {
  const locale = useLocale();
  const zh = locale === "zh";

  return (
    <p className="text-center text-sm text-muted-foreground">
      {zh ? "生成结果保存在 " : "Results are saved in "}
      <Link href="/history" className="font-medium text-primary underline-offset-2 hover:underline">
        {zh ? "历史记录" : "History"}
      </Link>
      {zh ? "，可随时查看与下载。" : " — view and download anytime."}
    </p>
  );
}
