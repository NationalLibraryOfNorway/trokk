# Purpose
This document defines non-optional engineering rules for `trokk` so changes stay aligned with the current Tauri + React architecture, CI checks, and production constraints.

# Stack Snapshot
- Frontend: React 18 + TypeScript + Vite 7 (`src/**`), Tailwind CSS, Radix UI, `react-hook-form`.
- Desktop backend: Tauri 2 + Rust 2024 (`src-tauri/**`) with commands in `src-tauri/src/lib.rs`.
- Persistence: `@tauri-apps/plugin-store` (`.settings.json` via `src/tauri-store/setting-store.ts`).
- File and OS integration: Tauri FS/Dialog/Process/HTTP/OAuth plugins and watcher-based updates (`watchImmediate`).
- Auth/secrets: Vault + OIDC + Sentry, with compile-time env requirements on Rust side (`env!` in `src-tauri/src/lib.rs` / `src-tauri/src/main.rs`).
- Tests: Vitest + Testing Library (`tests/**`) and Rust unit tests (`src-tauri/src/tests/**`).
- CI: GitHub Actions workflows in `.github/workflows/` for lint/tests/build and Rust fmt/clippy/test.

# Non-Negotiable Quality Gates
Run these commands before requesting review when touching relevant areas:

```bash
npm ci
npm run lint
npm run test
npm run build
```

```bash
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all -- -D warnings
cargo test --all
```

Match CI behavior in:
- `.github/workflows/eslint-pull.yml`
- `.github/workflows/rust-check-pull.yml`
- `.github/workflows/build.yml`

# Generated/Do-Not-Edit Files
Do not hand-edit generated/build artifacts:
- `dist/**`
- `src-tauri/target/**`
- `src-tauri/gen/**` (capability/schema outputs)

Only change lockfiles intentionally through dependency operations:
- `package-lock.json`
- `src-tauri/Cargo.lock`

# Frontend Rules (React/Vite/TypeScript)
- Keep TypeScript strictness intact (`tsconfig.json` with `strict`, `noUnusedLocals`, `noUnusedParameters`).
- Use the existing alias/import style (`@/...`) and current `.ts/.tsx` import conventions.
- Keep state in existing contexts (`src/context/**`) unless a clear architectural reason is approved.
- Keep settings persistence through `src/tauri-store/setting-store.ts`; do not introduce parallel storage mechanisms.
- Preserve watcher-driven file tree behavior in `src/context/trokk-files-context.tsx` (queue + dedupe + periodic processing).
- Reuse existing UI primitives from `src/components/ui/**` and style system (`index.css`, Tailwind tokens) instead of ad-hoc component systems.
- Prefer Shadcn UI components from `src/components/ui/**` when an equivalent exists (for example `Button`, `Input`, `Select`, `Dialog`, `Field`) instead of raw HTML controls.
- If a needed Shadcn component is missing, add it in the same style as existing files under `src/components/ui/**` before introducing custom one-off controls.
- Keep user-facing copy consistent with existing language (Norwegian text in UI).
- Keep changes minimal and targeted; avoid speculative refactors.

# Tauri/Rust Rules
- Add/modify commands in `src-tauri/src/lib.rs` with `#[tauri::command]` and register them in `tauri::generate_handler!`.
- For blocking CPU/file work, use `tokio::task::spawn_blocking` (current pattern in image conversion and deletion commands).
- Keep plugin and runtime wiring in `run()` and `main.rs` consistent with existing setup (Tokio runtime + Sentry init).
- Follow rustfmt settings (`src-tauri/rustfmt.toml`: hard tabs).
- Keep feature-gated behavior (`debug-mock`) intact; do not leak debug behavior into production paths.
- Do not broaden Tauri capabilities/permissions (`src-tauri/capabilities/base.json`) unless strictly required and justified.

