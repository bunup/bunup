import type {
	CommentBlock,
	CommentLine,
	Declaration,
	Directive,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	ImportDeclaration,
	Node,
	Statement,
} from '@babel/types'

import { CAPITAL_LETTER_RE, EXPORT_DEFAULT_RE, EXPORT_RE } from './re'

export function isLikelyVariableOrTypeName(token: string): boolean {
	return (
		CAPITAL_LETTER_RE.test(token) &&
		!token.startsWith('/*') &&
		!token.startsWith('@') &&
		!token.startsWith('"') &&
		!token.startsWith("'") &&
		!token.startsWith('`')
	)
}

export function isImportDeclaration(node: Node): boolean {
	return node.type === 'ImportDeclaration'
}

export function removeExportSyntaxes(text: string): string {
	return text.replace(EXPORT_DEFAULT_RE, '').replace(EXPORT_RE, '')
}

export function isExportAllDeclaration(node: Node): boolean {
	return node.type === 'ExportAllDeclaration'
}

export function isReExportStatement(node: Node): boolean {
	return node.type === 'ExportNamedDeclaration' && !node.declaration
}

export function isSideEffectImport(node: Node): boolean {
	return node.type === 'ImportDeclaration' && node.specifiers.length === 0
}

export function hasExportModifier(node: Node, text: string): boolean {
	return node.type.startsWith('Export') || text.trim().startsWith('export')
}

export function hasDefaultExportModifier(node: Node, text: string): boolean {
	return (
		node.type === 'ExportDefaultDeclaration' ||
		text.trim().startsWith('export default')
	)
}

export function isDefaultReExport(node: Node): boolean {
	return (
		node.type === 'ExportDefaultDeclaration' &&
		node.declaration?.type === 'Identifier'
	)
}

export function getName(
	node:
		| Directive
		| Statement
		| ExportDefaultDeclaration
		| ExportNamedDeclaration
		| Declaration,
	source: string,
): string | null {
	if (!node) return null

	if (node.type === 'ExportNamedDeclaration' && node.declaration) {
		return getName(node.declaration as Declaration, source)
	}

	if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
		if (node.declaration.type === 'Identifier') {
			return node.declaration.name
		}
		return getName(node.declaration as Declaration, source)
	}

	switch (node.type) {
		case 'TSInterfaceDeclaration':
		case 'TSTypeAliasDeclaration':
		case 'ClassDeclaration':
		case 'TSEnumDeclaration':
		case 'FunctionDeclaration':
		case 'TSDeclareFunction':
			if (node.id && node.id.type === 'Identifier') {
				return node.id.name
			}
			break

		case 'TSModuleDeclaration':
			if (node.id && node.id.type === 'Identifier') {
				return node.id.name
			}
			break

		case 'VariableDeclaration': {
			const declarations = node.declarations
			if (
				declarations?.length === 1 &&
				declarations[0].id?.type === 'Identifier'
			) {
				return declarations[0].id.name
			}
			break
		}
	}
	return null
}

export function getCommentText(
	comments: (CommentBlock | CommentLine)[] | undefined | null,
): string | null {
	if (!comments) return null
	return comments
		.map((comment) => {
			return comment.type === 'CommentBlock'
				? `/*${comment.value}*/`
				: comment.type === 'CommentLine'
					? `//${comment.value}`
					: null
		})
		.join('\n')
}

export function getAllImportNames(body: Statement[]): string[] {
	const importNames: string[] = []

	for (const statement of body) {
		if (isImportDeclaration(statement)) {
			const importDecl = statement as ImportDeclaration

			if (importDecl.specifiers) {
				for (const specifier of importDecl.specifiers) {
					if (specifier.type === 'ImportDefaultSpecifier') {
						importNames.push(specifier.local.name)
					} else if (specifier.type === 'ImportSpecifier') {
						importNames.push(specifier.local.name)
					} else if (specifier.type === 'ImportNamespaceSpecifier') {
						importNames.push(specifier.local.name)
					}
				}
			}
		}
	}

	return importNames
}
