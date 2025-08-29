import { generateDts } from '../src'

console.time('build')
const result = await generateDts(['fixtures/index.ts'], {
	splitting: true,
	cwd: 'tests',
})
for (const file of result.files) {
	await Bun.write(`tests/dist/${file.outputPath}`, file.dts)
}
console.timeEnd('build')
