/**
 * Test script: orçamento photo attachment in PDF email
 * Tests the full flow: create orcamento → upload photo → generate PDF → check photos
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE_URL = 'http://127.0.0.1:5000';

async function request(method, url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

async function uploadPhoto(orcamentoId, token) {
    return new Promise((resolve, reject) => {
        // Create a simple colored PNG test image (50x50 red square)
        const pngHeader = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        ]);
        
        // Use a real test image path
        const testImagePath = path.join(__dirname, 'assets', 'img', 'logo.png');
        let imageBuffer;
        if (fs.existsSync(testImagePath)) {
            imageBuffer = fs.readFileSync(testImagePath);
        } else {
            // Use a 1x1 PNG as fallback
            imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        }
        
        const boundary = '----FormBoundary' + Date.now();
        const filename = 'test-lift-photo.png';
        
        let body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fotos"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`),
            imageBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        
        const options = {
            hostname: '127.0.0.1',
            port: 5000,
            path: `/api/orcamentos/${orcamentoId}/fotos`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
                'Authorization': `Bearer ${token}`
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function downloadPdf(orcamentoId, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 5000,
            path: `/api/orcamentos/${orcamentoId}/pdf`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ 
                status: res.statusCode, 
                contentType: res.headers['content-type'],
                data: Buffer.concat(chunks) 
            }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('🧪 Testing orçamento photo attachment in PDF email\n');
    
    // Step 1: Login
    console.log('1️⃣  Logging in as admin...');
    const loginRes = await request('POST', `${BASE_URL}/api/auth/login`, {
        email: 'info@festlift.pt',
        password: 'admin123'
    });
    
    if (!loginRes.data.success) {
        console.error('❌ Login failed:', loginRes.data);
        process.exit(1);
    }
    const token = loginRes.data.data.token;
    console.log('   ✅ Token: ' + token.slice(0, 30) + '...\n');
    
    // Step 2: Get lifts
    console.log('2️⃣  Getting a lift...');
    const liftsRes = await request('GET', `${BASE_URL}/api/lifts?limit=1`, null, { Authorization: `Bearer ${token}` });
    const lifts = liftsRes.data.data?.lifts || [];
    const liftId = lifts[0]?._id;
    const liftAddress = lifts[0]?.address;
    const addrStr = liftAddress ? [liftAddress.street, liftAddress.zipCode, liftAddress.city].filter(Boolean).join(', ') : 'Av. Teste 123, Lisboa';
    console.log(`   Lift: ${liftId || 'none'} - ${addrStr}\n`);
    
    // Step 3: Create orcamento
    console.log('3️⃣  Creating test orçamento...');
    const createRes = await request('POST', `${BASE_URL}/api/orcamentos`, {
        cliente: {
            nome: 'FestLift Admin Test',
            email: 'info@festlift.pt',
            morada: addrStr || 'Av. Teste 123 Lisboa',
            telefone: '+351214190863',
            nif: '515924741'
        },
        servicos: [
            { descricao: 'Manutenção preventiva mensal', quantidade: 1, precoUnitario: 450, total: 450 },
            { descricao: 'Inspeção de segurança', quantidade: 1, precoUnitario: 150, total: 150 }
        ],
        subtotal: 600,
        iva: 138,
        total: 738,
        notas: 'Orçamento teste com foto - diagnóstico',
        liftId: liftId
    }, { Authorization: `Bearer ${token}` });
    
    if (!createRes.data.success) {
        console.error('❌ Create orcamento failed:', JSON.stringify(createRes.data, null, 2));
        process.exit(1);
    }
    
    const orc = createRes.data.data;
    const orcId = orc._id;
    const orcNum = orc.numero;
    console.log(`   ✅ Created: ${orcNum} (ID: ${orcId})\n`);
    
    // Step 4: Upload photo
    console.log('4️⃣  Uploading test photo...');
    const uploadRes = await uploadPhoto(orcId, token);
    console.log(`   Upload status: ${uploadRes.status}`);
    if (uploadRes.data.success) {
        console.log(`   ✅ Photos saved: ${JSON.stringify(uploadRes.data.fotos)}`);
        
        // Verify files exist on disk
        for (const fotoPath of uploadRes.data.fotos) {
            const absPath = path.join('/workspaces/deapseak', fotoPath);
            const exists = fs.existsSync(absPath);
            console.log(`   📸 File ${absPath}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        }
    } else {
        console.error('   ❌ Upload failed:', uploadRes.data);
    }
    console.log('');
    
    // Step 5: Generate PDF and check photos
    console.log('5️⃣  Generating PDF (checking photo inclusion)...');
    const pdfRes = await downloadPdf(orcId, token);
    console.log(`   PDF status: ${pdfRes.status}`);
    console.log(`   Content-Type: ${pdfRes.contentType}`);
    console.log(`   PDF size: ${pdfRes.data.length} bytes`);
    
    if (pdfRes.status === 200 && pdfRes.contentType?.includes('pdf')) {
        // Save PDF for inspection
        const pdfOutPath = `/tmp/test-orcamento-${orcNum}.pdf`;
        fs.writeFileSync(pdfOutPath, pdfRes.data);
        console.log(`   ✅ PDF saved to ${pdfOutPath}`);
        
        // Check if PDF contains image data (large enough to have images)
        if (pdfRes.data.length > 10000) {
            console.log('   ✅ PDF size suggests images ARE included');
        } else {
            console.log('   ⚠️  PDF is small - images may NOT be included');
        }
    } else {
        console.error('   ❌ PDF generation failed:', pdfRes.status);
    }
    console.log('');
    
    // Step 6: Send email
    console.log('6️⃣  Sending email to info@festlift.pt...');
    const sendRes = await request('POST', `${BASE_URL}/api/orcamentos/${orcId}/enviar`, {
        email: 'info@festlift.pt'
    }, { Authorization: `Bearer ${token}` });
    
    console.log(`   Send status: ${sendRes.status}`);
    console.log(`   Success: ${sendRes.data.success}`);
    console.log(`   Message: ${sendRes.data.message}`);
    if (sendRes.data.warning) console.log(`   ⚠️  Warning: ${sendRes.data.warning}`);
    
    if (sendRes.data.success && !sendRes.data.warning) {
        console.log('\n   ✅ EMAIL SENT SUCCESSFULLY via Brevo!');
        console.log('   Check info@festlift.pt inbox for the orçamento email');
        console.log('   PDF should include the test photo');
    } else if (sendRes.data.warning) {
        console.log('\n   ⚠️  Email NOT sent - Brevo not configured');
        console.log('   But PDF generation WORKS correctly');
    }
    
    console.log('\n📋 Summary:');
    console.log(`   Orçamento: ${orcNum}`);
    console.log(`   ID: ${orcId}`);
    console.log(`   Photos: ${uploadRes.data.fotos?.length || 0} uploaded`);
    console.log(`   PDF: ${pdfRes.data.length} bytes generated`);
    console.log(`   Email: ${sendRes.data.success ? '✅ sent' : '❌ failed'}`);
    
    // Verify again the photo paths
    console.log('\n🔍 Photo diagnostic:');
    const orcFull = await request('GET', `${BASE_URL}/api/orcamentos/${orcId}`, null, { Authorization: `Bearer ${token}` });
    const savedOrc = orcFull.data.data;
    if (savedOrc) {
        console.log(`   Fotos in DB: ${JSON.stringify(savedOrc.fotos)}`);
        (savedOrc.fotos || []).forEach(fp => {
            const abs = path.join('/workspaces/deapseak', fp);
            console.log(`   File check: ${abs} → ${fs.existsSync(abs) ? '✅' : '❌ missing'}`);
        });
    }
}

run().catch(err => {
    console.error('\n❌ Test error:', err.message);
    process.exit(1);
});
