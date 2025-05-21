import fs from 'node:fs'
import path from 'node:path'
import {
    type CustomAtRules,
    type TransformOptions,
    transform,
} from 'lightningcss'
import { CSS_RE } from '../../../constants/re'
import type { MaybePromise } from '../../../types'
import type { Plugin } from '../../types'

type InjectStylePluginOptions = Omit<
    TransformOptions<CustomAtRules>,
    'filename' | 'code'
> & {
    inject?: (css: string, filePath: string) => MaybePromise<string>
}

export function injectStyle(options?: InjectStylePluginOptions): Plugin {
    const { inject, ...transformOptions } = options ?? {}

    return {
        type: 'bun',
        name: 'inject-style',
        plugin: {
            name: 'bunup:inject-style',
            setup(build) {
                build.onResolve({ filter: /^__inject-style$/ }, () => {
                    return {
                        path: '__inject-style',
                        namespace: '__inject-style',
                    }
                })

                build.onLoad(
                    { filter: /^__inject-style$/, namespace: '__inject-style' },
                    () => {
                        return {
                            contents: `
                      export default function injectStyle(css) {
                        if (!css || typeof document === 'undefined') return
                      
                        const head = document.head || document.getElementsByTagName('head')[0]
                        const style = document.createElement('style')
                        head.appendChild(style)

                        if (style.styleSheet) {
                          style.styleSheet.cssText = css
                        } else {
                          style.appendChild(document.createTextNode(css))
                        }
                      }
                      `,
                            loader: 'js',
                        }
                    },
                )

                build.onLoad({ filter: CSS_RE }, async (args) => {
                    const source = await fs.promises.readFile(args.path, 'utf8')

                    const { code } = transform({
                        ...transformOptions,
                        filename: path.basename(args.path),
                        code: Buffer.from(source),
                        minify:
                            transformOptions.minify ??
                            (build.config.minify === true ||
                                (typeof build.config.minify === 'object' &&
                                    build.config.minify.whitespace)),
                    })

                    const stringifiedCode = JSON.stringify(code.toString())

                    const js = inject
                        ? await inject(stringifiedCode, args.path)
                        : `import injectStyle from '__inject-style';injectStyle(${stringifiedCode})`

                    return {
                        contents: js,
                        loader: 'js',
                    }
                })
            },
        },
    }
}
