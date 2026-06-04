# Browser QA Checklist (Assistant Integration)

## Smoke
- Login/logout
- Dashboard load
- Lift list/search
- Inspection list/details
- Email actions still operational

## Assistant-specific
- Health endpoint returns expected flags.
- Disabled mode does not alter existing behavior.
- No unexpected console/network errors.

## Regression
- Re-run smoke after each assistant-related change.
- Compare against baseline PM2 and error logs.
