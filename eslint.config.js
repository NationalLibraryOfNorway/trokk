import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';


/** @type {import("eslint").Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  { ignores: ['src-tauri/**/*', 'dist/**/*', 'node_modules/**/*'] },
  {
    rules: {
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'react/react-in-jsx-scope': 'off'
    } }
];