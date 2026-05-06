import { createRequire } from 'node:module';
import type { Linter } from 'eslint';

const requireFromConfig = createRequire(__filename);
const tsPlugin = requireFromConfig('@typescript-eslint/eslint-plugin');
const tsParser = requireFromConfig('@typescript-eslint/parser');

const commonRules = {
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
} satisfies Linter.RulesRecord;

const config = [
  {
    ignores: [
      'build-dir/**',
      'dist/**',
      '.build/**',
      'node_modules/**',
      'repo/**',
      'electron/preload/canva.bundle.js',
      '.flatpak-builder/**',
    ],
  },
  {
    files: [
      'electron/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    settings: {
      'import/extensions': ['.js', '.ts'],
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
    rules: {
      ...commonRules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'eslint.config.ts',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...commonRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'electron/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      'packaging/flathub/scripts/**/*.ts',
      'playwright.config.ts',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    settings: {
      'import/extensions': ['.js', '.ts'],
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...commonRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
] satisfies Linter.Config[];

export default config;
