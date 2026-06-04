# Assistant Security Guardrails

## Access
- Assistant endpoints require authentication.
- High-impact actions require admin/dispatcher confirmation.

## Data protection
- Mask tokens, passwords, and secret keys in prompts/logs.
- Restrict model context to minimum required fields.

## Operational safety
- Feature flags default to disabled.
- Fallback path must not break primary app workflows.
- Every assistant decision must be auditable.
