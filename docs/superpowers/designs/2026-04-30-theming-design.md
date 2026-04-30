# Theming Design — TT-2198

**Date:** 2026-04-30
**Branch:** `feat/support-theming-TT-2198`

## Problem

Colors are hardcoded on individual components using raw Tailwind color classes (e.g. `bg-stone-700`, `text-amber-500`, `text-red-500`). This makes global color changes difficult and prevents light/dark mode support.

## Goal

Centralize all colors into a semantic CSS variable system backed by Tailwind utility classes, and implement user-switchable light/dark mode.

## Part 1: CSS Variables (`index.css`)

Two complete theme definitions using CSS custom properties following the existing shadcn/ui convention.

### `:root` — Light mode
Stone-based neutral surfaces with amber as the primary action color.

New tokens added (each with a `-foreground` counterpart):
- `--warning` / `--warning-foreground` — amber, for warnings and pending states
- `--success` / `--success-foreground` — green, for success messages and confirmed states
- `--info` / `--info-foreground` — blue, for informational alerts
- `--selected` / `--selected-foreground` — blue, for selected items in lists/trees

### `.dark` — Dark mode
Dark stone surfaces with amber as primary. Same semantic tokens mapped to appropriately dark/saturated values. The existing `.dark` block is replaced with a correct, complete definition (it was previously vestigial/inconsistent).

### `App.css` cleanup
The hardcoded `color: #f6f6f6` and `background-color: #2f2f2f` are removed. These are already handled by `bg-background text-foreground` applied in `index.css`. The `.errorColor` class is removed — replaced by semantic `destructive` token usage.

## Part 2: Tailwind Config (`tailwind.config.js`)

Four new color groups added to `theme.extend.colors`:

```js
warning:  { DEFAULT: 'hsl(var(--warning))',  foreground: 'hsl(var(--warning-foreground))' },
success:  { DEFAULT: 'hsl(var(--success))',  foreground: 'hsl(var(--success-foreground))' },
info:     { DEFAULT: 'hsl(var(--info))',     foreground: 'hsl(var(--info-foreground))' },
selected: { DEFAULT: 'hsl(var(--selected))', foreground: 'hsl(var(--selected-foreground))' },
```

This enables classes like `bg-warning`, `text-success`, `border-info`, `bg-selected text-selected-foreground`.

## Part 3: Theme Setting (Light/Dark toggle)

### `SettingStore`
- New methods: `getTheme(): Promise<'dark' | 'light' | 'system'>` and `setTheme(theme): Promise<void>`
- Default: `'dark'`
- Persisted in `.settings.json` under key `'theme'`

### `SettingContext`
- New state: `theme: 'dark' | 'light' | 'system'`
- New function: `setTheme(theme: 'dark' | 'light' | 'system'): void`
- On init and on every `theme` change: applies or removes `.dark` class on `document.documentElement`
  - `'dark'` → always add `.dark`
  - `'light'` → always remove `.dark`
  - `'system'` → read `window.matchMedia('(prefers-color-scheme: dark)').matches` and apply accordingly; also listen to changes with `addEventListener('change', ...)`

### Settings UI (`settings.tsx`)
A theme toggle (dark / light / system) added to the settings panel, using the existing UI component patterns.

## Part 4: Component Color Sweep

All hardcoded color classes in feature and layout components replaced with semantic equivalents:

| Hardcoded | Semantic class |
|-----------|----------------|
| `bg-amber-600`, `bg-amber-500`, `hover:bg-amber-500` | `bg-primary`, `hover:bg-primary/80` |
| `text-amber-400`, `text-amber-500` | `text-primary` |
| `border-amber-400`, `border-amber-500` | `border-primary` |
| `text-red-500`, `text-red-200` | `text-destructive`, `text-destructive-foreground` |
| `bg-red-700`, `bg-red-800`, `bg-red-950` | `bg-destructive`, `bg-destructive/10` |
| `border-red-500`, `border-red-900` | `border-destructive` |
| `text-green-500`, `text-green-600` | `text-success` |
| `bg-green-800/50` | `bg-success/20` |
| `text-blue-500`, `bg-blue-500`, `border-blue-500` | `text-info`, `bg-info`, `border-info` |
| `border-yellow-600`, `bg-yellow-950/40`, `text-yellow-100` | `border-warning`, `bg-warning/10`, `text-warning-foreground` |
| `text-yellow-500` | `text-warning` |
| `bg-blue-500 text-white` (file tree selected) | `bg-selected text-selected-foreground` |
| `bg-stone-900`, `bg-stone-800` | `bg-card`, `bg-secondary` |
| `bg-stone-700`, `bg-stone-700/80` | `bg-secondary`, `bg-muted` |
| `text-stone-100`, `text-stone-50` | `text-foreground` |
| `text-stone-300`, `text-stone-400` | `text-muted-foreground` |
| `border-stone-600`, `border-stone-700` | `border-border` |
| `hover:bg-stone-600`, `hover:bg-stone-700` | `hover:bg-accent` |

Files affected: `App.tsx`, `main-layout.tsx`, `files-container.tsx`, `file-tree-item.tsx`, `thumbnail.tsx`, `checkbox.tsx`, `registration-form.tsx`, `settings.tsx`, `delete-file.tsx`, `detailed-image-view.tsx`, `transfer-log.tsx`, `error-log-modal.tsx`, `error-log-panel.tsx`, `error-modal.tsx`, `window-control-button.tsx`.

## Success Criteria

- All hardcoded color classes removed from feature/layout components
- Dark mode looks identical to current app
- Light mode is visually coherent and usable
- Theme preference persists across app restarts
- Adding new semantic colors in future requires only changing `index.css` and `tailwind.config.js`
