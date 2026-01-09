#!/usr/bin/env node

/**
 * 🧪 Тестовий скрипт для перевірки Municipality Flow
 * Симулює всі кроки роботи з муніципалітетами
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const TOKEN = process.env.TEST_TOKEN || '';

// Кольорове виведення
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
    console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function login() {
    try {
        log('🔐', 'Крок 1: Авторизація...', colors.cyan);
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@deapseak.com',
            password: 'admin123'
        });
        
        if (response.data.success && response.data.token) {
            log('✅', `Авторизація успішна! Token: ${response.data.token.substring(0, 20)}...`, colors.green);
            return response.data.token;
        } else {
            throw new Error('Токен не отримано');
        }
    } catch (error) {
        log('❌', `Помилка авторизації: ${error.message}`, colors.red);
        throw error;
    }
}

async function getAllLifts(token) {
    try {
        log('📋', 'Крок 2: Отримання списку ліфтів...', colors.cyan);
        const response = await axios.get(`${BASE_URL}/api/lifts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        log('📊', `Структура відповіді:`, colors.yellow);
        console.log(JSON.stringify({
            success: response.data.success,
            dataKeys: Object.keys(response.data.data || {}),
            liftsCount: response.data.data?.lifts?.length || 0
        }, null, 2));
        
        const lifts = response.data.data?.lifts || [];
        log('✅', `Знайдено ${lifts.length} ліфтів`, colors.green);
        return lifts;
    } catch (error) {
        log('❌', `Помилка отримання ліфтів: ${error.message}`, colors.red);
        throw error;
    }
}

async function getLiftById(token, liftId) {
    try {
        log('🔍', `Крок 3: Отримання ліфта ${liftId}...`, colors.cyan);
        const response = await axios.get(`${BASE_URL}/api/lifts/${liftId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        log('📊', 'Структура відповіді API:', colors.yellow);
        console.log(JSON.stringify({
            success: response.data.success,
            'data': typeof response.data.data,
            'data.success': response.data.data?.success,
            'data.data': typeof response.data.data?.data,
            'data.data._id': response.data.data?.data?._id,
            'data.data.municipalNumber': response.data.data?.data?.municipalNumber,
            'data.lift': response.data.data?.lift ? 'exists' : 'undefined'
        }, null, 2));
        
        // Правильне витягування lift
        let lift;
        if (response.data.data?.data && response.data.data.data._id) {
            lift = response.data.data.data;
            log('✅', 'Lift знайдено в result.data.data', colors.green);
        } else if (response.data.data?.lift) {
            lift = response.data.data.lift;
            log('✅', 'Lift знайдено в result.data.lift', colors.green);
        } else {
            lift = response.data.data;
            log('⚠️', 'Fallback: використано result.data', colors.yellow);
        }
        
        log('📋', 'Дані ліфта:', colors.blue);
        console.log(JSON.stringify({
            _id: lift._id,
            municipalNumber: lift.municipalNumber,
            manufacturer: lift.manufacturer,
            model: lift.model,
            address: lift.address,
            hasClient: !!lift.client,
            hasQrCode: !!lift.qrCode
        }, null, 2));
        
        return lift;
    } catch (error) {
        log('❌', `Помилка отримання ліфта: ${error.message}`, colors.red);
        throw error;
    }
}

async function detectMunicipality(token, postalCode, address) {
    try {
        log('🏛️', `Крок 4: Визначення муніципалітету (postalCode: ${postalCode})...`, colors.cyan);
        const response = await axios.post(`${BASE_URL}/api/municipalities/detect`, {
            postalCode: postalCode,
            address: address
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.data) {
            const mun = response.data.data;
            log('✅', `Муніципалітет знайдено: ${mun.name} (${mun.distrito})`, colors.green);
            log('📧', `Email: ${mun.lift_department?.email || mun.email || 'Não especificado'}`, colors.blue);
            return mun;
        } else {
            throw new Error(response.data.message || 'Municipality not found');
        }
    } catch (error) {
        log('❌', `Помилка визначення муніципалітету: ${error.message}`, colors.red);
        return null;
    }
}

async function loadEmailTemplate(templateType) {
    try {
        log('📧', `Крок 5: Завантаження email шаблону (${templateType})...`, colors.cyan);
        const templatePath = `./templates/emails/${templateType}.html`;
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }
        
        const template = fs.readFileSync(templatePath, 'utf8');
        log('✅', `Шаблон завантажено (${template.length} символів)`, colors.green);
        
        // Перевіряємо наявність плейсхолдерів
        const placeholders = [
            '{{municipalityName}}',
            '{{municipalNumber}}',
            '{{liftAddress}}',
            '{{postalCode}}',
            '{{serviceStartDate}}',
            '{{clientName}}',
            '{{clientPhone}}',
            '{{clientEmail}}'
        ];
        
        const foundPlaceholders = placeholders.filter(ph => template.includes(ph));
        log('📋', `Знайдено плейсхолдерів: ${foundPlaceholders.length}/${placeholders.length}`, colors.blue);
        foundPlaceholders.forEach(ph => log('  •', ph, colors.blue));
        
        return template;
    } catch (error) {
        log('❌', `Помилка завантаження шаблону: ${error.message}`, colors.red);
        throw error;
    }
}

function fillTemplate(template, lift, municipality) {
    log('🔄', 'Крок 6: Заповнення шаблону даними...', colors.cyan);
    
    // Витягуємо address
    let addressStr = 'Não especificado';
    let postalCode = 'Não especificado';
    
    if (lift.address) {
        if (typeof lift.address === 'object') {
            const parts = [];
            if (lift.address.street) parts.push(lift.address.street);
            if (lift.address.city) parts.push(lift.address.city);
            addressStr = parts.join(', ') || 'Não especificado';
            postalCode = lift.address.zipCode || 'Não especificado';
        } else {
            addressStr = lift.address;
            postalCode = lift.postalCode || lift.zipCode || 'Não especificado';
        }
    }
    
    // Витягуємо client data
    const clientName = lift.clientName || lift.client?.name || 'Não especificado';
    const clientPhone = lift.clientPhone || lift.client?.phone || 'Não especificado';
    const clientEmail = lift.clientEmail || lift.client?.email || 'Não especificado';
    
    const data = {
        municipalityName: municipality?.name || 'Não especificado',
        municipalNumber: lift.municipalNumber || 'Não especificado',
        qrCode: lift.qrCode?.code || lift.qrCode || 'Não especificado',
        liftAddress: addressStr,
        postalCode: postalCode,
        serviceStartDate: new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }),
        currentDate: new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }),
        clientName: clientName,
        clientPhone: clientPhone,
        clientEmail: clientEmail
    };
    
    log('📋', 'Дані для заповнення:', colors.blue);
    console.log(JSON.stringify(data, null, 2));
    
    let filledTemplate = template;
    Object.keys(data).forEach(key => {
        const placeholder = `{{${key}}}`;
        filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    
    // Перевіряємо чи залишились незаповнені плейсхолдери
    const remainingPlaceholders = filledTemplate.match(/{{[^}]+}}/g);
    if (remainingPlaceholders) {
        log('⚠️', `Незаповнені плейсхолдери: ${remainingPlaceholders.join(', ')}`, colors.yellow);
    } else {
        log('✅', 'Всі плейсхолдери заповнено!', colors.green);
    }
    
    return filledTemplate;
}

async function runFullTest() {
    console.log('\n' + '='.repeat(60));
    log('🧪', 'ПОВНИЙ ТЕСТ MUNICIPALITY FLOW', colors.cyan);
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Login
        const token = await login();
        console.log('');
        
        // 2. Get lifts
        const lifts = await getAllLifts(token);
        console.log('');
        
        if (lifts.length === 0) {
            log('⚠️', 'Немає ліфтів для тестування!', colors.yellow);
            return;
        }
        
        // 3. Get first lift details
        const liftId = lifts[0]._id || lifts[0].id;
        const lift = await getLiftById(token, liftId);
        console.log('');
        
        // 4. Detect municipality
        const postalCode = lift.address?.zipCode || lift.postalCode || lift.zipCode || '';
        const addressStr = typeof lift.address === 'object' 
            ? `${lift.address.street || ''}, ${lift.address.city || ''}`.trim()
            : lift.address || '';
            
        const municipality = await detectMunicipality(token, postalCode, addressStr);
        console.log('');
        
        // 5. Load template
        const template = await loadEmailTemplate('municipality-inicio-servico');
        console.log('');
        
        // 6. Fill template
        const filledEmail = fillTemplate(template, lift, municipality);
        console.log('');
        
        // 7. Summary
        console.log('='.repeat(60));
        log('✅', 'ТЕСТ ЗАВЕРШЕНО УСПІШНО!', colors.green);
        console.log('='.repeat(60));
        log('📊', 'Результати:', colors.cyan);
        log('  •', `Lift ID: ${lift._id}`, colors.blue);
        log('  •', `Municipal Number: ${lift.municipalNumber}`, colors.blue);
        log('  •', `Address: ${addressStr}`, colors.blue);
        log('  •', `Postal Code: ${postalCode}`, colors.blue);
        log('  •', `Municipality: ${municipality?.name || 'Not found'}`, colors.blue);
        log('  •', `Email length: ${filledEmail.length} chars`, colors.blue);
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.log('\n' + '='.repeat(60));
        log('❌', 'ТЕСТ ПРОВАЛЕНО!', colors.red);
        console.log('='.repeat(60));
        log('💥', `Помилка: ${error.message}`, colors.red);
        console.log('='.repeat(60) + '\n');
        process.exit(1);
    }
}

// Запуск
runFullTest().catch(console.error);
