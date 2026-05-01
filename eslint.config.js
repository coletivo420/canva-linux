'use strict';
// @ts-nocheck

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');

const commonRules = {
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
  'no-var': 'error',
  'prefer-const': 'error',
};

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
      ...commonRules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'electron/**/*.ts',
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
      import: importPlugin,
    },
    rules: {
      ...commonRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
