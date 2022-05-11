module.exports = {
  extends: ['@readme/eslint-config'],
  plugins: ['node', 'import'],
  root: true,
  ignorePatterns: ['node_modules', 'dist'],
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],

    'import/namespace': ['error', { allowComputed: true }],
    'import/prefer-default-export': 'off',

    'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
    'no-restricted-imports': ['error', { patterns: ['test'] }],
    'no-underscore-dangle': 'off',
    'sort-imports': 'error',

    'no-shadow': 'off',
  },
  settings: {
    'require-await': 'error',
  },
  env: {
    jest: true,
  },
};
