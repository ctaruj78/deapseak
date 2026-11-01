#!/usr/bin/env node
/**
 * Converte a 1.ª página de um PDF em PNG (Playwright/Chromium + pdf.js do pdf-parse) para
 * verificar visualmente formulários preenchidos — não depende de poppler/ghostscript.
 *
 * Uso:  node scripts/render-pdf-preview.js <entrada.pdf> <saida.png> [escala=1.6] [página=1]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const PDFJS_DIR = path.join(__dirname, '..', 'node_modules', 'pdf-parse', 'lib', 'pdf.js', 'v1.10.100', 'build');

// Servidor local mínimo: página em branco + pdf.js + worker (mesma origem → o Worker funciona)
function startServer() {
    return new Promise(resolve => {
        const srv = http.createServer((req, res) => {
            const name = req.url.split('?')[0];
            if (name === '/') { res.setHeader('Content-Type', 'text/html'); return res.end('<html><body style="margin:0;background:#fff"><canvas id="c"></canvas></body></html>'); }
            const file = { '/pdf.js': 'pdf.js', '/pdf.worker.js': 'pdf.worker.js' }[name];
            if (!file) { res.statusCode = 404; return res.end(); }
            res.setHeader('Content-Type', 'application/javascript');
            fs.createReadStream(path.join(PDFJS_DIR, file)).pipe(res);
        }).listen(0, '127.0.0.1', () => resolve(srv));
    });
}

async function renderPdfToPng(pdfPath, pngPath, scale = 1.6, pageNo = 1) {
    const srv = await startServer();
    const base = `http://127.0.0.1:${srv.address().port}`;
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
        page.setDefaultTimeout(40000);
        await page.goto(base + '/');
        await page.addScriptTag({ url: base + '/pdf.js' });
        const b64 = fs.readFileSync(pdfPath).toString('base64');
        const size = await page.evaluate(async ({ b64, scale, workerSrc, pageNo }) => {
            PDFJS.workerSrc = workerSrc;
            const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            const pdf = await PDFJS.getDocument({ data: bytes });
            const pg = await pdf.getPage(pageNo);
            const vp = pg.getViewport(scale);
            const c = document.getElementById('c');
            c.width = vp.width; c.height = vp.height;
            await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            return { w: vp.width, h: vp.height };
        }, { b64, scale, workerSrc: base + '/pdf.worker.js', pageNo });
        await page.setViewportSize({ width: Math.ceil(size.w), height: Math.ceil(size.h) });
        await page.locator('#c').screenshot({ path: pngPath });
    } finally {
        await browser.close();
        srv.close();
    }
}

module.exports = { renderPdfToPng };

if (require.main === module) {
    const [, , pdf, png, scale, pageNo] = process.argv;
    if (!pdf || !png) { console.error('Uso: node scripts/render-pdf-preview.js <entrada.pdf> <saida.png> [escala]'); process.exit(1); }
    renderPdfToPng(pdf, png, scale ? parseFloat(scale) : 1.6, pageNo ? parseInt(pageNo, 10) : 1).then(() => console.log('OK', png)).catch(e => { console.error('ERRO', e.message); process.exit(1); });
}
