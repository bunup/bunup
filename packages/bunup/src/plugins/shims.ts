import type { BunPlugin } from "bun";
import { JS_TS_RE } from "../constants/re";

/**
 * A plugin that provides shims for Node.js globals and ESM/CJS interoperability.
 */
export function shims(): BunPlugin {
	return {
		name: "bunup:shims",
		setup(build) {
			const isNodeCompatibleTarget =
				build.config.target === "node" || build.config.target === "bun";

			const isEsm = build.config.format === "esm";
			const isCjs = build.config.format === "cjs";

			if (!isNodeCompatibleTarget || (!isEsm && !isCjs)) {
				return;
			}

			build.config.define = {
				...build.config.define,
				...(isCjs && {
					"import.meta.url": "importMetaUrl",
				}),
			};

			build.onLoad({ filter: JS_TS_RE }, async ({ path }) => {
				const content = await Bun.file(path).text();
				let shimCode = "";

				if (isEsm && (/\b__dirname\b/.test(content) || /\b__filename\b/.test(content))) {
					shimCode = `import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

`;
				}

				if (isCjs && /\bimport\.meta\.url\b/.test(content)) {
					shimCode = `import { pathToFileURL } from 'url';

const importMetaUrl = pathToFileURL(__filename).href;

`;
				}

				if (!shimCode) return;

				const insertAt = findShimInsertPosition(content);

				return {
					contents: `${content.slice(0, insertAt)}\n${shimCode}${content.slice(insertAt)}`,
				};
			});
		},
	};
}

const DIRECTIVE_RE =
	/^(?:'[^'\\\n]*(?:\\.[^'\\\n]*)*'|"[^"\\\n]*(?:\\.[^"\\\n]*)*")[ \t]*(?:;|(?=\r?\n|$))/;

/**
 * Returns the offset where the shim code can be inserted: after a shebang
 * line and after the directive prologue (e.g. "use client"), so both stay at
 * the top of the file, and never inside a statement or a comment.
 */
export function findShimInsertPosition(content: string): number {
	let pos = 0;

	if (content.startsWith("#!")) {
		const end = content.indexOf("\n");
		pos = end === -1 ? content.length : end + 1;
	}

	let insertAt = pos;

	while (pos < content.length) {
		const char = content[pos];

		if (char === " " || char === "\t" || char === "\r" || char === "\n") {
			pos++;
		} else if (content.startsWith("//", pos)) {
			const end = content.indexOf("\n", pos);
			pos = end === -1 ? content.length : end + 1;
		} else if (content.startsWith("/*", pos)) {
			const end = content.indexOf("*/", pos + 2);
			if (end === -1) break;
			pos = end + 2;
		} else {
			const directive = DIRECTIVE_RE.exec(content.slice(pos));
			if (!directive) break;
			pos += directive[0].length;
			insertAt = pos;
		}
	}

	return insertAt;
}
