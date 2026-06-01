# FestLift Implementation TODO Plan

**Updated:** 2026-06-01  
**Scope:** architecture, security, testing, public UX, repository hygiene  
**Goal:** reduce maintenance risk while improving the most valuable user flows

---

## Priority Summary

### P0. Stabilize the runtime architecture
- [ ] Define one official application entrypoint
- [ ] Split `unified-server.js` into route and service modules without changing behavior
- [ ] Decide the role of `backend/app.js`: adopt, merge, or deprecate
- [ ] Publish the target runtime structure in docs

### P1. Harden authentication and session handling
- [ ] Standardize one token storage strategy across all panels
- [ ] Remove legacy duplicate token keys where possible
- [ ] Move refresh token flow to safer cookie-based handling
- [ ] Audit role checks and unauthorized redirects for all role pages

### P2. Raise quality gates around real production code
- [ ] Update lint scope to include `unified-server.js` and `assets/js`
- [ ] Update Jest coverage targets to match active runtime files
- [ ] Add smoke tests for login, lift CRUD, QR public flow, and dispatcher assignment
- [ ] Add one CI pipeline for lint + focused tests

### P3. Systematize public UX and multilingual support
- [ ] Standardize `PT/EN` support for all public-facing pages
- [ ] Reuse one i18n approach for HTML labels and JS messages
- [ ] Align public assistant, QR pages, and landing pages around the same rules and wording
- [ ] Add public request status visibility where safe

### P4. Reduce repository noise and maintenance cost
- [ ] Move one-off scripts into grouped folders
- [ ] Archive or remove obsolete backups and duplicate assets
- [ ] Clean the project root so entrypoints and key docs are obvious
- [ ] Document the supported directory structure

### P5. Improve observability and operational control
- [ ] Replace ad-hoc `console.log` usage in hot paths with structured logging
- [ ] Add event logging for auth refresh, QR alerts, AI guest requests, and dispatch actions
- [ ] Define a lightweight health and incident dashboard
- [ ] Add metrics that expose QR scans, alert volume, assignment latency, and failures

---

## Recommended Delivery Sequence

## Phase 1. Architecture and runtime alignment

### Objectives
- eliminate duplicate backend truths
- make route ownership explicit
- reduce regression risk before larger changes

### Tasks
- [ ] Inventory all active route groups inside `unified-server.js`
- [ ] Extract helper modules first: geocoding, QR public flow, AI guest flow, notifications
- [ ] Extract route modules second: auth, lifts, requests, public QR, AI
- [ ] Keep behavior identical while moving code
- [ ] Add a short architecture note that explains where new routes belong

### Definition of done
- one documented runtime path
- route modules load from one place
- no route behavior changes during refactor
- server still starts with the same command

## Phase 2. Auth and security cleanup

### Objectives
- reduce token sprawl
- shrink XSS impact
- make role enforcement predictable

### Tasks
- [ ] Map every storage key used for auth in frontend code
- [ ] Replace fallback token scattering with one canonical key strategy
- [ ] Move refresh token storage to `HttpOnly` cookies if backend flow supports it
- [ ] Review CORS, cookie flags, proxy handling, and logout behavior
- [ ] Add a small auth test matrix for admin, dispatcher, tech, and client

### Definition of done
- one canonical access token strategy
- refresh flow documented and testable
- role pages reject invalid sessions consistently
- auth implementation no longer depends on multiple legacy key names

## Phase 3. Quality gates and testing

### Objectives
- test what actually runs in production
- catch regressions in high-risk flows
- make refactoring safer

### Tasks
- [ ] Update ESLint targets to cover active frontend and server files
- [ ] Update Jest config to reflect real entrypoints and modules
- [ ] Add smoke tests for:
  - [ ] login
  - [ ] create/edit lift
  - [ ] QR code generation
  - [ ] public QR alert creation
  - [ ] dispatcher assignment flow
- [ ] Add Playwright smoke coverage for public and authenticated critical flows
- [ ] Add a minimal CI workflow for pull requests

### Definition of done
- lint checks active code instead of stale files
- smoke suite covers the most expensive regressions
- CI gives a clear red/green signal before merge

## Phase 4. Public UX, QR, and i18n

### Objectives
- make public flows safer and easier for real non-auth users
- standardize multilingual behavior
- reduce mismatches between UI and backend rules

### Tasks
- [ ] Define one public i18n pattern for labels, placeholders, alerts, and API-result messages
- [ ] Roll out `PT/EN` to public landing, guest AI, demo, and QR flows
- [ ] Review all QR generation surfaces to ensure they encode URLs, not raw IDs or JSON
- [ ] Add a safe public request-status page or confirmation tracking flow
- [ ] Add analytics for scan volume, failed scans, and alert conversions

### Definition of done
- all public QR paths open a working public page
- all public-facing critical pages support `PT/EN`
- no assistant wording promises unavailable data access
- public QR funnel is measurable

## Phase 5. Repository cleanup and maintainability

### Objectives
- lower onboarding cost
- reduce confusion around active vs historical code
- improve day-to-day navigation

### Tasks
- [ ] Move operational scripts into `scripts/maintenance`, `scripts/data`, and `scripts/dev`
- [ ] Move historical reports into `docs/archive`
- [ ] Remove or quarantine obsolete root-level utilities and backups
- [ ] Audit duplicate plugin/vendor directories
- [ ] Refresh README and docs index after the cleanup

### Definition of done
- root folder highlights only active entrypoints and key docs
- old artifacts are archived or removed
- contributors can find code ownership faster

---

## Immediate Top 10 Tasks

1. [ ] Freeze and document the official runtime architecture.
2. [ ] Extract `public QR` logic from `unified-server.js` into a dedicated module.
3. [ ] Extract `AI guest` logic from `unified-server.js` into a dedicated module.
4. [ ] Audit every auth token key used in frontend code and define one canonical scheme.
5. [ ] Update `package.json` lint scripts to include active server and frontend files.
6. [ ] Update `jest.config.js` coverage targets to match active code.
7. [ ] Add a smoke test for the public QR alert flow.
8. [ ] Add a smoke test for login plus role redirect behavior.
9. [ ] Define one shared `PT/EN` i18n strategy for public pages.
10. [ ] Clean the project root and move one-off scripts into grouped folders.

---

## Suggested Ownership

### Backend
- route extraction
- auth hardening
- QR public APIs
- logging and metrics

### Frontend
- auth client cleanup
- public i18n rollout
- QR UX consistency
- stale page cleanup

### QA
- smoke coverage definition
- regression checklist for public QR and role panels
- CI gating strategy

---

## Risks to Watch

- Refactoring `unified-server.js` can break routes if done without smoke tests first.
- Auth cleanup can invalidate existing sessions if migration compatibility is removed too early.
- Repository cleanup can remove files that are still referenced by legacy pages.
- i18n rollout can create mixed-language UI if JS messages are not handled with the same pattern as HTML.

---

## Suggested Execution Window

### 3-day window
- architecture decision
- first route extraction
- auth key audit
- lint and Jest target cleanup

### 2-week window
- core route modularization
- auth/session hardening
- smoke tests and CI
- public `PT/EN` rollout on critical pages
- repository cleanup round 1

### Later
- public request tracking
- deeper analytics and SLA dashboards
- secondary language expansion beyond English

---

## Success Criteria

- New changes land in clear modules instead of extending a monolith.
- Public QR and guest AI flows are measurable, multilingual, and behaviorally accurate.
- Session handling is simpler and safer.
- CI protects the critical paths that matter to operations.
- The repository becomes easier to navigate for future work.