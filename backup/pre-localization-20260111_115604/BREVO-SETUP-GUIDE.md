# 📧 Brevo Email Setup - Guia Completo

## 🎯 Porquê Brevo?

✅ **300 emails/dia GRÁTIS** (mais que suficiente para orçamentos)  
✅ **Deliverability 99%+** (emails não vão para spam)  
✅ **Tracking profissional** (quem abriu, quando, quantas vezes)  
✅ **Usa teu domínio** `info@festlift.pt` (não brevo.com!)  
✅ **Dashboard completo** com estatísticas  
✅ **Suporte SMTP + API REST**  

---

## 📝 Passo 1: Criar conta Brevo (2 minutos)

### 1.1. Registo:
```
1. Vai a: https://www.brevo.com/
2. Clica "Sign Up" → "Free Plan"
3. Preenche:
   - Email: (teu email pessoal ou empresa)
   - Password: (escolhe uma forte)
   - Company: FestLift, LDA
   - Country: Portugal
4. Aceita termos e "Create my account"
5. Confirma email (check inbox/spam)
```

### 1.2. Login inicial:
```
1. Login: https://app.brevo.com/
2. Dashboard aparece automaticamente
```

---

## 🔑 Passo 2: Criar SMTP API Key (1 minuto)

### 2.1. Aceder SMTP configuração:
```
Dashboard → Menu (canto superior direito) → 
SMTP & API → "SMTP" tab
```

### 2.2. Gerar SMTP Key:
```
1. Clica "Generate a new SMTP key"
2. Nome: "FestLift Orçamentos API"
3. Copia a chave (aparece UMA VEZ!)
   Exemplo: xsmtpsib-a1b2c3d4e5f6...
4. GUARDA ESTA CHAVE! (cola no .env depois)
```

### 2.3. Verifica credenciais:
```
✅ Login (email): O email que usaste no registo
✅ Password (SMTP key): A chave que acabaste de gerar
✅ Server: smtp-relay.brevo.com
✅ Port: 587 (TLS)
```

---

## ⚙️ Passo 3: Configurar .env

### 3.1. Abre ficheiro `.env`:
```bash
cd /workspaces/deapseak
nano .env
```

### 3.2. Preenche variáveis:
```env
# Brevo SMTP (Copiar credenciais do passo 2)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=teu-email@brevo.com        # Email do registo
SMTP_PASS=xsmtpsib-a1b2c3d4e5f6...   # SMTP Key gerada
EMAIL_FROM=FestLift <info@festlift.pt>
```

**Exemplo real:**
```env
SMTP_USER=joao.silva@gmail.com
SMTP_PASS=xsmtpsib-7f8e9d0c1b2a3456789...
EMAIL_FROM=FestLift <info@festlift.pt>
```

### 3.3. Guarda ficheiro:
```
CTRL+O → ENTER → CTRL+X
```

---

## 🌐 Passo 4: DNS Setup (IMPORTANTE para deliverability!)

### 4.1. Adicionar SPF record:

**Acede painel do teu hosting** (onde tens festlift.pt):

```
1. DNS Management / Gestão DNS
2. Adicionar TXT Record:
   
   Host/Nome: @  (ou festlift.pt)
   Tipo: TXT
   Valor: v=spf1 include:spf.brevo.com ~all
   TTL: 3600
   
3. Guardar
```

**O que isto faz?**  
✅ Diz ao Gmail/Outlook: "Brevo pode enviar emails por mim"  
✅ Sem isto, emails podem ir para spam!

### 4.2. Verificar sender (opcional mas recomendado):

No Brevo Dashboard:
```
1. Senders → "Add a Sender"
2. Email: info@festlift.pt
3. Name: FestLift
4. Brevo envia email de confirmação para info@festlift.pt
5. Clica link no email
```

**Depois disto:**  
✅ `info@festlift.pt` fica verificado  
✅ Deliverability melhora 30%+  
✅ Menos probabilidade de spam

---

## 🧪 Passo 5: Testar integração

### 5.1. Código de teste (criar test-brevo.js):

```javascript
// test-brevo.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const testEmail = {
    from: process.env.EMAIL_FROM,
    to: 'teu-email-pessoal@gmail.com', // MUDA ISTO!
    subject: '🎉 FestLift - Teste Brevo SMTP',
    html: `
        <h1>✅ Email funcionando!</h1>
        <p>Brevo SMTP configurado com sucesso para FestLift.</p>
        <p><strong>Sender:</strong> ${process.env.EMAIL_FROM}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-PT')}</p>
    `
};

transporter.sendMail(testEmail)
    .then(info => {
        console.log('✅ Email enviado!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📊 Ver estatísticas: https://app.brevo.com/');
    })
    .catch(error => {
        console.error('❌ Erro:', error.message);
    });
```

### 5.2. Executar teste:
```bash
node test-brevo.js
```

**Se tudo OK:**
```
✅ Email enviado!
📧 Message ID: <abc123@smtp-relay.brevo.com>
📊 Ver estatísticas: https://app.brevo.com/
```

**Se erro:**
```
❌ Erro: Invalid login
→ Verifica SMTP_USER e SMTP_PASS no .env
```

### 5.3. Verifica no Brevo Dashboard:
```
Dashboard → Statistics → Real-time
→ Deves ver 1 email enviado agora mesmo!
```

---

## 📊 Passo 6: Usar no sistema DeapSeaK

### 6.1. Já está integrado! 🎉

O código em `/services/email-service.js` já usa variáveis .env:

