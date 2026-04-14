/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "@next/next/no-html-link-for-pages": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }]
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/"
  ]
};
