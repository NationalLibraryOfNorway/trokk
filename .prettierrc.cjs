const config = {
  trailingComma: "all",
  tabWidth: 4,
  semi: true,
  singleQuote: true,
  plugins: ["prettier-plugin-svelte"],
  overrides: [{ "files": "*.svelte", "options": { "parser": "svelte" } }],
};

module.exports = config;