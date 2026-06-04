# Assistant Rollback

## Target
Restore pre-assistant behavior in less than 5 minutes.

## Procedure
1. Set config/assistant.flags.json -> assistantEnabled=false and all workflow flags=false.
2. Restart PM2 process.
3. Validate core API endpoints and login flow.
4. Compare with baseline artifacts in docs/ai/baseline.

## Verification
- No new assistant calls in logs.
- App routes respond normally.
- PM2 restarts do not spike.
