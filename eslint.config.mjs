// eslint.config.mjs
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  {
    files: ['**/*.js', '**/*.ts'],
    ignores: ['node_modules', 'dist', 'build', '.webpack'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
    },
    rules: {
      // Prettier + style
      'prettier/prettier': ['error', { singleQuote: true }],
      quotes: ['error', 'single'],
      'no-console': 'warn',
      'no-param-reassign': 'off',
      'max-len': ['warn', { code: 150, ignoreComments: true, ignoreUrls: true }],

      // TS-specific
      camelcase: 'off',
      'no-unused-vars': 'off', // disable base rule
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], // ignore unused args/vars starting with _
      'no-await-in-loop': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // Import rules
      'import/extensions': 'off',
      'import/no-import-module-exports': 'off',
      'import/no-unresolved': ['error', { caseSensitive: true }],
      'import/no-named-as-default': 'off',

      // Handle unused eslint-disable warnings
      'eslint-comments/no-unused-disable': 'warn', // warns if eslint-disable is unused
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
  },
];
