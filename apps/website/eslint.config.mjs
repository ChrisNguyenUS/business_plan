import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference UI dump — not imported anywhere, kept as a styling
    // reference for the n400 redesign. Don't lint it.
    "N400UIHTML/**",
    // Service Worker (hand-tuned vanilla JS) — its `err` catch param is
    // intentionally unused since the catch arm only branches on type.
    "public/sw-n400.js",
    // Playwright suites have their own runner + globals.
    "e2e/**",
  ]),
  // Test files: allow `any` in stubs. Reproducing the full Supabase
  // chainable-client types in test fakes is more code than the tests
  // themselves and adds zero correctness — the tests assert observable
  // behavior, not type shape.
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // tsx scripts (one-off seed/verify tooling): same reasoning — typing
  // the Supabase chainable builder generically is more code than the
  // script itself, and these never ship to runtime.
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
