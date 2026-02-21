#!/usr/bin/env node
// Додавання тестових клієнтів через API

const https = require('http');

const BASE_URL = 'http://localhost:5000';

async function apiCall(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...(data && { 'Content-Length': Buffer.byteLength(data) })
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch {
                    resolve({ raw: responseData });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

const testClients = [
    {
        email: 'condominio.jardins@gmail.com',
        password: 'client123',
        role: 'client',
        firstName: 'Condomínio',
        lastName: 'Jardins do Tejo',
        phone: '+351911234501',
        address: 'Rua das Amendoeiras 45, Lisboa',
        companyName: 'Condomínio Jardins do Tejo',
        isActive: true
    },
    {
        email: 'hotel.beiramar@hotelbeiramar.pt',
        password: 'client123',
        role: 'client',
        firstName: 'Hotel',
        lastName: 'Beira Mar',
        phone: '+351229876543',
        address: 'Avenida da Praia 120, Porto',
        companyName: 'Hotel Beira Mar Lda',
        isActive: true
    },
    {
        email: 'municipio@cm-setubal.pt',
        password: 'client123',
        role: 'client',
        firstName: 'Câmara',
        lastName: 'Municipal de Setúbal',
        phone: '+351265599000',
        address: 'Praça do Bocage 1, Setúbal',
        companyName: 'Câmara Municipal de Setúbal',
        isActive: true
    },
    {
        email: 'clinica@clinicasaudetotal.pt',
        password: 'client123',
        role: 'client',
        firstName: 'Clínica',
        lastName: 'Saúde Total',
        phone: '+351213456789',
        address: 'Rua Dr. António José de Almeida 22, Lisboa',
        companyName: 'Clínica Saúde Total Lda',
        isActive: true
    },
    {
        email: 'galpao.logistica@galpao-lda.pt',
        password: 'client123',
        role: 'client',
        firstName: 'Galpão',
        lastName: 'Logística Grande',
        phone: '+351212340987',
        address: 'Zona Industrial de Palmela, Galpão 7, Palmela',
        companyName: 'Galpão Logística Grande Lda',
        isActive: true
    },
    {
        email: 'shopping.oeiras@oeiraspark.pt',
        password: 'client123',
        role: 'client',
        firstName: 'Shopping',
        lastName: 'Oeiras Park',
        phone: '+351214608000',
        address: 'Rua Quinta da Fonte, Oeiras',
        companyName: 'Oeiras Park Centro Comercial SA',
        isActive: true
    }
];

async function main() {
    console.log('🔐 Логін як адмін...');
    const loginRes = await apiCall('POST', '/api/auth/login', {
        email: 'info@festlift.pt',
        password: 'admin123'
    });

    if (!loginRes.success) {
        console.error('❌ Помилка логіну:', loginRes.message);
        process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Логін успішний\n');

    let created = 0;
    let skipped = 0;

    for (const client of testClients) {
        const res = await apiCall('POST', '/api/users', client, token);
        if (res.success) {
            console.log(`✅ Створено: ${client.email}`);
            created++;
        } else {
            console.log(`⏭️  Пропущено: ${client.email} (${res.message})`);
            skipped++;
        }
    }

    console.log(`\n📊 Результат: ${created} створено, ${skipped} пропущено`);

    // Перевіримо кількість клієнтів
    const usersRes = await apiCall('GET', '/api/users?role=client', null, token);
    console.log(`\n👥 Всього клієнтів в базі: ${usersRes.data ? usersRes.data.length : '?'}`);
    if (usersRes.data) {
        usersRes.data.forEach(u => console.log(`  - ${u.email} | ${u.firstName} ${u.lastName}`));
    }
}

main().catch(console.error);
