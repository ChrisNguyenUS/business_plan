import type { NextConfig } from "next";
import path from "path";

// The internal app shows client PII, so every response gets browser
// hardening. Framing is same-origin only (SAMEORIGIN, not DENY): the case PDF
// page shows /api/pdf/... in an iframe of its own. The CSP holds only
// directives that cannot break the app's own scripts and styles; form-action
// is left out because Chrome applies it to the redirect after a form post, and
// sign-out redirects to NEXT_PUBLIC_SITE_URL. X-Robots-Tag keeps search
// engines from indexing any page or file: this is a staff-only tool.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  transpilePackages: ["@mannaos/n400-growth"],
  turbopack: {
    root: path.join(process.cwd(), "../../"),
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
