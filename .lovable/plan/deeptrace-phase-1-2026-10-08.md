# DeepTrace Phase 1

## Build
- Replace the template screen with a polished dark graphite investigation workspace, consistent navigation, global search, responsive layout, and route-specific page titles/descriptions.
- Deliver the command center, case list and case workspace, new investigation flow, evidence vault, interactive clearly-labelled demo graph, timeline, campaign intelligence, grounded copilot shell, ATT&CK, findings, reports, data sources, audit log, and settings.
- Make case creation, filtering/search, and initial evidence capture functional; show honest empty states elsewhere and label any graph fixture as demonstration data.
- Add a Lovable Cloud schema for organizations, cases, evidence, entities, relationships, campaigns, timelines, findings, ATT&CK mappings, and audit records, with organization/case-scoped RLS and explicit grants.
- Keep role assignments exclusively in a separate organization-scoped `user_roles` table; never trust browser storage or user-editable metadata for authorization. Initialize each signup with its own workspace and ADMIN assignment through a database trigger.
- Add an app-owned email/Google sign-in path so persistent workspace data is only available to authenticated users, and connect case/evidence forms to Cloud under RLS.

## Technical approach
- Use TanStack Start file routes, shared reusable interface pieces, Lucide icons, semantic OKLCH tokens, and existing UI dependencies.
- Use the generated Cloud browser client for RLS-scoped data operations; avoid privileged client-side access and avoid claiming evidence was parsed or analyzed.
- Validate the primary user journey: sign in or create an account, create an investigation, and confirm its case and initial evidence appear in the workspace.
