# Assistant Runbook

## Purpose
Operate assistant subsystem safely in production.

## Health checks
- GET /api/assistant/health
- scripts/ai/check_ollama_health.sh

## Incident quick actions
1. Disable assistant in config/assistant.flags.json.
2. Restart app process.
3. Validate core app endpoints.
4. Inspect logs/assistant-audit.log and PM2 logs.

## Rollback
- Keep assistant disabled and revert route wiring if needed.
- Confirm baseline behavior using stored baseline artifacts.
