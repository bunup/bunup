import { JS_TS_RE } from '../../../constants/re'
import type { Plugin } from '../../types'

/**
 * A plugin that provides shims for Node.js globals and ESM/CJS interoperability.
 */
export function shims(): Plugin {
    return {
        type: 'bun',
        name: 'shims',
        plugin: {
            name: 'bunup:shims',
            setup(build) {
                const isNodeCompatibleTarget =
                    build.config.target === 'node' ||
                    build.config.target === 'bun'

                const isEsm = build.config.format === 'esm'
                const isCjs = build.config.format === 'cjs'

                if (!isNodeCompatibleTarget || (!isEsm && !isCjs)) {
                    return
                }

                build.config.define = {
                    ...build.config.define,
                    ...(isCjs && {
                        'import.meta.url': 'importMetaUrl',
                    }),
                }

                build.onLoad({ filter: JS_TS_RE }, async ({ path }) => {
                    const content = await Bun.file(path).text()
                    let shimCode = ''

                    if (
                        isEsm &&
                        (/\b__dirname\b/.test(content) ||
                            /\b__filename\b/.test(content))
                    ) {
                        shimCode = `import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

`
                    }

                    if (isCjs && /\bimport\.meta\.url\b/.test(content)) {
                        shimCode = `import { pathToFileURL } from 'url';

const importMetaUrl = pathToFileURL(__filename).href;

`
                    }

                    if (!shimCode) return

                    const lines = content.split('\n')
                    const firstLine = lines[0]
                    const restLines = lines.slice(1)

                    return {
                        contents: [firstLine, shimCode, ...restLines].join(
                            '\n',
                        ),
                    }
                })
            },
        },
    }
}
