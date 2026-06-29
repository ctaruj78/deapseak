const https = require('https');
const http  = require('http');

const BASE_URL    = 'https://api.moloni.pt/v1';
const TOKEN_URL   = 'https://api.moloni.pt/oauth2/auth';
const CLIENT_ID   = process.env.MOLONI_CLIENT_ID;
const CLIENT_SECRET = process.env.MOLONI_CLIENT_SECRET;
const USERNAME    = process.env.MOLONI_USERNAME;
const PASSWORD    = process.env.MOLONI_PASSWORD;
const COMPANY_ID  = process.env.MOLONI_COMPANY_ID ? parseInt(process.env.MOLONI_COMPANY_ID) : null;

// In-memory token cache
let _token = null;
let _tokenExpiry = 0;
let _companyId = COMPANY_ID;

function isConfigured() {
    return !!(CLIENT_ID && CLIENT_SECRET && USERNAME && PASSWORD);
}

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.request({
            hostname: parsed.hostname,
            path:     parsed.pathname + parsed.search,
            method:   options.method || 'GET',
            headers:  { 'Content-Type': 'application/json', ...(options.headers || {}) },
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                } catch (e) {
                    reject(new Error('Invalid JSON from Moloni API'));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

async function getToken() {
    if (_token && Date.now() < _tokenExpiry - 30000) return _token;

    const params = new URLSearchParams({
        grant_type:    'password',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username:      USERNAME,
        password:      PASSWORD,
    });

    const res = await request(TOKEN_URL + '?' + params.toString(), { method: 'POST' });
    if (!res.access_token) throw new Error('Moloni auth failed: ' + JSON.stringify(res));

    _token = res.access_token;
    _tokenExpiry = Date.now() + (res.expires_in || 3600) * 1000;
    return _token;
}

async function getCompanyId() {
    if (_companyId) return _companyId;
    const token = await getToken();
    const url = `${BASE_URL}/companies/getAll/?api_client_id=${CLIENT_ID}&access_token=${token}`;
    const res = await request(url, { method: 'POST' }, {});
    if (!Array.isArray(res) || !res.length) throw new Error('Sem empresas na conta Moloni');
    _companyId = res[0].company_id;
    return _companyId;
}

// Map SAF-T invoice type to Moloni API endpoint prefix
const TYPE_ENDPOINT = {
    FT: 'invoices',
    FR: 'receipts',
    ND: 'debitNotes',
    NC: 'creditNotes',
    VD: 'bills',
    GT: 'deliveryNotes',
};

// Parse "FT M/827" → { type: 'FT', series: 'M', number: 827 }
function parseInvoiceNo(invoiceNo) {
    const m = String(invoiceNo || '').trim().match(/^([A-Z]+)\s+([^\/]+)\/(\d+)$/);
    if (!m) return null;
    return { type: m[1], series: m[2], number: parseInt(m[3]) };
}

async function getInvoiceDocumentId(invoiceNo) {
    const token     = await getToken();
    const companyId = await getCompanyId();
    const parsed    = parseInvoiceNo(invoiceNo);
    if (!parsed) throw new Error('Formato de fatura inválido: ' + invoiceNo);

    const endpoint = TYPE_ENDPOINT[parsed.type] || 'invoices';
    const url = `${BASE_URL}/${endpoint}/getAll/?api_client_id=${CLIENT_ID}&access_token=${token}`;

    const body = {
        company_id:        companyId,
        qty:               50,
        offset:            0,
        document_set_name: parsed.series,
        number:            parsed.number,
    };

    const res = await request(url, { method: 'POST' }, body);
    if (!Array.isArray(res) || !res.length) {
        throw new Error(`Fatura ${invoiceNo} não encontrada no Moloni`);
    }

    // Find exact match
    const doc = res.find(d => d.number === parsed.number) || res[0];
    return { documentId: doc.document_id, endpoint };
}

async function getInvoicePdfUrl(invoiceNo) {
    const { documentId, endpoint } = await getInvoiceDocumentId(invoiceNo);
    const token     = await getToken();
    const companyId = await getCompanyId();

    const url = `${BASE_URL}/${endpoint}/getPDFLink/?api_client_id=${CLIENT_ID}&access_token=${token}`;
    const res = await request(url, { method: 'POST' }, { company_id: companyId, document_id: documentId });

    if (!res.url) throw new Error('Moloni não devolveu URL do PDF: ' + JSON.stringify(res));
    return res.url;
}

async function streamInvoicePdf(invoiceNo, res) {
    const pdfUrl = await getInvoicePdfUrl(invoiceNo);
    return new Promise((resolve, reject) => {
        const parsed = new URL(pdfUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        mod.get(pdfUrl, (pdfRes) => {
            if (pdfRes.statusCode >= 400) {
                reject(new Error('Moloni PDF retornou ' + pdfRes.statusCode));
                return;
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition',
                `inline; filename="Fatura_${invoiceNo.replace(/[^A-Za-z0-9]/g, '_')}.pdf"`);
            if (pdfRes.headers['content-length']) {
                res.setHeader('Content-Length', pdfRes.headers['content-length']);
            }
            pdfRes.pipe(res);
            pdfRes.on('end', resolve);
            pdfRes.on('error', reject);
        }).on('error', reject);
    });
}

module.exports = { isConfigured, getToken, getInvoicePdfUrl, streamInvoicePdf };
