import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    // Aplica a todo o monorepo (backend e frontend)
    files: ['backend/**/*.js', 'frontend/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Ignora pastas geradas
    ignores: ['node_modules/', 'frontend/dist/', 'frontend/.vite/'],
  },
];
