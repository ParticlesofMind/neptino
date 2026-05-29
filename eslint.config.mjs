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
    "legacy/**",
    "coverage/**",
    "test-results/**",
    ".playwright-cli/**",
    "output/**",
    "firefox-extension/**",
    "chrome-extension/**",
    "public/vendor/**",
    "tmp-*.cjs",
    "tmp-*.mjs",
    "repro-*.cjs",
    ".tmp-*.cjs",
    "e2e/.tmp-*.spec.ts",
  ]),
]);

export default eslintConfig;
