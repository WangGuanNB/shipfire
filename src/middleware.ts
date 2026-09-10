import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intl(request) as NextResponse;

  // Match next.config trailingSlash on locale rewrites (/en -> /en/).
  // Keep an absolute rewrite URL (NextURL requires it), but force the
  // request origin so OpenNext/Cloudflare does not proxy localhost≠127.0.0.1.
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (rewrite) {
    try {
      const target = new URL(rewrite, request.nextUrl.origin);
      let changed = false;
      if (!target.pathname.endsWith("/")) {
        target.pathname += "/";
        changed = true;
      }
      if (target.origin !== request.nextUrl.origin) {
        target.protocol = request.nextUrl.protocol;
        target.host = request.nextUrl.host;
        changed = true;
      }
      if (changed) {
        response.headers.set("x-middleware-rewrite", target.toString());
      }
    } catch {
      // Leave the original rewrite header untouched if it is malformed.
    }
  }

  const { pathname } = request.nextUrl;
  const isBlocked =
    pathname === "/docs" ||
    pathname.startsWith("/docs/");

  if (isBlocked) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|ads.txt|.*\\..*|privacy-policy|terms-of-service).*)",
  ],
};
