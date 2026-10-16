import { buildLlmsTxt } from "@/lib/seo/llms-txt";

// Built once at deploy. middleware.ts already skips /llms.txt; before this
// route existed the request fell through to [locale] and returned a 500.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