```javascript
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,      // smtp-relay.brevo.com
    port: process.env.SMTP_PORT,       // 587
    secure: false,
    auth: {
        user: process.env.SMTP_USER,   // Teu email Brevo
        pass: process.env.SMTP_PASS    // SMTP API Key
    }
});
```

### 6.2. Enviar orçamento por email:

**Backend endpoint** (já existe em `unified-server.js`):
```javascript
// POST /api/orcamentos/:id/enviar
router.post('/:id/enviar', async (req, res) => {
    const orcamento = await Orcamento.findById(req.params.id);
    
    await emailService.sendEmail({
        to: orcamento.cliente.email,
        subject: `Orçamento ${orcamento.numero} - FestLift`,
        html: `
            <h2>Orçamento ${orcamento.numero}</h2>
            <p>Válido até: ${orcamento.validadeAte}</p>
            <p>Total: ${orcamento.total}€</p>
        `
    });
    
    res.json({ success: true });
});
```

**Frontend** (adicionar botão em `invoice-template.html`):
```javascript
async function enviarOrcamento(orcamentoId) {
    const response = await fetch(`/api/orcamentos/${orcamentoId}/enviar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
        alert('✅ Orçamento enviado por email!');
    }
}
```

---

## 📈 Dashboard Brevo - O que vês?

### Real-time Statistics:
```
📧 Enviados hoje: 12
✅ Entregues: 12 (100%)
📖 Abertos: 8 (67%)
🖱️ Clicados: 2 (17%)
❌ Bounce: 0
```

### Campanhas (para bulk emails):
```
→ Podes criar templates visuais
→ Enviar para listas de contactos
→ Agendar envios
→ A/B testing
```

### Automation (avançado):
```
Exemplo: Cliente não abriu orçamento em 3 dias
→ Enviar follow-up automaticamente
```

---

## 🔄 Backup Plan (se Brevo falhar)

### Fallback para SMTP do hosting:

No código `email-service.js`:
```javascript
let transporter;

try {
    // Tenta Brevo primeiro
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} catch (error) {
    // Fallback para hosting
    console.warn('⚠️ Brevo falhou, usando backup SMTP');
    transporter = nodemailer.createTransport({
        host: process.env.BACKUP_SMTP_HOST,
        port: process.env.BACKUP_SMTP_PORT,
        auth: {
            user: process.env.BACKUP_SMTP_USER,
            pass: process.env.BACKUP_SMTP_PASS
        }
    });
}
```

---

## 🎯 Limites Plano Grátis Brevo

| Recurso | Limite Grátis | Notas |
|---------|---------------|-------|
| **Emails/dia** | 300 | Mais que suficiente! |
| **Emails/mês** | 9,000 | 300 × 30 dias |
| **Contactos** | Ilimitado | ✅ |
| **Templates** | Ilimitado | ✅ |
| **Tracking** | Sim | Opens, clicks, bounce |
| **API calls** | 300/dia | Mesmo que SMTP |
| **Support** | Email only | Forums + docs |

**Se precisares mais:**
- Lite Plan: €25/mês → 10,000 emails/dia
- Premium: €65/mês → 1M emails/mês + Marketing automation

---

## ❓ Troubleshooting

### Erro: "Invalid login"
```
✅ Verifica SMTP_USER (email do registo)
✅ Verifica SMTP_PASS (SMTP API Key, NÃO a tua password!)
✅ Gera nova SMTP key se necessário
```

### Erro: "Domain not verified"
```
✅ Adiciona SPF record (Passo 4.1)
✅ Espera 24h para DNS propagar
✅ Testa: dig festlift.pt TXT
```

### Email vai para spam:
```
✅ Verifica sender (info@festlift.pt) no Brevo
✅ Adiciona SPF + DKIM records
✅ Evita palavras como "grátis", "urgente", CAPS
✅ Usa HTML limpo (não só imagens)
```

### Rate limit (300/dia):
```
✅ Upgrade para Lite plan (€25/mês)
✅ Ou usa SMTP do hosting como backup
✅ Ou espalha envios ao longo do dia
```

---

## 📚 Recursos Úteis

- **Dashboard Brevo:** https://app.brevo.com/
- **SMTP Docs:** https://developers.brevo.com/docs/send-emails-through-smtp
- **API Docs:** https://developers.brevo.com/reference/sendtransacemail
- **Status Page:** https://status.brevo.com/
- **Support:** https://help.brevo.com/

---

## ✅ Checklist Final

Antes de usar em produção:

- [ ] Conta Brevo criada e confirmada
- [ ] SMTP API Key gerada e copiada
- [ ] `.env` preenchido com credenciais
- [ ] SPF record adicionado em DNS
- [ ] Sender `info@festlift.pt` verificado
- [ ] Teste enviado com sucesso
- [ ] Email aparece em Statistics no dashboard
- [ ] Email NÃO foi para spam
- [ ] Código integrado em `unified-server.js`
- [ ] Botão "Enviar Email" funcionando

---

🎉 **Pronto! Sistema de email profissional configurado!**

**Vantagens sobre SMTP do hosting:**
- 📊 **Tracking detalhado** (quem abriu, quando, quantas vezes)
- 🚀 **Velocidade superior** (envios em segundos)
- ✅ **Deliverability 99%+** (nunca vai para spam)
- 📈 **Escalável** (se negócio crescer)
- 💰 **Grátis** para 300/dia (orçamentos sobram!)

**Próximo passo:** Integrar botão "Enviar Email" na página de orçamentos!
