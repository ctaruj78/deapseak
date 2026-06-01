# 📚 FestLift / DeapSeaK — Índice de Documentação

**Atualizado:** Abril 2026 | **Versão:** v2.x

---

## 🚀 Início rápido

| Ficheiro | Descrição |
|----------|-----------|
| [README.md](../README.md) | Visão geral, funcionalidades e stack |
| [QUICK-START.md](../QUICK-START.md) | Guia de arranque |
| [HOW-TO-OPEN.md](../HOW-TO-OPEN.md) | Como abrir no browser (local vs Codespaces) |
| [DEMO-CREDENTIALS.md](../DEMO-CREDENTIALS.md) | Contas demo + fluxo de manutenção |
| [PRODUCTION-DEPLOYMENT-GUIDE.md](../PRODUCTION-DEPLOYMENT-GUIDE.md) | Deploy para produção |

---

## 🔧 Configuração e infraestrutura

| Ficheiro | Descrição |
|----------|-----------|
| [PORTS-CONFIG.md](PORTS-CONFIG.md) | Configuração de portas ⭐ |
| [BREVO-SETUP-GUIDE.md](../BREVO-SETUP-GUIDE.md) | Configuração de email Brevo |
| [BREVO-SMTP-SETUP.md](BREVO-SMTP-SETUP.md) | SMTP Brevo detalhado |
| [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | Resolução de problemas |

---

## 📋 Sistema de Manutenção (Portugal — DL 320/2002)

| Tema | Localização |
|------|-------------|
| Motor de templates dinâmicos | `assets/js/inspection-templates.js` |
| Formulário de manutenção (técnico + QR) | `pages/tech/manutencao.html` |
| Checklists dinâmicos (admin) | `pages/admin/inspection-template.html` |
| Agendamento de manutenções (operador) | `pages/dispatcher/inspections.html` → "Nova Manutenção" |
| Modelo Lift (driveType, doorType) | `backend/models/Lift.js` |

**Normas suportadas:** EN 81-20/50, EN 81-2, EN 81-1, EN 81-3, EN 81-41, DL 320/2002, DL 163/2006, DL 95/2019

---

## 🤖 AI Assistente

| Ficheiro | Descrição |
|----------|-----------|
| [REGULATIONS-AUTO-UPDATE-GUIDE.md](../REGULATIONS-AUTO-UPDATE-GUIDE.md) | Atualização automática de regulamentos |
| [INSTALL-PT-PT-VOICE.md](../INSTALL-PT-PT-VOICE.md) | Instalar voz pt-PT para TTS |
| [VOICE-FEATURES-GUIDE.md](VOICE-FEATURES-GUIDE.md) | Funcionalidades de voz |
| [AI-RISK-MATRIX-LOGIC.md](AI-RISK-MATRIX-LOGIC.md) | Matriz de risco AI |

---

## 💼 Documentos comerciais

| Ficheiro | Descrição |
|----------|-----------|
| [ORCAMENTOS-MANUAL.md](../ORCAMENTOS-MANUAL.md) | Manual de orçamentos |
| [CRM-UNIFIED-SYSTEM.md](CRM-UNIFIED-SYSTEM.md) | Sistema CRM |

---

## 🛠️ Técnico / Desenvolvimento

| Ficheiro | Descrição |
|----------|-----------|
| [technical-guide.md](technical-guide.md) | Guia técnico do sistema |
| [api-documentation.md](api-documentation.md) | Documentação da API REST |
| [user-manual.md](user-manual.md) | Manual do utilizador |
| [USER-MANAGEMENT-SECURITY.md](USER-MANAGEMENT-SECURITY.md) | Segurança e gestão de utilizadores |
| [REGULATIONS-EXPANSION-PLAN.md](REGULATIONS-EXPANSION-PLAN.md) | Plano de expansão de regulamentos |
| [IMPLEMENTATION-TODO.md](IMPLEMENTATION-TODO.md) | Plano de implementação e prioridades técnicas |

---

## 📁 Estrutura de pastas chave

```
deapseak/
├── unified-server.js          # Servidor principal
├── backend/
│   ├── models/Lift.js         # driveType, doorType, tipo de ascensor
│   ├── models/Inspection.js   # Registos de manutenção
│   └── routes/                # API REST /api/*
├── pages/
│   ├── tech/manutencao.html   # ← Técnico: QR + checklist dinâmico
│   ├── admin/inspection-template.html  # ← Admin: checklist + manual
│   └── dispatcher/inspections.html     # ← Operador: agendar + visualizar
├── assets/js/
│   └── inspection-templates.js  # Motor de templates normativos
└── docs/                      # Esta pasta
```

---

> 💡 **Arquivos obsoletos** estão em `backup/` e não afetam o sistema.
