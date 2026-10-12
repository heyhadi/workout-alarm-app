// ESLint flat config: Expo's recommended rules + Prettier (no conflicts).
// Run: npx expo lint   (alias configured in package.json)
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expo,
  prettier,
  {
    ignores: ['android/**', 'ios/**', 'node_modules/**', '.expo/**'],
  },
  {
    rules: {
      // The codebase targets strict TS; keep the linter aligned.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
