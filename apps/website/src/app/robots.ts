import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // AI search crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot, …) match "*" too.
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/en/admin", "/vi/admin", "/en/portal", "/vi/portal"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
