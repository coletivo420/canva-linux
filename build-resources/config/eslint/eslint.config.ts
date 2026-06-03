import type { Linter } from "eslint";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const commonRules = {
  eqeqeq: ["error", "always"],
  "no-duplicate-imports": "error",
  "no-fallthrough": "error",
  "no-return-await": "error",
  "no-throw-literal": "error",
  "no-var": "error",
  "prefer-const": "error",
} satisfies Linter.RulesRecord;

const config = [
  {
    ignores: [
      "build-dir/**",
      "dist/**",
      ".build/**",
      "node_modules/**",
      "repo/**",
      "build-resources/electron/preload/canva.bundle.mjs",
      ".flatpak-builder/**",
    ],
  },
  {
    files: ["build-resources/config/eslint/eslint.config.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin as never,
    },
    rules: {
      ...commonRules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: [
      "build-resources/electron/**/*.ts",
      "scripts/**/*.ts",
      "build-resources/tests/**/*.ts",
      "build-resources/canva-linux/packaging/flathub/scripts/**/*.ts",
      "build-resources/config/playwright/playwright.config.ts",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin as never,
    },
    rules: {
      ...commonRules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
] satisfies Linter.Config[];

export default config;
