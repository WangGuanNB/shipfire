import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// 默认使用英文分词。对于不被 Orama 支持的语言（如 zh），强制回退到 english，避免构建时报
// LANGUAGE_NOT_SUPPORTED 错误。
const handler = createFromSource(source, {
  // https://docs.orama.com/open-source/supported-languages
  language: "english",
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("language");
  if (lang && lang !== "english") {
    url.searchParams.set("language", "english");
  }
  return handler.GET(new Request(url));
}
