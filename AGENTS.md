# AGENTS.md

This file is for coding agents. Keep it short, current, and task-oriented.

## Non-negotiables
- If a change touches **public contracts**, **auth / secrets**, **storage schema**, **capabilities / permissions**, or **security settings**, stop and ask for confirmation before proceeding.
- Do not broaden app capabilities/permissions unless explicitly requested.
- Do not edit generated files. If unsure, ask.

## Quality gates (run before handing off)
- JavaScript/TypeScript: `npm run lint && npm test && npm run build`
- Rust: `cargo fmt && cargo clippy && cargo test`

## Working style
- Prefer existing patterns in nearby code; keep changes small and localized.
- If instructions or repo state are ambiguous, ask a single focused question and proceed with the safest assumption.

## Active Technologies
- TypeScript 5.x, React 18, Vite 7; Rust 2024 backend present but unchanged for this feature + React context providers, existing `MessageProvider` structured error model, `@tauri-apps/plugin-fs`, existing Radix dialog primitives, `@sentry/react` frontend instrumentation, existing retained error-log UI (007-implement-p2-errors)
- Existing bounded on-device error history in the Tauri settings store; in-memory React context for the live active error (007-implement-p2-errors)
- TypeScript 5.x, React 18, Vite 7; Rust 2024 backend present but unchanged for this feature + React context providers, browser Clipboard API, `@tauri-apps/api/window`, existing/shared error modal pattern from specs `006` and `007`, existing Radix dialog primitives, `@sentry/react` frontend instrumentation (008-implement-p3-errors)
- Existing or re-aligned bounded on-device error history in the Tauri settings store for retained utility failures; in-memory React context for the live active error (008-implement-p3-errors)

## Recent Changes
- 007-implement-p2-errors: Added TypeScript 5.x, React 18, Vite 7; Rust 2024 backend present but unchanged for this feature + React context providers, existing `MessageProvider` structured error model, `@tauri-apps/plugin-fs`, existing Radix dialog primitives, `@sentry/react` frontend instrumentation, existing retained error-log UI
