module.exports = {
  extends: [
    "plugin:svelte/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    extraFileExtensions: [".svelte"],
  },
  // plugins: ["@typescript-eslint"],
  ignorePatterns: ["*.cjs"],
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },
  ],
  rules: {
//    indent: ["error", 4, {"SwitchCase": 1}],
    "svelte/indent": ["error", {
      "indent": 4,
      "switchCase": 1,
    }],
  }
};
