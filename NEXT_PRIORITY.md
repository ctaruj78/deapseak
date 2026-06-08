Next Priority Task

After full functional testing of the application is completed, implement local Ollama assistant integration.

Primary Goal
- Make the assistant the "eyes and brain" of the app for operational workflows.

Recommended Next Feature
- Proactive Incident Radar: detect repeated runtime errors, failed requests, PM2 restarts, slow AI responses, and suspicious data states, then summarize them for admin review with direct links to logs and affected screens.
- This should sit between the app and the assistant so the local model can explain issues in context, but only after logs/metrics are collected from the system.
- Start with read-only detection and daily summaries before any auto-remediation.

Role Model
- Shared core: one backend assistant service, one memory layer, one data source of truth, one safety policy.
- Role profiles: client, dispatcher, technician, admin each get a different prompt, capability set, and quick-action menu.
- Linking rule: all roles see the same operational facts when allowed by permissions, but each role only gets the data needed for its workflow.
- Orientation rule: client stays simple and proactive, dispatcher stays operational, technician stays diagnostic, admin stays supervisory.

Scope
- Email drafting/replies
- Maintenance control
- Inspection reminders
- Overdue alerts
- Browser-based QA bug-finding workflow

Environment
- Linux server
- 16 GB RAM
- No GPU (fanless)
- Preferred model: gemma4:12b-it-qat (fallback: qwen2.5:7b -> qwen2.5:3b)

Priority Buckets

P1 (Critical path to first safe launch)
- Phase 0: Preconditions
- Phase 1: Infrastructure and Runtime
- Phase 2: App Integration Layer
- Phase 4: Data and Access
- Phase 6: Monitoring and Reliability (minimum health + metrics)
- Phase 7: Deployment and Rollback (feature flags + tested rollback)

P2 (Business value after safe launch)
- Phase 3: Business Workflows (all 4 flows)
- Phase 5: Browser QA and Bug Finding (core suite)
- Phase 6: Advanced monitoring and daily report automation

P3 (Optimization and scale)
- Performance tuning for latency/cost
- Prompt tuning and workflow quality improvements
- Expanded regression suites and advanced analytics

Iteration 1 (Start Now): Planning + Baseline + Safe Skeleton
- [ ] Confirm functional test completion gate.
- [x] Capture baseline (PM2 status, restart trend, logs sample).
- [x] Prepare rollback checklist draft.
- [x] Create AI module skeleton files in backend.
- [x] Add config keys with assistant disabled by default.
- [x] Add assistant health endpoint (no model call yet).
- [x] Add minimal audit log structure.
- [x] Add feature flags file with all flows disabled.
- [x] Create initial docs: infra, prompt policy, security guardrails, runbook.
- [x] Define browser QA smoke scenario list.

Iteration 1 Exit Criteria
- [ ] Existing app behavior unchanged when assistant is disabled.
- [ ] Assistant endpoints compile/run without runtime errors.
- [ ] Feature flags and rollback doc are ready.
- [ ] Baseline artifacts are saved for comparison.

Known Baseline Risks (must be addressed before enabling assistant)
- PM2 history shows frequent restarts linked to EADDRINUSE on port 5000.
- Stabilization task: confirm single process ownership of port 5000 before rollout.

Iteration 2 (After Iteration 1): Runtime + First Live Capability
- [x] Install Ollama and pull qwen2.5:3b.
- [x] Enable only one low-risk workflow in internal mode.
- [x] Add timeout/retry/fallback policies.
- [x] Run browser QA + manual checks and compare with baseline.
- [x] Review PM2 stability and thermal impact.

Post-Install Validation Snapshot
- App root health: HTTP 200.
- Assistant health: HTTP 200, mode=internal, model=qwen2.5:3b.
- Protected APIs still guarded without token: HTTP 401 as expected.
- Ollama tags endpoint: HTTP 200.
- AgentService AI path: AI_PROVIDER=auto with Ollama fallback enabled.
- Browser login smoke: 4/4 roles successful.
- API smoke (live login tokens): 23/24 successful; one expected 403 on dispatcher calling /api/users without role filter.
- Data finding: demo client account has 0 linked lifts in DB (business data issue, not runtime breakage).
- Runtime review: app and Ollama are stable under low load; historical EADDRINUSE entries remain in logs and should be cleaned up separately.

Phase 0: Preconditions (must be done first)
- [ ] Complete functional testing of current app.
- [ ] Freeze current baseline: PM2 process status, logs, and DB backup.
- [ ] Confirm rollback procedure works.

Phase 1: Infrastructure and Runtime
- [ ] Install Ollama service on server.
- [ ] Pull baseline model: qwen2.5:3b.
- [ ] Add resource limits for fanless CPU mode.
- [ ] Verify model warm start and response latency.

