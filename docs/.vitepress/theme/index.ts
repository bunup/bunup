import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
// @ts-expect-error
import CopyOrDownloadAsMarkdownButtons from "vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue";

import "./custom.css";
import "virtual:group-icons.css";

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component("CopyOrDownloadAsMarkdownButtons", CopyOrDownloadAsMarkdownButtons);
	},
} satisfies Theme;
