# Project verification profile

- Artifacts: `docs/feat-{slug}/`.
- Instructions: root `CLAUDE.md`; UI follows `design-system/README.md`.
- Package manager: pnpm. Migrations: UTC `YYYYMMDDHHmmss_description.sql`; all new tables enable RLS.
- Required local checks: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `git diff --check` and independent SDLC review.
- Baseline warnings must be distinguished from new failures. Never call unavailable checks passed.
- Implement invocation authorizes local work only unless user separately requests commit/push/deploy. Production database/storage changes are not local verification.
