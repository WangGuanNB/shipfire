import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// 避免在 Next 构建阶段对该 Route 进行静态评估，强制运行时动态处理
export const dynamic = "force-dynamic";

// Keep separate English/Chinese indexes; map locale codes to supported tokenizers.
// Fumadocs reads source._i18n, so replacing an unrelated source.i18n has no effect.
const handler = createFromSource(source, {
  localeMap: { en: "english", zh: "english" },
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Preserve `locale=zh`; tokenizer mapping does not change the selected language index.
  return handler.GET(new Request(url));
}
