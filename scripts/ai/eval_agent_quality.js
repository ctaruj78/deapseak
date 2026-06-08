const base = 'http://127.0.0.1:5000';

const prompts = [
  'Cria um email curto e profissional para um cliente sobre inspecao vencida do elevador, com prazo de regularizacao e pedido de confirmacao.',
  'Tenho falhas recorrentes de porta no elevador do predio Rua da Liberdade 120. Da um plano de acao tecnico em 6 passos com prioridade e risco.',
  'Resume em 5 bullets as obrigacoes principais de manutencao mensal em Portugal para ascensores.',
  'Gera uma checklist rapida para visita tecnica de 30 minutos focada em seguranca e travao/limitador.',
  'Escreve uma mensagem para operador interno explicando atraso de peca e como comunicar isso ao cliente sem conflito.',
  'Como priorizar 4 elevadores com anomalias diferentes: porta intermitente, ruido no motor, paragens bruscas, e botoneira danificada?',
  'Propoe template de resposta para cliente apos inspecao com nao conformidades e proximos passos.',
  'Da 7 perguntas de diagnostico que o tecnico deve fazer no local antes de abrir ordem de intervencao.'
];

async function login() {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'info@festlift.pt', password: 'admin123' })
  });
  const body = await res.json();
  return body.token || body?.data?.token || body?.data?.accessToken || '';
}

async function ask(token, message) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  const t0 = Date.now();
  try {
    const res = await fetch(base + '/api/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message }),
      signal: ctrl.signal
    });
    const t1 = Date.now();
    const body = await res.json().catch(() => ({}));
    const reply = body.reply || body.error || '';
    return {
      http: res.status,
      sec: ((t1 - t0) / 1000).toFixed(2),
      len: String(reply).length,
      sample: String(reply).replace(/\s+/g, ' ').slice(0, 220)
    };
  } catch (err) {
    const t1 = Date.now();
    return {
      http: 0,
      sec: ((t1 - t0) / 1000).toFixed(2),
      len: 0,
      sample: `ERROR: ${err.name || 'RequestError'} ${err.message || ''}`.trim()
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const token = await login();
  if (!token) {
    console.log('LOGIN_FAIL');
    process.exit(1);
  }

  for (let i = 0; i < prompts.length; i += 1) {
    const q = prompts[i];
    const r = await ask(token, q);
    console.log(`CASE=${i + 1}|HTTP=${r.http}|SEC=${r.sec}|LEN=${r.len}`);
    console.log('Q=' + q);
    console.log('A=' + r.sample);
    console.log('---');
  }
}

main().catch(err => {
  console.error('RUN_FAIL', err.message);
  process.exit(1);
});
