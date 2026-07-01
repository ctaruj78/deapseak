// One-off notice: password-change bug on client profile page was fixed.
// Run once, then this file can be deleted.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const emailService = require('../backend/services/emailService');

const TO = 'alice.martins@hospitaldocondominio.pt';
const SUBJECT = 'FestLift — Alteração de palavra-passe já disponível';
const HTML = `
<p>Olá Alice,</p>
<p>Detetámos e corrigimos um problema técnico que impedia a alteração de palavra-passe através do seu perfil no FestLift.</p>
<p>Já pode entrar na plataforma e definir uma palavra-passe da sua escolha em:<br>
<strong>Perfil → separador "Segurança" → Alterar palavra-passe</strong></p>
<p>O sistema ainda está em desenvolvimento — se detetar qualquer outra falha ou comportamento estranho, não hesite em contactar-nos. Ficamos gratos por reportar, para podermos corrigir rapidamente.</p>
<p>Pedimos desculpa pelo inconveniente.</p>
<p>Cumprimentos,<br>Equipa FestLift</p>
`;

(async () => {
    try {
        await emailService.sendEmail(TO, SUBJECT, HTML);
        console.log(`OK: email sent to ${TO}`);
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err.message);
        process.exit(1);
    }
})();
