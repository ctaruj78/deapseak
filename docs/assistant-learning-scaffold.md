# Assistant Learning Scaffold

Este scaffold adiciona uma base segura para melhoria contínua do assistente local sem treino automático em produção.

## Endpoints

- `GET /api/assistant/learning/status`
- `POST /api/assistant/learning/feedback`
- `GET /api/assistant/learning/stats`
- `GET /api/assistant/learning/recent?limit=20`
- `POST /api/assistant/learning/build-dataset`

## Exemplo: guardar feedback

```bash
curl -X POST http://127.0.0.1:5000/api/assistant/learning/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "question":"Qual é o prazo de inspeção?",
    "answer":"A inspeção é trimestral.",
    "rating":1,
    "tags":["inspecao","prazo"],
    "source":"admin-ui"
  }'
```

## Exemplo: gerar dataset para fine-tuning offline

```bash
curl -X POST http://127.0.0.1:5000/api/assistant/learning/build-dataset \
  -H "Content-Type: application/json" \
  -d '{"onlyApproved":true,"maxItems":2000}'
```

## Armazenamento

- Feedback: `data/assistant-learning/feedback.jsonl`
- Datasets: `data/assistant-learning/datasets/train-*.jsonl`

## Variável de controlo

- `ASSISTANT_LEARNING_ENABLED=true|false` (default: `true`)
