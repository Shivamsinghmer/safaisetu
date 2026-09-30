@AGENTS.md

# Project docs — keep them current
Docs live in `README.md`, `DESIGN.md` and `docs/` (`architecture.md`, `deployment.md`, `changelog.md`).
With every change, update them in the same commit:
- Add a line under **Unreleased** in `docs/changelog.md`.
- If routes, tables, triggers, RLS, env vars, integrations or the PWA setup change, update `docs/architecture.md`
  (and `docs/deployment.md` for env vars or deploy steps).
- If tokens, components, layout or responsive rules change, update `DESIGN.md`.
- Keep `README.md` setup steps and the docs index accurate.
