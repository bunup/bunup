import { parse } from '@babel/parser'
import type { ExpressionStatement, Node } from '@babel/types'
import {
	getAllImportNames,
	getCommentText,
	getName,
	hasDefaultExportModifier,
	hasExportModifier,
	isDefaultReExport,
	isExportAllDeclaration,
	isImportDeclaration,
	isLikelyVariableOrTypeName,
	isReExportStatement,
	isSideEffectImport,
	removeExportSyntaxes,
} from './ast'
import {
	EXPORT_TYPE_RE,
	IMPORT_EXPORT_NAMES_RE,
	IMPORT_EXPORT_WITH_DEFAULT_RE,
	IMPORT_TYPE_RE,
	TOKENIZE_RE,
	TYPE_WORD_RE,
} from './re'
import { generateRandomString, isNullOrUndefined } from './utils'

async function dtsToFakeJs(dtsContent: string): Promise<string> {
	const parsed = parse(dtsContent, {
		sourceType: 'module',
		plugins: ['typescript'],
	})

	const referencedNames = new Set<string>()
	const exportedNames = new Set<string>()
	const result = []

	for (const name of getAllImportNames(parsed.program.body)) {
		referencedNames.add(name)
	}

	for (const statement of parsed.program.body) {
		if (
			isNullOrUndefined(statement.start) ||
			isNullOrUndefined(statement.end)
		) {
			continue
		}

		const statementText = dtsContent.substring(statement.start, statement.end)

		const name = getName(statement, dtsContent)

		if (name) {
			referencedNames.add(name)
		}

		const isDefaultExport = hasDefaultExportModifier(statement, statementText)

		if (isDefaultExport) {
			result.push(`export { ${name} as default };`)
			if (isDefaultReExport(statement)) {
				continue
			}
		}

		if (
			isImportDeclaration(statement) ||
			isExportAllDeclaration(statement) ||
			isReExportStatement(statement)
		) {
			if (isSideEffectImport(statement)) {
				continue
			}

			const jsImportExport = jsifyImportExport(statementText)

			result.push(jsImportExport)
			continue
		}

		let leadingComment: string | null = null

		leadingComment = getCommentText(statement.leadingComments)

		let statementTextWithCommentsAttatched = `${leadingComment ? `${leadingComment}\n` : ''}${statementText}`

		const isExported = hasExportModifier(statement, statementText)

		if (isExported) {
			statementTextWithCommentsAttatched = removeExportSyntaxes(
				statementTextWithCommentsAttatched,
			)
		}

		const tokens = tokenizeText(
			statementTextWithCommentsAttatched,
			referencedNames,
		)

		const varName = name || generateRandomString()

		result.push(`var ${varName} = [${tokens.join(', ')}];`)

		if (isExported && !isDefaultExport && !exportedNames.has(varName)) {
			result.push(`export { ${varName} };`)
			exportedNames.add(varName)
		}
	}

	return result.join('\n')
}

async function fakeJsToDts(fakeJsContent: string): Promise<string> {
	const parseResult = parse(fakeJsContent, {
		sourceType: 'module',
		attachComment: false,
	})

	const program = parseResult.program
	const resultParts = []

	for (const statement of program.body) {
		if (
			isNullOrUndefined(statement.start) ||
			isNullOrUndefined(statement.end)
		) {
			continue
		}

		const statementText = fakeJsContent.substring(
			statement.start,
			statement.end,
		)

		if (
			isImportDeclaration(statement) ||
			isExportAllDeclaration(statement) ||
			isReExportStatement(statement)
		) {
			if (isImportDeclaration(statement)) {
				resultParts.push(
					// This is important when `splitting` is enabled, as
					// the import paths would be referencing chunk files with .js extensions
					// that need to be removed for proper type declarations
					statementText.replace(/.(?:mjs|cjs|js)\b/g, ''),
				)

				continue
			}

			resultParts.push(statementText)

			continue
		}

		if (statement.type === 'ExpressionStatement') {
			const namespaceDecl = handleNamespace(statement)
			if (namespaceDecl) {
				resultParts.push(namespaceDecl)
				continue
			}
		}

		if (statement.type === 'VariableDeclaration') {
			for (const declaration of statement.declarations) {
				if (declaration.init?.type === 'ArrayExpression') {
					const dtsContent = processTokenArray(declaration.init)
					if (dtsContent) {
						resultParts.push(dtsContent)
					}
				}
			}
		}
	}

	return resultParts.join('\n')
}

