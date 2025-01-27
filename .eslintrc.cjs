/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['plugin:astro/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 'latest'
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro']
      },
       rules: {
    'quotes': ['error', 'single', 'avoid-escape'],
    'semi': ['error', 'always'],
    'no-restricted-imports': ['error'],
    'curly': 'error',
    'eol-last': 'error',
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'no-bitwise': 'error',
    'no-dupe-args': 'error',
    'prefer-const': 'error',
    'no-empty': 'error',
    'no-var': 'error',
    'no-eval': 'error',
    'no-trailing-spaces': 'error',
    'no-fallthrough': 'error',
    'no-multiple-empty-lines': 'error',
    'max-len': ['error', 175],
    'max-lines': ['error', 225],
    'max-depth': ['error', 3],
    'no-duplicate-case': 'error',
    'complexity': ['error', 10],
    'brace-style': [
      'error',
      '1tbs',
      {
        'allowSingleLine': true
      }
    ],
    'no-multi-spaces': 'error',
    'no-unreachable': 'error',
    'no-unneeded-ternary': 'error',
    'no-extra-semi': 'error'
  }
    }
  ]
}