---
name: no-unsolicited-refactors
description: Do not make sweeping storage/architecture changes without explicit user request
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bb6b28f4-936a-4b86-9f9d-da5519c0f7e5
---

**Rule:** Do not initiate large-scale refactoring of storage, migration, or architecture layers unless the user explicitly asks for it. Even when code quality issues exist, point them out and ask before changing.

**Why:** I rewrote Maixiang's storage layer (storage.js, home.js, hrv_storage_manager.js, hrv_analysis.js, deleted migrate.js, removed LocalStorage) without being asked to, and these changes may have broken a working project. The user was rightfully angry.

**How to apply:** When reviewing code, report findings but wait for explicit instruction before editing. Especially for:
- Storage/memory infrastructure
- Migration logic
- Anything touching data persistence
- Home page initialization flow

A review is a report, not a mandate to rewrite.