Files/Artifacts to Create (Infra)
- [ ] docs/ai/INFRA_SETUP.md
- [ ] docs/ai/RESOURCE_LIMITS.md
- [ ] scripts/ai/check_ollama_health.sh
- [ ] scripts/ai/warmup_model.sh

Phase 2: App Integration Layer
- [ ] Add internal AI client in backend (single entrypoint for prompts).
- [ ] Add timeout/retry/circuit-breaker policy.
- [ ] Add fallback behavior when model is unavailable.
- [ ] Add centralized prompt templates with versioning.

Files/Artifacts to Create (Backend)
- [ ] src/ai/client.js
- [ ] src/ai/prompts.js
- [ ] src/ai/guards.js
- [ ] src/ai/schemas.js
- [ ] src/ai/index.js
- [ ] src/routes/assistant.routes.js
- [ ] docs/ai/PROMPT_POLICY.md

Phase 3: Business Workflows
- [ ] Email assistant flow (draft, tone, summary, approval before send).
- [ ] Maintenance monitor flow (daily checks, anomaly detection).
- [ ] Inspection reminder flow (upcoming, due today, overdue).
- [ ] Overdue escalation flow (severity levels and notifications).

Files/Artifacts to Create (Workflows)
- [ ] src/workflows/emailAssistant.js
- [ ] src/workflows/maintenanceMonitor.js
- [ ] src/workflows/inspectionReminders.js
- [ ] src/workflows/overdueEscalation.js
- [ ] docs/ai/WORKFLOW_RULES.md

Phase 4: Data and Access
- [ ] Define data contracts for assistant input/output.
- [ ] Add role-based action permissions.
- [ ] Add redaction for sensitive fields in prompts/logs.
- [ ] Add audit log for each assistant decision.

Files/Artifacts to Create (Data/Security)
- [ ] src/security/assistantPermissions.js
- [ ] src/security/redaction.js
- [ ] src/logging/assistantAudit.js
- [ ] docs/ai/DATA_CONTRACTS.md
- [ ] docs/ai/SECURITY_GUARDRAILS.md

Phase 5: Browser QA and Bug Finding
- [ ] Create browser test scenarios for core user flows.
- [ ] Add automatic capture for console/network/runtime errors.
- [ ] Add AI triage summaries for failed scenarios.
- [ ] Add regression rerun suite after each fix.

Files/Artifacts to Create (QA)
- [ ] tests/browser/smoke.spec.js
- [ ] tests/browser/maintenance.spec.js
- [ ] tests/browser/inspection.spec.js
- [ ] tests/browser/email.spec.js
- [ ] tests/browser/overdue.spec.js
- [ ] tests/browser/helpers/collectErrors.js
- [ ] tests/browser/helpers/aiTriage.js
- [ ] docs/qa/BROWSER_QA_CHECKLIST.md

Phase 6: Monitoring and Reliability
- [ ] Add health endpoint for assistant subsystem.
- [ ] Add metrics: request count, latency, failure rate, fallback rate.
- [ ] Add daily report job for assistant outcomes.
- [ ] Add PM2/log alerts on repeated failures.

Files/Artifacts to Create (Ops)
- [ ] src/routes/assistant.health.js
- [ ] src/metrics/assistantMetrics.js
- [ ] scripts/ops/assistant_daily_report.sh
- [ ] docs/ops/ASSISTANT_RUNBOOK.md

Phase 7: Deployment and Rollback
- [ ] Add staged rollout: disabled -> internal only -> limited production -> full.
- [ ] Add feature flags for each workflow.
- [ ] Validate rollback in under 5 minutes.

Files/Artifacts to Create (Release)
- [ ] config/assistant.flags.json
- [ ] docs/release/ASSISTANT_ROLLOUT.md
- [ ] docs/release/ASSISTANT_ROLLBACK.md

Configuration Keys to Add
- [ ] OLLAMA_BASE_URL
- [ ] OLLAMA_MODEL
- [ ] OLLAMA_TIMEOUT_MS
- [ ] OLLAMA_MAX_RETRIES
- [ ] ASSISTANT_ENABLED
- [ ] ASSISTANT_EMAIL_ENABLED
- [ ] ASSISTANT_MAINTENANCE_ENABLED
- [ ] ASSISTANT_INSPECTIONS_ENABLED
- [ ] ASSISTANT_OVERDUE_ENABLED
- [ ] ASSISTANT_AUDIT_LOG_ENABLED

Acceptance Criteria
- [ ] Assistant responses are stable and relevant in production-like tests.
- [ ] No critical regression in existing app functionality.
- [ ] Browser QA suite detects seeded test bugs.
- [ ] Logs and metrics are sufficient for troubleshooting.
- [ ] Rollback tested and documented.

Definition of Done
- [ ] All checklist items completed.
- [ ] Documentation updated.
- [ ] PM2 service stable (no abnormal restart spikes).
- [ ] Handover notes prepared for operations.
