export const IMPORT_TYPE_RE: RegExp = /import\s+type\s+/g
export const EXPORT_TYPE_RE: RegExp = /export\s+type\s+/g
export const IMPORT_EXPORT_NAMES_RE: RegExp = /(import|export)\s*{([^}]*)}/g
export const IMPORT_EXPORT_WITH_DEFAULT_RE: RegExp =
	/(import|export)(\s+[^{,]+,)?\s*{([^}]*)}/g
export const TYPE_WORD_RE: RegExp = /\btype\s+/g
export const EXPORT_DEFAULT_RE: RegExp = /\bexport\s+default\s+/g
export const EXPORT_RE: RegExp = /\bexport\s+/g
export const TOKENIZE_RE: RegExp =
	/(\s+|\/\/.*?(?:\n|$)|\/\*[\s\S]*?\*\/|[a-zA-Z_$][a-zA-Z0-9_$]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[(){}[\],.;:]|=>|&&|\|\||[=!<>]=?|\+\+|--|[-+*/%&|^!~?]|\.{3}|::|\.)/g
export const CAPITAL_LETTER_RE: RegExp = /[A-Z]/
export const JS_RE: RegExp = /\.[cm]?jsx?$/
export const TS_RE: RegExp = /\.[cm]?tsx?$|\.d\.[cm]?ts$/
export const EXTENSION_REGEX: RegExp = /\.(d\.(ts|cts|mts)|[cm]?[jt]s)$/
export const NODE_MODULES_RE: RegExp = /node_modules/
