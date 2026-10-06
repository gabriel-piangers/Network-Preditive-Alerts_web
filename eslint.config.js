import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    // Backend: Node.js
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Frontend: browser + JSX
    files: ['frontend/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // JSX usa os imports como factory — o plugin React não está instalado,
      // por isso desabilitamos o no-unused-vars para variáveis iniciadas com
      // letra maiúscula (componentes React) e para imports usados só em JSX.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]' }],
      'no-console': 'off',
    },
  },
  {
    // Ignora pastas geradas
    ignores: ['node_modules/', 'frontend/dist/', 'frontend/.vite/'],
  },
];
