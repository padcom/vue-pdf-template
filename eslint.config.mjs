import config from '@padcom/eslint-config-vue'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config['flat/browser'],
]
