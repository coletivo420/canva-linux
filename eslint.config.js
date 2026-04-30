'use strict';

const importPlugin = require('eslint-plugin-import');

// Runtime .ts files are covered by `tsc` in DEV13. ESLint TS parsing should
// be enabled after adding a TypeScript-aware parser dependency.
module.exports = [
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
      'scripts/**/*.js',
      'eslint.config.js',
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
    plugins: {
      import: importPlugin,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'import/no-duplicates': 'error',
      'import/no-extraneous-dependencies': ['error', {
        packageDir: ['.'],
      }],
      'import/no-unresolved': ['error', {
        caseSensitive: true,
        commonjs: true,
      }],
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
        alphabetize: { caseInsensitive: true, order: 'asc' },
        'newlines-between': 'always',
      }],
      'import/newline-after-import': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
