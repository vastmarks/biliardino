// ESLint 9 "flat config" (one JavaScript file instead of .eslintrc.json).
// Same rules as before: Next.js' recommended set, including Core Web Vitals checks.
// https://nextjs.org/docs/app/api-reference/config/eslint
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "next-env.d.ts",
    "design/**",
    "coverage/**",
    "src/generated/**",
  ]),
]);
