import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '.next/**', '.next-live/**', 'node_modules/**', 'out/**', 'build/**', 'next-env.d.ts',
    '**/*.ts', '**/*.tsx',
  ]),
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-require-imports': 'off',
    },
  },
]);