# Tauri Command Contract Rules (`invoke`, DTOs, serde naming, validation, error mapping)
- Keep command names stable and snake_case on Rust side; frontend `invoke` names must match exactly.
- Preserve argument compatibility used by frontend `invoke` payloads (current camelCase payloads mapped to Rust args).
- Use explicit serde naming to keep JS/Rust contracts stable:
  - `#[serde(rename_all = "camelCase")]` for frontend-facing structs.
  - explicit `rename` where backend providers require other casing.
- Keep frontend DTOs/interfaces in `src/model/**` aligned with Rust response/request shapes.
- At command boundaries, return `Result<..., String>` and map internal errors with explicit context (`map_err(|e| e.to_string())` or richer messages).
- Validate inputs near boundaries (path existence, expected file types, required IDs/tokens) before expensive operations.
- Keep contracts backward compatible unless a breaking change is explicitly requested.

# Security, Config, and Secrets
- Prefer hard dependencies on env vars; do not add fallback/default values unless explicitly required.
- Never hardcode secrets/tokens/keys in code, tests, scripts, or workflows.
- In CI/workflows, assume runtime env vars are provided by secret management (Vault-like). Do not add ad-hoc env overrides unless explicitly requested.
- Follow existing Vault + OIDC secret flow (`src-tauri/src/vault.rs`, `get_secret_variables` cache).
- Do not log secret values or sensitive payloads.
- If network origins or IPC permissions must change, update CSP/capabilities deliberately in `src-tauri/tauri.conf.json` and `src-tauri/capabilities/base.json` with justification.

# Testing Standards (frontend + Rust + integration/e2e)
- Frontend tests belong in `tests/**` and run with Vitest (`jsdom`, setup in `vitest.setup.ts`).
- Mock Tauri APIs/plugins using current patterns (`vi.mock(...)`) to keep tests deterministic.
- Rust tests belong in `src-tauri/src/tests/**` and should cover error paths and file/image behavior when Rust logic changes.
- No dedicated Playwright/Cypress suite exists; for cross-layer changes, do a manual smoke test with `npm run tauri dev`.
- Do not skip quality gates in changed areas; if a gate cannot run, state it explicitly in PR notes.

# Performance and UX Expectations (startup, async behavior, error states)
- Keep startup responsive: avoid blocking operations on UI thread and in synchronous Rust command paths.
- Preserve async feedback states already used in UI (loading spinners, disabled actions, error messages).
- Keep watcher/event handling bounded and deduplicated; avoid introducing unbounded memory or event storms.
- Long-running operations must surface progress or clear status (`transfer_progress` event flow).
- Error states must be actionable and non-silent in both frontend and Rust boundaries.

# Style and Consistency
- Frontend lint style is authoritative (`eslint.config.js`): single quotes, React rules, TypeScript ESLint recommendations.
- Keep naming and file organization consistent with existing structure (`src/features/**`, `src/context/**`, `src/model/**`).
- Keep utility usage consistent (`src/lib/utils.ts` `cn`, Tailwind classes, existing UI tokens).
- Favor incremental edits over broad rewrites.

# Change Checklist
1. Scope: Confirm only relevant files are touched.
2. Contracts: Verify `invoke` name/payload/response compatibility across `src/**` and `src-tauri/**`.
3. Persistence: Confirm settings/data persistence behavior across app restart when applicable.
4. Security: Confirm no secrets are hardcoded and env/secret sourcing remains strict.
5. Tooling: Run required frontend and Rust quality gates.
6. UX: Validate loading, disabled, success, and error states for changed flows.
7. CI parity: Ensure changes align with current workflows and do not add ad-hoc CI env fallbacks.

# When Unsure
- Ask for clarification before changing public contracts, auth/secrets flow, storage schema, or capability/security settings.
- Default to the smallest change that satisfies the requested behavior.
- Prefer existing patterns in nearby files over introducing new frameworks or abstractions.

# Document Updates
- Update this `AGENTS.md` when conventions, toolchain gates, or workflow expectations change.
- If a CI/runtime incident is fixed, update `AGENTS.md` and issue/PR notes with:
  - confirmed root cause
  - final corrective action
  - any new guardrail/check added
