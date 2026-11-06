import type { NextConfig } from "next";

// `next dev` tooling evaluates strings and Vercel Analytics loads its debug
// script from va.vercel-scripts.com; production builds need neither.
const isDev = process.env.NODE_ENV === "development";

// Enforced Content-Security-Policy. It ran report-only on prod first, and a
// signed-in pass on 2026-11-05 (N400 app incl. address autocomplete and audio,
// admin incl. question audio, portal, public pages) logged zero violations.
// It lists everything the site calls: Geoapify (N400 address autocomplete),
// Supabase (API, realtime, storage), GA4 incl. regional endpoints, Meta Pixel,
// and Sentry ingest so turning on a DSN later is not silently blocked.
// Adding a third-party script, iframe or API? Add its host here or it breaks.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.facebook.net https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.geoapify.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://www.facebook.com https://graph.facebook.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: csp },
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
  async redirects() {
    return [
      {
        // The old Categories page ("Conquest Map") lost every link in the July
        // 2026 navigation redesign and was deleted on 2026-11-05.
        source: "/n400ready/categories",
        destination: "/n400ready/study/civics",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
