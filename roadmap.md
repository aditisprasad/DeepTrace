- [x] Fix and validate the current frontend issues without changing the established Cloud security model.
- [x] Complete the shared DeepTrace shell, sign-in surface, route metadata, and essential screens.
- [x] Connect case creation, initial evidence capture, and persisted listings to the existing Cloud tables and private storage.
- [x] Verify the signed-in case/evidence refresh workflow and review current preview diagnostics.

## Phase 2 — Evidence Vault & Ingestion Engine
- [ ] Add extraction-status column to evidence (additive migration).
- [ ] Build deterministic pattern-extraction module (URLs, domains, IPs, emails, hashes, phones, timestamps) shared client/server.
- [ ] Server ingestion functions: validate, preserve original, extract, store entities + observations with provenance, audit log, duplicate + size checks.
- [ ] Case Evidence Vault UI: drag-and-drop upload, file picker, progress, filters, search, detail panel, notes, role-gated delete.
- [ ] Workspace-wide Evidence Vault overview page with filters.
- [ ] Add creator to case_members on case creation so analysts can access their own cases.
- [ ] Unit tests for extraction and validation.
- [ ] Run production build, typecheck, tests; verify in browser signed-in.
