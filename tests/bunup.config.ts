import { defineConfig } from '../src'
import { injectStyles, report } from '../src/plugins/built-in'

export default defineConfig({
    entry: ['fixtures/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    plugins: [report(), injectStyles()],
    splitting: false,
})
