import config from '@padcom/eslint-config-vue'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config['flat/browser'],
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 0,
      'vue/no-v-html': 0,
      'jsdoc/require-jsdoc': 0,
    },
  },
]
