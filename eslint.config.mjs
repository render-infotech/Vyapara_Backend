import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import globals from 'globals';

export default [
  {
    files: ['**/*.js', '**/*.ts'],
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.webpack/**'],
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
      'eslint-comments': eslintCommentsPlugin,
    },
    rules: {
      'prettier/prettier': ['error', { singleQuote: true }],
      quotes: ['error', 'single'],
      'no-console': 'warn',
      'no-param-reassign': 'off',
      'max-len': ['warn', { code: 150, ignoreComments: true, ignoreUrls: true }],
      camelcase: 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-await-in-loop': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'import/extensions': 'off',
      'import/no-import-module-exports': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: ['webpack.config.js', '**/webpack.*.js', '**/*.config.js'],
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'import/no-named-as-default': 'off',
      'eslint-comments/no-unused-disable': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
  },
];
