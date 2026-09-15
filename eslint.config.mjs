import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...nextVitals,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["app/**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // node-pg-migrate passes `pgm` to every up/down; an irreversible or no-op step leaves it unused.
    files: ["migrations/**/*.js"],
    rules: {
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
  // Must stay last: turns off stylistic rules that conflict with Prettier.
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
