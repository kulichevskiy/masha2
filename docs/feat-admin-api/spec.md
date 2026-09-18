---
revision: 1
status: accepted
accepted_revision: 1
intent: intent.md@1
---

# API contract

Acceptance: product requirements are the decisions accepted in the interview; HTTP/database details below are implementation choices within that scope.

S1. `/api/v1` uses Bearer PAT authentication exclusively, JSON envelopes `{data}` / `{error:{code,message}}`, private no-store responses, and public `/api/docs` plus `/api/openapi.json`. Cookie login never substitutes for PAT authentication. Tokens are random 256-bit secrets with an `mcp_` prefix and SHA-256 hashes at rest. Every request checks revocation and the issuing user's current admin membership.
S2. Resource paths: `media`, `tiers`, `faq`, `workshop`, `gift-certificate`, `booking-requests`, `workshop-applications`, `workshop-subscribers`, `gift-orders`, `settings`, `audit-log`. Collections provide list and item reads; lists use `limit` (1–100) and `offset`, deterministic ordering and `next_offset`. Request/subscriber resources allow read/delete only, as in UI. Workshop/gift/settings are singleton reads/patches. Only tiers/FAQ support ordinary JSON creation. All editable fields are allowlisted and validated, including nested content arrays; reject unknown fields.
S3. Content rows have a database-maintained integer `version`, incremented for every update (including existing UI writes). Item/singleton GET returns an ETag. PATCH/DELETE require exact `If-Match: "<version>"`; missing is 428, mismatch 409. Reorder takes `{items:[{id,version}]}` and atomically reuses the listed items' existing visual slots, preserving omitted rows' visual slots. Legacy duplicate numeric positions are normalized under the same lock using `(position,id)` order; this may bump omitted row versions. Database row locks/version predicates protect against races. New tiers/FAQ prepend as UI does.
S4. `POST /uploads` creates an immutable upload session (`purpose`: media/workshop/gift, `kind`: photo/video, filename, content_type, size, dimensions, optional video duration). Return signed PUT destinations for source and video JPEG poster. File bytes bypass the application server. Existing limits: photos 10 MiB, video 25 MiB; video only for portfolio. `POST /uploads/{id}/complete` verifies stored files, finalizes a hidden media row or returns an asset storage path for a page. Completion is retry-safe. `GET /uploads/{id}` permits recovery. No token management endpoints. The script reads PAT from environment and never prints secrets or signed URLs.
S5. Every authenticated mutation gets a journal entry before execution; terminal outcome is recorded, with interrupted requests remaining visibly `started`. Successful database mutations and their success audit updates share a transaction. Validation failures record only stable error codes. Journal is paginated in UI and API. Storage deletion uses a durable cleanup queue so failed cleanup can retry without destroying a live media row; drain a bounded batch on subsequent mutations. Public cache invalidation includes all affected pages.
S6. Existing UI behavior is preserved. New Russian admin API tab provides token create/list/revoke and journal browsing; secrets are marked private from session replay. Full content coverage includes workshop/gift image upload and nested arrays, independent banner/sales switches, ordering, visibility and notification email.
S7. SQL changes add RLS to every new table; PAT/journal/upload/cleanup tables and mutation RPCs are service-role-only. No secret is returned by list operations or stored in audit. API HTML fields are sanitized with the existing rehype dependencies before persistence; the UI rich-text renderer trusts admin-authored content. No external writes, deployment, commits or PR are required by this implementation invocation.

## Internal integration contract

- `api_tokens`: id uuid, owner_id uuid (auth.users), name text, prefix text, token_hash text unique, created_at, last_used_at nullable, revoked_at nullable.
- `api_audit_log`: id uuid, token_id uuid, token_name text, operation text, resource text, resource_id text nullable, status text (`started`/`succeeded`/`failed`), error_code text nullable, created_at, completed_at nullable.
- `api_uploads`: id uuid, token_id uuid, purpose text, kind text, bucket text, storage_path text, poster_path nullable, metadata jsonb, expires_at, completed_at nullable, result jsonb nullable, created_at.
- `api_storage_cleanup`: id uuid, bucket text, paths text[], created_at.
- `admin_api_mutate(p_resource text, p_action text, p_id text, p_expected_version integer, p_data jsonb, p_token_id uuid, p_audit_id uuid) returns jsonb`. Resource names above; actions `create`, `update`, `delete`, `reorder`, `begin-upload`, `complete-upload`. Upload start signs destinations first, then uses `begin-upload` to check access and persist the session plus audit atomically before exposing URLs. Completion uses resource `uploads`, id upload UUID, metadata from stored session; returns persisted result. Ordinary writes return raw row; delete returns deleted row; reorder returns rows. Recheck token not revoked and owner still admin in transaction. SQLSTATE P0001 messages `not_found`, `conflict`, `unauthorized`, `invalid_request`; JS maps to stable HTTP errors. Whitelist resources/fields at both application and database boundaries. Singleton settings key is `booking_recipient_email` only. RPC updates success audit row transactionally.

## Verification

Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`; review baseline warnings separately. PGlite tests execute migration and exercise access grants/RLS, UI version increments, atomic conflict detection/reorder rollback, upload finalization replay and audit consistency. Route/auth tests cover PAT refusal/revocation, invalid fields, pagination and preconditions. UI tests cover one-time secret and revoke/error states. Independently review intent/spec and correctness before completion.
