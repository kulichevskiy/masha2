---
revision: 1
status: accepted
accepted_revision: 1
---

# Administrative API

Acceptance: the user accepted the interview decisions and invoked `sdlc-implement` on 2026-09-18. This invocation authorizes local implementation of the whole agreed scope, not deployment.

I1. Agents and scripts can perform every current admin content operation without a browser: portfolio media, booking tiers/FAQ, workshop and gift content, requests/subscribers, notification settings.
I2. Multiple named, non-expiring, full-access PATs are created/listed/revoked only in the authenticated admin. Show each secret once.
I3. Files only; client prepares video posters and metadata. Supply an upload script.
I4. Changes apply immediately. New portfolio media start hidden. Reject API writes based on an obsolete version, including versions changed in the admin.
I5. Show a minimal API mutation journal in admin (time, token, operation, object, outcome), without secrets or request/customer bodies; no undo.
I6. Public human-readable documentation and OpenAPI. No arbitrary pages, multiple workshops, scopes, expiration, URL import, or server video processing.
