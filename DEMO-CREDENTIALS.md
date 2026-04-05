# 🔑 FestLift — Credenciais de Demonstração

**Atualizado:** Abril 2026  
**Versão:** v2.x (FestLift Edition — Portugal)

---

## 🌐 Acesso ao sistema

```bash
# Iniciar o sistema
./autostart.sh

# Abrir no browser (local)
http://localhost:5000/pages/auth/login.html

# GitHub Codespaces
https://<CODESPACE_NAME>-5000.app.github.dev/pages/auth/login.html
```

---

## 👥 Contas de demonstração

| Papel | Email | Password | Funções principais |
|-------|-------|----------|--------------------|
| 👨‍💼 **Administrador** | info@festlift.pt | admin123 | Gestão total, relatórios, checklists manuais |
| 📞 **Operador** | dispatcher@festlift.pt | dispatcher123 | Pedidos, agendamento manutenções, visualização inspeções |
| 🔧 **Técnico 1** | tech1@festlift.pt | tech123 | QR scanner → checklist dinâmico por tipo de ascensor |
| 🔧 **Técnico 2** | tech2@festlift.pt | tech123 | QR scanner → checklist dinâmico |
| 👤 **Cliente** | client@festlift.pt | client123 | Consulta de pedidos |

---

## 📋 Fluxo de manutenção mensal (DL 320/2002 Art. 5.º)

1. **Operador/Admin** agenda → insere morada manualmente → seleciona técnico + data
2. **Técnico** no local: escaneia QR do ascensor → dados preenchidos automaticamente
3. Seleciona tipo de visita / accionamento / porta → checklist normativo gerado
4. Verifica cada ponto → guarda relatório → PDF/Email para cliente

> ⚠️ **Portugal: manutenção mensal OBRIGATÓRIA** — DL 320/2002 Art. 5.º § 1

---

## 🔧 Recriar utilizadores demo

```bash
mongosh deapseak --quiet --eval 'db.users.deleteMany({});'
node create-demo-users.js
```

---

**Pronto para usar! 🎉**
