# Assistant Infra Setup

## Objective
Prepare local Ollama runtime for CPU-only server (16 GB RAM, no GPU).

## Planned model
- qwen2.5:3b

## Steps
1. Install Ollama service.
2. Pull model.
3. Verify health with scripts/ai/check_ollama_health.sh.
4. Run warmup with scripts/ai/warmup_model.sh.
5. Keep assistant feature flags disabled until rollout gate is approved.

## Runtime safety defaults
- Timeout: 15s
- Retries: 1-2 max
- Single request queue for low thermal load
