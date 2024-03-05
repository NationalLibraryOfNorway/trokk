module.exports = {
  extends: "stylelint-config-recommended-scss",
  rules: {
    "no-duplicate-selectors": true,
    "property-no-unknown": [
      true,
      {
        "ignoreProperties": [
          "/^lost-/"
        ]
      }
    ],
  },
  ignoreFiles: [
    "node_modules/*",
    "src/assets/**",
    "build/**",
    "src-tauri/**"
  ],
  defaultSeverity: "error",
  customSyntax: "postcss-html"
}