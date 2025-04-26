import { resolve } from 'node:path'

export const TEST_DIR: string = resolve(process.cwd(), 'packages/bunup/tests')
export const PROJECT_DIR: string = resolve(TEST_DIR, '.project')
export const OUTPUT_DIR: string = resolve(TEST_DIR, PROJECT_DIR, '.output')
