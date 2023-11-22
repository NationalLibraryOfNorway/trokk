module.exports = {
	extends: [
		// add more generic rule sets here, such as:
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
		"plugin:svelte/prettier",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	ignorePatterns: ["*.cjs"],
	rules: {
		// override/add rules settings here, such as:
		// 'svelte/rule-name': 'error'
		"svelte/indent": [
			"error",
			{
				indent: "tab",
			},
		],
	},
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",
			parserOptions: {
				parser: "@typescript-eslint/parser",
			},
		},
	],
};
