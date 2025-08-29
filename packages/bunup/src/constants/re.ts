export const JS_RE: RegExp = /\.(js|jsx|cjs|mjs)$/
export const TS_RE: RegExp = /\.(ts|tsx|mts|cts)$/
export const DTS_RE: RegExp = /\.(d\.(ts|mts|cts))$/
export const JS_TS_RE: RegExp = new RegExp(`${JS_RE.source}|${TS_RE.source}`)
export const JS_DTS_RE: RegExp = new RegExp(`${JS_RE.source}|${DTS_RE.source}`)
export const CSS_RE: RegExp = /\.(css)$/
