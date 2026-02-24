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
