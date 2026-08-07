const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

    await page.goto('http://localhost:5000/pages/auth/login.html');
    await page.fill('#email', 'dispatcher@festlift.pt');
    await page.fill('#password', 'dispatcher123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5000/pages/dispatcher/propostas-manutencao-list.html');
    await page.waitForSelector('#propostasTbody tr', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: '/home/andriy/deapseak/.tmp-shots/1-dispatcher-lista.png', fullPage: true });

    // Click "Responder" on the solicitado row
    const respondeu = await page.$('a:has-text("Responder")');
    if (respondeu) {
        await respondeu.click();
        await page.waitForSelector('#avisoPedidoCliente', { timeout: 15000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: '/home/andriy/deapseak/.tmp-shots/2-dispatcher-template-prefilled.png', fullPage: true });
    }

    await browser.close();
    console.log('DONE');
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(1); });
