import { describe, expect, it } from 'bun:test'
import { parseCliOptions } from '../src/cli-parse'

describe('CLI Parsing', () => {
	it('parses positional entry', () => {
		const options = parseCliOptions(['src/index.ts'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
	})
	it('parses --entry', () => {
		const options = parseCliOptions(['--entry', 'src/index.ts'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
	})
	it('parses --entry.name', () => {
		const options = parseCliOptions(['--entry.main', 'src/index.ts'])
		expect(options.entry).toEqual({ main: 'src/index.ts' })
	})
	it('parses format', () => {
		const options = parseCliOptions(['--format', 'esm,cjs'])
		expect(options.format).toEqual(['esm', 'cjs'])
	})
	it('parses boolean flags', () => {
		const options = parseCliOptions(['--minify'])
		expect(options.minify).toBe(true)
	})
	it('parses external', () => {
		const options = parseCliOptions(['--external', 'chalk,lodash'])
		expect(options.external).toEqual(['chalk', 'lodash'])
	})
	it('handles dts resolve', () => {
		const options = parseCliOptions(['--dts', '--resolve-dts', 'chalk'])
		expect(options.dts).toEqual({ resolve: ['chalk'] })
	})
	it('throws on unknown option', () => {
		expect(() => parseCliOptions(['--unknown'])).toThrow(
			'Unknown option: --unknown',
		)
	})
	it('parses multiple entries', () => {
		const options = parseCliOptions(['src/index.ts', 'src/utils.ts'])
		expect(options.entry).toEqual({
			index: 'src/index.ts',
			utils: 'src/utils.ts',
		})
	})
	it('handles short flags', () => {
		const options = parseCliOptions(['-f', 'esm'])
		expect(options.format).toEqual(['esm'])
	})
})

describe('Real-world CLI Usage', () => {
	it('bunup src/index.ts', () => {
		const options = parseCliOptions(['src/index.ts'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
	})

	it('bunup src/index.ts --format esm', () => {
		const options = parseCliOptions(['src/index.ts', '--format', 'esm'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.format).toEqual(['esm'])
	})

	it('bunup src/index.ts --format esm,cjs --minify', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--format',
			'esm,cjs',
			'--minify',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.format).toEqual(['esm', 'cjs'])
		expect(options.minify).toBe(true)
	})

	it('bunup src/index.ts --out-dir dist', () => {
		const options = parseCliOptions(['src/index.ts', '--out-dir', 'dist'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.outDir).toBe('dist')
	})

	it('bunup src/index.ts -o dist -f esm -m', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'-o',
			'dist',
			'-f',
			'esm',
			'-m',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.outDir).toBe('dist')
		expect(options.format).toEqual(['esm'])
		expect(options.minify).toBe(true)
	})

	it('bunup --entry.main src/main.ts --entry.utils src/utils.ts', () => {
		const options = parseCliOptions([
			'--entry.main',
			'src/main.ts',
			'--entry.utils',
			'src/utils.ts',
		])
		expect(options.entry).toEqual({
			main: 'src/main.ts',
			utils: 'src/utils.ts',
		})
	})

	it('bunup src/index.ts --watch', () => {
		const options = parseCliOptions(['src/index.ts', '--watch'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.watch).toBe(true)
	})

	it('bunup src/index.ts -w --dts', () => {
		const options = parseCliOptions(['src/index.ts', '-w', '--dts'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.watch).toBe(true)
		expect(options.dts).toBe(true)
	})

	it('bunup src/index.ts --dts --resolve-dts', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--dts',
			'--resolve-dts',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.dts).toEqual({ resolve: true })
	})

	it('bunup src/index.ts --external react,react-dom', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--external',
			'react,react-dom',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.external).toEqual(['react', 'react-dom'])
	})

	it('bunup src/index.ts --no-external lodash', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--no-external',
			'lodash',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.noExternal).toEqual(['lodash'])
	})

	it('bunup src/index.ts --sourcemap (flag only)', () => {
		const options = parseCliOptions(['src/index.ts', '--sourcemap'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.sourcemap).toBe(true)
	})

	it('bunup src/index.ts --sourcemap linked', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--sourcemap',
			'linked',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.sourcemap).toBe('linked')
	})

	it('bunup src/index.ts --target browser', () => {
		const options = parseCliOptions(['src/index.ts', '--target', 'browser'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.target).toBe('browser')
	})

	it('bunup src/index.ts --minify-whitespace --minify-identifiers --minify-syntax', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--minify-whitespace',
			'--minify-identifiers',
			'--minify-syntax',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.minifyWhitespace).toBe(true)
		expect(options.minifyIdentifiers).toBe(true)
		expect(options.minifySyntax).toBe(true)
	})

	it('bunup src/index.ts --splitting --clean', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--splitting',
			'--clean',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.splitting).toBe(true)
		expect(options.clean).toBe(true)
	})

	it('bunup src/index.ts --tsconfig tsconfig.custom.json', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--tsconfig',
			'tsconfig.custom.json',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.preferredTsconfigPath).toBe('tsconfig.custom.json')
	})

	it('bunup src/index.ts --bytecode', () => {
		const options = parseCliOptions(['src/index.ts', '--bytecode'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.bytecode).toBe(true)
	})

	it('bunup src/index.ts --silent', () => {
		const options = parseCliOptions(['src/index.ts', '--silent'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.silent).toBe(true)
	})

	it('bunup src/index.ts --config bunup.config.js', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--config',
			'bunup.config.js',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.config).toBe('bunup.config.js')
	})

	it('bunup src/index.ts --banner \'console.log("banner");\'', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--banner',
			'console.log("banner");',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.banner).toBe('console.log("banner");')
	})

	it('bunup src/index.ts --footer \'console.log("footer");\'', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'--footer',
			'console.log("footer");',
		])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.footer).toBe('console.log("footer");')
	})

	it('bunup src/index.ts src/types.ts --format esm,cjs --minify --out-dir dist --dts --watch', () => {
		const options = parseCliOptions([
			'src/index.ts',
			'src/types.ts',
			'--format',
			'esm,cjs',
			'--minify',
			'--out-dir',
			'dist',
			'--dts',
			'--watch',
		])
		expect(options.entry).toEqual({
			index: 'src/index.ts',
			types: 'src/types.ts',
		})
		expect(options.format).toEqual(['esm', 'cjs'])
		expect(options.minify).toBe(true)
		expect(options.outDir).toBe('dist')
		expect(options.dts).toBe(true)
		expect(options.watch).toBe(true)
	})

	it('bunup --entry.lib src/lib.ts -f esm --minify --external react,react-dom -o dist --dts --resolve-dts', () => {
		const options = parseCliOptions([
			'--entry.lib',
			'src/lib.ts',
			'-f',
			'esm',
			'--minify',
			'--external',
			'react,react-dom',
			'-o',
			'dist',
			'--dts',
			'--resolve-dts',
		])
		expect(options.entry).toEqual({ lib: 'src/lib.ts' })
		expect(options.format).toEqual(['esm'])
		expect(options.minify).toBe(true)
		expect(options.external).toEqual(['react', 'react-dom'])
		expect(options.outDir).toBe('dist')
		expect(options.dts).toEqual({ resolve: true })
	})

	it('bunup with option using equals sign: src/index.ts --format=esm', () => {
		const options = parseCliOptions(['src/index.ts', '--format=esm'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.format).toEqual(['esm'])
	})

	it('bunup with multiple formats using equals sign: src/index.ts --format=esm,cjs', () => {
		const options = parseCliOptions(['src/index.ts', '--format=esm,cjs'])
		expect(options.entry).toEqual({ index: 'src/index.ts' })
		expect(options.format).toEqual(['esm', 'cjs'])
	})

	it('bunup with multiple entries and complex options', () => {
		const options = parseCliOptions([
			'--entry.main',
			'src/main.ts',
			'--entry.types',
			'src/types.ts',
			'--format',
			'esm,cjs',
			'--minify',
			'--external',
			'react,react-dom',
			'--out-dir',
			'dist',
			'--dts',
			'--resolve-dts',
			'--banner',
			'/* My Library */',
			'--clean',
			'--splitting',
		])
		expect(options.entry).toEqual({
			main: 'src/main.ts',
			types: 'src/types.ts',
		})
		expect(options.format).toEqual(['esm', 'cjs'])
		expect(options.minify).toBe(true)
		expect(options.external).toEqual(['react', 'react-dom'])
		expect(options.outDir).toBe('dist')
		expect(options.dts).toEqual({ resolve: true })
		expect(options.banner).toBe('/* My Library */')
		expect(options.clean).toBe(true)
		expect(options.splitting).toBe(true)
	})
})
