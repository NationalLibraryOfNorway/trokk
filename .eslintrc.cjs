module.exports = {
  extends: [
    "plugin:svelte/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    extraFileExtensions: [".svelte"]
  },
  ignorePatterns: ["*.cjs"],
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser"
      }
    }
  ],
  rules: {
    "svelte/indent": ["error", {
      "indent": 4,
      "switchCase": 1
    }],
    "indent": ["error", 4],
    "quotes": ["error", "single"]
  }
};
