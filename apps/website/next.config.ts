import type { NextConfig } from "next";

// Full policy, report-only: browsers log what it would block and nothing
// breaks. It must list everything the site calls (N400 address autocomplete
// → Geoapify, admin audio → Supabase storage, GA4 regional endpoints).
// Enforcing script-src/connect-src needs a pass over the signed-in N400 pages
// first (autocomplete, voice, OAuth).
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.facebook.net https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.geoapify.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://www.facebook.com https://graph.facebook.com",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

// Enforced: only directives that cannot break the site's own scripts, styles,
// images or API calls (the site has no <object>, <embed>, <base> or iframes).
const cspEnforced = ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: cspEnforced },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ffsrlmtqzlidnuitkdvw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
  transpilePackages: ["@mannaos/n400-growth"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Service Worker is fetched on every page load that registers
        // it. A long cache here would silently lock learners on a
        // stale SW after a deploy — must-revalidate forces the
        // browser to ask each time.
        source: "/sw-n400.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
