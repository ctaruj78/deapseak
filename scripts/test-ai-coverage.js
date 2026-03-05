#!/usr/bin/env node

require('dotenv').config();

const jwt = require('jsonwebtoken');

const BASE_URL = process.env.AI_TEST_BASE_URL || 'http://127.0.0.1:5000';
const jwtSecretFromEnv = process.env.JWT_SECRET;
const JWT_SECRET = (!jwtSecretFromEnv || jwtSecretFromEnv.startsWith('your-'))
    ? 'deapseak_secret_key_2024'
    : jwtSecretFromEnv;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não está definido.');
    console.error('Defina a variável e execute novamente:');
    console.error('GEMINI_API_KEY=... npm run test:ai:coverage');
    process.exit(1);
}

const token = jwt.sign(
    {
        userId: 'coverage-user-001',
        email: 'qa@deapseak.pt',
        role: 'admin',
        username: 'QA Coverage'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const testCases = [
    {
        name: 'Regulamento',
        question: 'O que é o Artigo 78 do Decreto 513/70?'
    },
    {
        name: 'Segurança',
        question: 'Quais são os riscos de um elevador sem limitador de velocidade?'
    },
    {
        name: 'Operacional',
        question: 'Como priorizar correções C1, C2 e C3 após inspeção?'
    },
    {
        name: 'Técnico',
        question: 'Como funciona o sistema de cabos e tração de um elevador elétrico?'
    },
    {
        name: 'Conformidade',
        question: 'Que documentação devo manter para auditoria de elevadores em Portugal?'
    }
];

const hasCyrillic = (text) => /[\u0400-\u04FF]/.test(text);
const isFallback = (text) => /temporariamente indisponível|entre em contato com o administrador/i.test(text);

async function askAI(question) {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: question })
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
        const message = payload?.message || payload?.error || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return payload.data?.response || '';
}

async function run() {
    console.log('🧪 AI coverage check iniciado');
    console.log(`🌐 Base URL: ${BASE_URL}`);

    const failures = [];

    for (const testCase of testCases) {
        try {
            const answer = await askAI(testCase.question);
            const shortAnswer = answer.replace(/\s+/g, ' ').trim().slice(0, 180);

            const failedByFallback = isFallback(answer);
            const failedByLanguage = hasCyrillic(answer);

            if (failedByFallback || failedByLanguage || !answer.trim()) {
                failures.push({
                    name: testCase.name,
                    reason: failedByFallback
                        ? 'Resposta de fallback (IA indisponível)'
                        : failedByLanguage
                        ? 'Resposta contém texto não português (cirílico)'
                        : 'Resposta vazia',
                    preview: shortAnswer
                });
                console.log(`❌ ${testCase.name}: falhou`);
            } else {
                console.log(`✅ ${testCase.name}: ok`);
            }
        } catch (error) {
            failures.push({
                name: testCase.name,
                reason: `Erro de requisição: ${error.message}`,
                preview: ''
            });
            console.log(`❌ ${testCase.name}: erro`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    console.log('\n' + '─'.repeat(72));
    if (failures.length === 0) {
        console.log('✅ Cobertura AI aprovada: sem fallback e sem respostas fora do idioma esperado.');
        process.exit(0);
    }

    console.log(`❌ Cobertura AI falhou em ${failures.length}/${testCases.length} casos:`);
    failures.forEach((failure, index) => {
        console.log(`${index + 1}. [${failure.name}] ${failure.reason}`);
        if (failure.preview) {
            console.log(`   ↳ ${failure.preview}`);
        }
    });

    process.exit(2);
}

run();
