import { defineConfig } from 'vitepress'
import {
	groupIconMdPlugin,
	groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'

import { version } from '../../packages/bunup/package.json'

export default defineConfig({
	title: 'Bunup',
	description: 'A blazing-fast build tool for your libraries built with Bun.',
	themeConfig: {
		logo: '/logo.svg',
		nav: [
			{
				text: 'Scaffold with Bunup',
				link: '/docs/scaffold-with-bunup',
			},
			{
				text: `v${version}`,
				items: [
					{
						text: 'Release Notes',
						link: 'https://github.com/bunup/bunup/releases',
					},
					{
						text: 'Contributing',
						link: 'https://github.com/bunup/bunup/blob/main/CONTRIBUTING.md',
					},
				],
			},
		],
		sidebar: [
			{
				text: 'Guide',
				items: [
					{ text: 'Introduction', link: '/' },
					{
						text: 'Options',
						link: '/docs/guide/options',
					},
					{
						text: 'TypeScript Declarations',
						link: '/docs/guide/typescript-declarations',
					},
					{ text: 'CSS', link: '/docs/guide/css' },
					{ text: 'Workspaces', link: '/docs/guide/workspaces' },
					{ text: 'CLI Options', link: '/docs/guide/cli-options' },
				],
			},
			{
				text: 'Plugins',
				items: [
					{ text: 'Shims', link: '/docs/plugins/shims' },
					{ text: 'Exports', link: '/docs/plugins/exports' },
					{ text: 'Copy', link: '/docs/plugins/copy' },
					{ text: 'Inject Styles', link: '/docs/plugins/inject-styles' },
					{ text: 'Unused', link: '/docs/plugins/unused' },
				],
			},
			{
				text: 'Advanced',
				items: [
					{
						text: 'Plugin Development',
						link: '/docs/advanced/plugin-development',
					},
					{
						text: 'Programmatic Usage',
						link: '/docs/advanced/programmatic-usage',
					},
				],
			},
		],
		editLink: {
			pattern: 'https://github.com/bunup/bunup/edit/main/docs/:path',
			text: 'Suggest changes to this page',
		},
		search: {
			provider: 'local',
		},
		footer: {
			message: 'Released under the MIT License.',
		},
		socialLinks: [
			{
				icon: 'github',
				link: 'https://github.com/bunup/bunup',
			},
		],
	},
	head: [
		['meta', { name: 'theme-color', content: '#ffffff' }],
		['link', { rel: 'icon', href: '/logo.svg' }],
		['meta', { name: 'author', content: 'Arshad Yaseen' }],
		['meta', { property: 'og:title', content: 'Bunup' }],
		[
			'meta',
			{
				property: 'og:image',
				content: 'https://bunup.dev/og.png',
			},
		],
		[
			'meta',
			{
				property: 'og:description',
				content: 'A blazing-fast build tool for your libraries built with Bun.',
			},
		],
		['meta', { name: 'twitter:card', content: 'summary_large_image' }],
		[
			'meta',
			{
				name: 'twitter:image',
				content: 'https://bunup.dev/og.png',
			},
		],
		[
			'meta',
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
			},
		],
	],
	markdown: {
		theme: {
			light: 'one-light',
			dark: 'one-dark-pro',
		},
		config(md) {
			md.use(groupIconMdPlugin)
			md.use(copyOrDownloadAsMarkdownButtons)
		},
	},
	vite: {
		plugins: [
			groupIconVitePlugin(),
			llmstxt({
				excludeIndexPage: false,
			}),
		],
	},
	sitemap: {
		hostname: 'https://bunup.dev',
	},
	ignoreDeadLinks: true,
})
