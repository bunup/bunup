import { defineWorkspace } from "bunup";

export default defineWorkspace([
	{
		name: "package-1",
		root: "packages/package-1",
	},
	{
		name: "package-2",
		root: "packages/package-2",
		config: {
			minify: true,
		},
	},
]);