// converts typescript import/export statements to javascript equivalents
// - "import type { Foo } from 'bar'" -> "import { Foo } from 'bar'"
// - "export type { Baz }" -> "export { Baz }"
// - "import { type A, B } from 'mod'" -> "import { A, B } from 'mod'"
// - "import Def, { type Named } from 'lib'" -> "import Def, { Named } from 'lib'"
function jsifyImportExport(text: string): string {
	let result = text
		.replace(IMPORT_TYPE_RE, 'import ')
		.replace(EXPORT_TYPE_RE, 'export ')
		.replace(
			IMPORT_EXPORT_NAMES_RE,
			(_, keyword, names) => `${keyword} {${names.replace(TYPE_WORD_RE, '')}}`,
		)

	result = result.replace(
		IMPORT_EXPORT_WITH_DEFAULT_RE,
		(_, keyword, defaultPart = '', names = '') => {
			const cleanedNames = names.replace(TYPE_WORD_RE, '')
			return `${keyword}${defaultPart}{${cleanedNames}}`
		},
	)

	return result
}

function tokenizeText(text: string, referencedNames: Set<string>): string[] {
	const tokens = []

	let match: RegExpExecArray | null
	TOKENIZE_RE.lastIndex = 0
	while (true) {
		match = TOKENIZE_RE.exec(text)
		if (match === null) break

		const token = match[0]

		if (isLikelyVariableOrTypeName(token) || referencedNames.has(token)) {
			tokens.push(token)
		} else {
			tokens.push(JSON.stringify(escapeNewlinesAndTabs(token)))
		}
	}

	return tokens
}

function processTokenArray(arrayLiteral: Node): string | null {
	if (arrayLiteral.type !== 'ArrayExpression') {
		return null
	}

	const tokens = []

	for (const element of arrayLiteral.elements) {
		if (!element) continue
		const processed = processTokenElement(element)
		if (processed !== null) {
			tokens.push(processed)
		}
	}

	return tokens.join('')
}

function processTokenElement(element: any): string | null {
	if (element.type === 'StringLiteral' && typeof element.value === 'string') {
		return unescapeNewlinesAndTabs(element.value)
	}

	if (element.type === 'Identifier') {
		return element.name
	}

	if (element.type === 'TemplateLiteral') {
		const parts = []
		parts.push(unescapeNewlinesAndTabs(element.quasis[0]?.value?.raw || ''))
		for (let i = 0; i < element.expressions.length; i++) {
			const expr = element.expressions[i]
			if (expr.type === 'Identifier') {
				parts.push(expr.name)
			}
			parts.push(
				unescapeNewlinesAndTabs(element.quasis[i + 1]?.value?.raw || ''),
			)
		}
		return parts.join('')
	}
	return null
}

// escapes newlines and tabs to prevent bun bundler from converting tokens/strings
// to template literals and escaping backticks/etc in the final fake-js bundle.
// https://github.com/bunup/bunup/issues/63
function escapeNewlinesAndTabs(text: string): string {
	return text
		.replace(/\n/g, '__bunup_dts_intermediate_new__line__')
		.replace(/\t/g, '__bunup_dts_intermediate__tab__')
}

// unescapes previously escaped newlines and tabs back to actual characters.
function unescapeNewlinesAndTabs(text: string): string {
	return text
		.replace(/__bunup_dts_intermediate_new__line__/g, '\n')
		.replace(/__bunup_dts_intermediate__tab__/g, '\t')
}

function handleNamespace(stmt: ExpressionStatement): string | null {
	const expr = stmt.expression

	if (
		!expr ||
		expr.type !== 'CallExpression' ||
		expr.callee?.type !== 'Identifier' ||
		expr.arguments?.length !== 2 ||
		expr.arguments[0].type !== 'Identifier' ||
		expr.arguments[1].type !== 'ObjectExpression'
	) {
		return null
	}

	const namespaceName = expr.arguments[0].name
	const properties = expr.arguments[1].properties
		.filter((prop) => prop.type === 'ObjectProperty')
		.map((prop) => {
			if (
				prop.type === 'ObjectProperty' &&
				prop.key.type === 'Identifier' &&
				prop.value.type === 'ArrowFunctionExpression' &&
				prop.value.body.type === 'Identifier'
			) {
				const keyName = prop.key.name
				const returnName = prop.value.body.name

				return keyName === returnName ? keyName : `${returnName} as ${keyName}`
			}
			return null
		})
		.filter(Boolean)

	if (properties.length === 0) {
		return null
	}

	return `declare namespace ${namespaceName} {\n  export { ${properties.join(', ')} };\n}`
}

export { dtsToFakeJs, fakeJsToDts }
