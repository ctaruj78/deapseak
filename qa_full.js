const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5000';
const SS = '/tmp/qa_ss';
fs.mkdirSync(SS, { recursive: true });

const USERS = [
  { email: 'info@festlift.pt',       pass: 'Test1234!', role: 'admin' },
  { email: 'dispatcher@festlift.pt', pass: 'Test1234!', role: 'dispatcher' },
  { email: 'ctaruj78@gmail.com',     pass: 'Test1234!', role: 'technician' },
  { email: 'client@festlift.pt',     pass: 'Test1234!', role: 'client' },
];

const findings = [];
const steps = [];

function step(icon, label, detail) {
  const s = `${icon} ${label}${detail !== undefined ? ' → ' + String(detail).substring(0,120) : ''}`;
  steps.push(s);
  console.log(s);
}

function bug(sev, msg) {
  const f = `${sev} ${msg}`;
  findings.push(f);
  console.error('BUG: ' + f);
}

async function shot(page, name) {
  try { await page.screenshot({ path: `${SS}/${name}.png`, fullPage: false }); } catch(_) {}
}

async function loginViaAPI(page, email, pass) {
  const r = await page.evaluate(async (creds) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(creds)
    });
    const d = await resp.json();
    return { ok: resp.ok, token: d.token, role: d.user?.role, msg: d.message };
  }, { email, password: pass });
  if (r.token) {
    await page.evaluate(t => {
      localStorage.setItem('liftmanager_jwt', t);
      localStorage.setItem('authToken', t);
    }, r.token);
  }
  return r;
}

async function goAuth(page, path, token) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 15000 });
  if (token) await page.evaluate(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
  }, token);
  if (page.url().includes('login')) {
    // set token and reload
    await page.evaluate(t => {
      localStorage.setItem('liftmanager_jwt', t);
      localStorage.setItem('authToken', t);
    }, token);
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 15000 });
  }
  await page.waitForTimeout(1500);
  return !page.url().includes('login');
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'] });

  // ═══════════════════════════════════════════════════════
  // SECTION A: LOGIN PAGE
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION A: LOGIN PAGE', '');
  const ctx0 = await browser.newContext({ viewport: {width:1366,height:768} });
  const page0 = await ctx0.newPage();
  const jsErrs = [];
  page0.on('console', m => { if(m.type()==='error') jsErrs.push(m.text()); });
  page0.on('pageerror', e => jsErrs.push('PAGEERR:'+e.message));

  try {
    await page0.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await shot(page0, '01_login');
    const hasEmail = await page0.$('#email, input[type=email]') !== null;
    const hasPass  = await page0.$('#password, input[type=password]') !== null;
    const hasBtn   = await page0.$('button[type=submit], #loginBtn, .btn-primary') !== null;
    step(hasEmail ? '✅' : '❌', 'Login: email input', hasEmail);
    step(hasPass  ? '✅' : '❌', 'Login: password input', hasPass);
    step(hasBtn   ? '✅' : '❌', 'Login: submit button', hasBtn);

    // Test wrong credentials
    if (hasEmail && hasPass && hasBtn) {
      await page0.fill('#email, input[type=email]', 'wrong@example.com');
      await page0.fill('#password, input[type=password]', 'wrongpass');
      await page0.click('button[type=submit], #loginBtn, .btn-primary');
      await page0.waitForTimeout(2000);
      const errMsg = await page0.$('.alert-danger, .error-msg, [class*="error"]');
      step(errMsg ? '✅' : '⚠️', 'Login error shown for wrong creds', !!errMsg);
      if (!errMsg) bug('⚠️', 'Login: no visible error message for invalid credentials');
      await shot(page0, '01b_login_error');
    }
  } catch(e) { bug('❌', 'Login page: ' + e.message.substring(0,100)); }
  await ctx0.close();

  // ═══════════════════════════════════════════════════════
  // SECTION B: ADMIN ROLE
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION B: ADMIN ROLE', 'info@festlift.pt');
  const ctxA = await browser.newContext({ viewport: {width:1366,height:768} });
  const pgA = await ctxA.newPage();
  const jsErrsA = [];
  pgA.on('console', m => { if(m.type()==='error' && !m.text().includes('favicon')) jsErrsA.push(m.text()); });
  pgA.on('pageerror', e => jsErrsA.push('PAGEERR:'+e.message));

  // A1. Login
  await pgA.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const adminLogin = await loginViaAPI(pgA, 'info@festlift.pt', 'Test1234!');
  step(adminLogin.ok ? '✅' : '❌', 'Admin API login', `role=${adminLogin.role}, msg=${adminLogin.msg||'ok'}`);
  const adminToken = adminLogin.token;
  if (!adminToken) { bug('❌', 'Admin login failed - cannot continue admin tests'); }

  // A2. Admin Dashboard
  jsErrsA.length = 0;
  const dashOK = adminToken && await goAuth(pgA, '/pages/admin/dashboard.html', adminToken);
  await shot(pgA, '02_admin_dashboard');
  step(dashOK ? '✅' : '❌', 'Admin dashboard accessible', pgA.url());
  if (!dashOK) bug('❌', 'Admin dashboard redirects to login');
  else {
    const stats = await pgA.$$('.stat-card, .info-box, .card, [class*="stat"]');
    step('📊', 'Dashboard stat blocks', stats.length);
    if (jsErrsA.filter(e => !e.includes('favicon')).length > 0) {
      bug('⚠️', 'Admin dashboard JS errors: ' + jsErrsA.slice(0,2).join(' | '));
    }
  }

  // A3. Admin Lifts - Main Page
  jsErrsA.length = 0;
  const liftsOK = adminToken && await goAuth(pgA, '/pages/admin/lifts.html', adminToken);
  await pgA.waitForTimeout(2000);
  await shot(pgA, '03_admin_lifts');
  step(liftsOK ? '✅' : '❌', 'Admin lifts page', pgA.url().substring(pgA.url().lastIndexOf('/')+1));

  if (liftsOK) {
    // Count lifts
    const rows = await pgA.$$('table tbody tr');
    step('📊', 'Lift rows in table', rows.length);
    if (rows.length === 0) bug('⚠️', 'Lifts table is empty - data not loading?');

    // Search filter
    const searchBox = await pgA.$('#searchInput, input[type=search], [placeholder*="Pesq"], [placeholder*="Search"]');
    if (searchBox) {
      await searchBox.fill('ethos');
      await pgA.waitForTimeout(1500);
      const filteredRows = await pgA.$$('table tbody tr:not([style*="none"])');
      step('✅', 'Search filter works', `"ethos" → ${filteredRows.length} row(s)`);
      await searchBox.fill('');
      await pgA.waitForTimeout(800);
    } else {
      step('⚠️', 'Search box not found');
      bug('⚠️', 'Lifts: search input not found');
    }

    // Add lift button
    const addBtn = await pgA.$('#add-lift-button, [onclick*="openEnhancedModal()"], .btn-success[onclick*="Modal"]');
    step(addBtn ? '✅' : '⚠️', '"Adicionar elevador" button', !!addBtn);

    // A3a. Test Info Button (Details Modal)
    jsErrsA.length = 0;
    const infoBtn = await pgA.$('td .btn-info, .btn-group .btn-info');
    if (infoBtn) {
      await infoBtn.click();
      await pgA.waitForTimeout(2500);
      await shot(pgA, '04_lift_details_modal');

      const modal = await pgA.$('#liftDetailsModal');
      const modalVisible = modal ? await modal.evaluate(el => el.classList.contains('show') || el.style.display !== 'none') : false;
      step(modalVisible ? '✅' : '❌', 'Details modal opens on info btn click', modalVisible);

      if (modalVisible) {
        // Check key fields
        const munNum = await pgA.$('#detail-municipal-number');
        const certDate = await pgA.$('#detail-license-date');
        const certExpiry = await pgA.$('#detail-license-expiry');
        const inspList = await pgA.$('#inspection-reports-list');
        const addRptBtn = await pgA.$('[onclick*="showAddReportModal"]');
        const pdfBtn = await pgA.$('#detailsPdfParserBtn');
        const contractSec = await pgA.$('#maintenance-contract-section');

        const munText = munNum ? await munNum.textContent() : 'NOT FOUND';
        const certText = certDate ? await certDate.textContent() : 'NOT FOUND';
        const certExpiryText = certExpiry ? await certExpiry.textContent() : 'NOT FOUND';
        const inspHTML = inspList ? (await inspList.innerHTML()).substring(0,150) : 'NOT FOUND';

        step(munNum ? '✅' : '❌', 'Details: municipal number', munText);
        step(certDate ? '✅' : '❌', 'Details: cert date', certText);
        step(certExpiry ? '✅' : '❌', 'Details: cert expiry', certExpiryText);
        step(inspList ? '✅' : '❌', 'Details: inspection-reports-list', inspHTML.substring(0,80));
        step(addRptBtn ? '✅' : '❌', 'Details: "Adicionar" report button', !!addRptBtn);
        step(pdfBtn ? '✅' : '❌', 'Details: PDF button (NEW)', !!pdfBtn);

        if (!pdfBtn) bug('❌', 'NEW PDF button missing from details modal');
        if (!addRptBtn) bug('❌', 'Add report button missing from details modal');
        if (!inspList) bug('❌', 'inspection-reports-list div missing from details modal');

        // JS errors in modal
        if (jsErrsA.length > 0) bug('⚠️', 'Details modal JS: ' + jsErrsA.slice(0,2).join(' | '));

        // Test "Editar" button in details modal
        const editFromDetails = await pgA.$('#edit-lift-from-details, .btn-primary[onclick*="editLift"]');
        step(editFromDetails ? '✅' : '⚠️', 'Details: "Editar" button', !!editFromDetails);

        // Close
        await pgA.keyboard.press('Escape');
        await pgA.waitForTimeout(600);
      } else {
        bug('❌', 'Details modal did NOT open');
      }
    } else {
      bug('⚠️', 'No info button found in lifts table');
    }

    // A3b. Test Edit Modal
    jsErrsA.length = 0;
    const editBtn = await pgA.$('td [onclick*="editLift"], .btn-primary[onclick*="edit"]');
    if (editBtn) {
      await editBtn.click();
      await pgA.waitForTimeout(3000);
      await shot(pgA, '05_edit_modal');

      const modal = await pgA.$('#enhancedLiftModal');
      const modalVis = modal ? await modal.evaluate(el => el.classList.contains('show')) : false;
      step(modalVis ? '✅' : '❌', 'Edit modal opens on edit btn click', modalVis);

      if (modalVis) {
        // Tab navigation
        const tabs = await pgA.$$('#eLiftTabs .nav-link');
        step('📊', 'Edit modal tabs count', tabs.length);

        const tab4 = await pgA.$('#eLiftTab-svc');
        if (tab4) {
          await tab4.click();
          await pgA.waitForTimeout(1000);
          await shot(pgA, '06_edit_servico_tab');

          const licDateInp = await pgA.$('[name="licenseDate"]');
          const licExpiryInp = await pgA.$('[name="licenseExpiry"]');
          step(licDateInp ? '✅' : '❌', 'Serviço: licenseDate input', !!licDateInp);
          step(licExpiryInp ? '✅' : '❌', 'Serviço: licenseExpiry input', !!licExpiryInp);

          // Test auto-calc
          if (licDateInp && licExpiryInp) {
            const beforeExpiry = await licExpiryInp.evaluate(el => el.value);
            await licExpiryInp.fill(''); // clear expiry first
            await licDateInp.fill('2025-03-10');
            await licDateInp.dispatchEvent('change');
            await pgA.waitForTimeout(500);
            const afterExpiry = await licExpiryInp.evaluate(el => el.value);
            const autoOK = afterExpiry === '2027-03-10';
            step(autoOK ? '✅' : '❌', 'licenseExpiry auto-calc: 2025-03-10 → +2yr', `got: ${afterExpiry}`);
            if (!autoOK) bug('❌', `licenseExpiry auto-calc: expected 2027-03-10, got "${afterExpiry}"`);
          }

          // PDF parser button in edit modal
          const pdfInEdit = await pgA.$('[data-target="#pdfParserModal"], .btn[data-target="#pdfParserModal"]');
          step(pdfInEdit ? '✅' : '⚠️', 'Serviço: PDF parser button', !!pdfInEdit);
        }

        // Cancel
        const cancelBtn = await pgA.$('#enhancedLiftModal .btn-secondary[data-dismiss="modal"]');
        if (cancelBtn) { await cancelBtn.click(); await pgA.waitForTimeout(800); }
        else { await pgA.keyboard.press('Escape'); await pgA.waitForTimeout(800); }
      } else {
        bug('❌', 'Edit modal did NOT open');
      }
    }

    // A3c. Test Add New Lift
    jsErrsA.length = 0;
    const addLiftBtn = await pgA.$('#add-lift-button, [onclick="openEnhancedModal()"]');
    if (addLiftBtn) {
      await addLiftBtn.click();
      await pgA.waitForTimeout(2000);
      await shot(pgA, '07_add_lift_modal');
      const modal = await pgA.$('#enhancedLiftModal');
      const modalVis = modal ? await modal.evaluate(el => el.classList.contains('show')) : false;
      step(modalVis ? '✅' : '❌', 'Add lift modal opens', modalVis);
      if (modalVis) {
        await pgA.keyboard.press('Escape');
        await pgA.waitForTimeout(600);
      }
    }
  }

  if (jsErrsA.filter(e => e.length > 0).length > 0) {
    bug('⚠️', 'Admin lifts accumulated JS errors: ' + jsErrsA.slice(0,3).join(' | '));
  }

  // A4. Other Admin Pages
  const adminNavPages = [
    ['/pages/admin/inspections.html',  '08_admin_inspections',  'Admin Inspections'],
    ['/pages/admin/users.html',        '09_admin_users',        'Admin Users'],
    ['/pages/admin/map.html',          '10_admin_map',          'Admin Map'],
    ['/pages/admin/analysis.html',     '11_admin_analysis',     'Admin Analysis'],
    ['/pages/admin/documents.html',    '12_admin_documents',    'Admin Documents'],
  ];

  for (const [path, ssname, label] of adminNavPages) {
    jsErrsA.length = 0;
    try {
      const ok = await goAuth(pgA, path, adminToken);
      await pgA.waitForTimeout(1500);
      await shot(pgA, ssname);
      step(ok ? '✅' : '❌', label, ok ? pgA.url().split('/').pop() : 'REDIRECT TO LOGIN');
      if (!ok) bug('❌', label + ': redirects to login');
      else if (jsErrsA.filter(e=>!e.includes('favicon')).length > 0) {
        bug('⚠️', label + ' JS errors: ' + jsErrsA.filter(e=>!e.includes('favicon')).slice(0,2).join(' | '));
      }
    } catch(e) {
      bug('⚠️', label + ' load error: ' + e.message.substring(0,80));
    }
  }

  // A5. QR Code Button  
  await goAuth(pgA, '/pages/admin/lifts.html', adminToken);
  await pgA.waitForTimeout(2000);
  const qrBtn = await pgA.$('[onclick*="QRCode"], [onclick*="qrCode"], [onclick*="generateQR"], .btn-success.btn-sm');
  if (qrBtn) {
    await qrBtn.click();
    await pgA.waitForTimeout(1500);
    await shot(pgA, '13_qr_modal');
    const qrModal = await pgA.$('[id*="qr"],[id*="QR"]');
    step(qrModal ? '✅' : '⚠️', 'QR modal opens', !!qrModal);
    await pgA.keyboard.press('Escape');
    await pgA.waitForTimeout(500);
  }

  await ctxA.close();

  // ═══════════════════════════════════════════════════════
  // SECTION C: DISPATCHER ROLE
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION C: DISPATCHER ROLE', 'dispatcher@festlift.pt');
  const ctxD = await browser.newContext({ viewport: {width:1366,height:768} });
  const pgD = await ctxD.newPage();
  const jsErrsD = [];
  pgD.on('console', m => { if(m.type()==='error' && !m.text().includes('favicon')) jsErrsD.push(m.text()); });

  await pgD.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const dispLogin = await loginViaAPI(pgD, 'dispatcher@festlift.pt', 'Test1234!');
  step(dispLogin.ok ? '✅' : '❌', 'Dispatcher login', `role=${dispLogin.role}`);
  const dispToken = dispLogin.token;

  if (dispToken) {
    const dispPages = [
      ['/pages/dispatcher/lifts.html',         '14_disp_lifts',    'Dispatcher Lifts'],
      ['/pages/dispatcher/inspections.html',   '15_disp_insp',     'Dispatcher Inspections'],
      ['/pages/dispatcher/dashboard.html',     '16_disp_dash',     'Dispatcher Dashboard'],
    ];
    for (const [path, ssname, label] of dispPages) {
      jsErrsD.length = 0;
      try {
        const ok = await goAuth(pgD, path, dispToken);
        await pgD.waitForTimeout(1500);
        await shot(pgD, ssname);
        step(ok ? '✅' : '❌', label, ok ? 'accessible' : 'REDIRECT');
        if (!ok) bug('❌', label + ': dispatcher cannot access ' + path);
        else if (jsErrsD.filter(e=>!e.includes('favicon')).length > 0) {
          bug('⚠️', label + ' JS errors: ' + jsErrsD.filter(e=>!e.includes('favicon')).slice(0,2).join(' | '));
        }
      } catch(e) { step('⚠️', label + ' error', e.message.substring(0,60)); }
    }

    // Can dispatcher access admin pages? Should redirect!
    const adminAccessOK = await goAuth(pgD, '/pages/admin/users.html', dispToken);
    step(!adminAccessOK ? '✅' : '❌', 'Dispatcher BLOCKED from admin/users.html', !adminAccessOK ? 'correctly blocked' : 'SECURITY: accessible!');
    if (adminAccessOK) bug('❌', 'SECURITY: Dispatcher can access admin pages!');
  }
  await ctxD.close();

  // ═══════════════════════════════════════════════════════
  // SECTION D: TECHNICIAN ROLE
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION D: TECHNICIAN ROLE', 'ctaruj78@gmail.com');
  const ctxT = await browser.newContext({ viewport: {width:1366,height:768} });
  const pgT = await ctxT.newPage();
  const jsErrsT = [];
  pgT.on('console', m => { if(m.type()==='error' && !m.text().includes('favicon')) jsErrsT.push(m.text()); });

  await pgT.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const techLogin = await loginViaAPI(pgT, 'ctaruj78@gmail.com', 'Test1234!');
  step(techLogin.ok ? '✅' : '❌', 'Technician login', `role=${techLogin.role}`);
  const techToken = techLogin.token;

  if (techToken) {
    const techPages = [
      ['/pages/tech/inspections.html', '17_tech_insp',  'Tech Inspections'],
      ['/pages/tech/dashboard.html',   '18_tech_dash',  'Tech Dashboard'],
      ['/pages/tech/lifts.html',       '19_tech_lifts', 'Tech Lifts'],
    ];
    for (const [path, ssname, label] of techPages) {
      jsErrsT.length = 0;
      try {
        const ok = await goAuth(pgT, path, techToken);
        await pgT.waitForTimeout(1500);
        await shot(pgT, ssname);
        step(ok ? '✅' : '⚠️', label, ok ? 'accessible' : 'redirect/404');
        if (jsErrsT.filter(e=>!e.includes('favicon')).length > 0) {
          bug('⚠️', label + ' JS errors: ' + jsErrsT.filter(e=>!e.includes('favicon')).slice(0,2).join(' | '));
        }
      } catch(e) { step('⚠️', label, e.message.substring(0,60)); }
    }
  }
  await ctxT.close();

  // ═══════════════════════════════════════════════════════
  // SECTION E: CLIENT ROLE
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION E: CLIENT ROLE', 'client@festlift.pt');
  const ctxC = await browser.newContext({ viewport: {width:1366,height:768} });
  const pgC = await ctxC.newPage();

  await pgC.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const clientLogin = await loginViaAPI(pgC, 'client@festlift.pt', 'Test1234!');
  step(clientLogin.ok ? '✅' : '❌', 'Client login', `role=${clientLogin.role}`);
  const clientToken = clientLogin.token;

  if (clientToken) {
    const clientPages = [
      ['/pages/client/my-lifts.html',   '20_client_lifts',   'Client My Lifts'],
      ['/pages/client/dashboard.html',  '21_client_dash',    'Client Dashboard'],
    ];
    for (const [path, ssname, label] of clientPages) {
      try {
        const ok = await goAuth(pgC, path, clientToken);
        await pgC.waitForTimeout(1500);
        await shot(pgC, ssname);
        step(ok ? '✅' : '⚠️', label, ok ? 'accessible' : 'redirect/404');
      } catch(e) { step('⚠️', label, e.message.substring(0,60)); }
    }

    // Client should NOT see admin pages
    const clientAdminAccess = await goAuth(pgC, '/pages/admin/lifts.html', clientToken);
    step(!clientAdminAccess ? '✅' : '❌', 'Client blocked from admin pages', !clientAdminAccess ? 'correctly blocked' : 'SECURITY ISSUE');
    if (clientAdminAccess) bug('❌', 'SECURITY: Client can access admin/lifts.html');
  }
  await ctxC.close();

  // ═══════════════════════════════════════════════════════
  // SECTION F: API ENDPOINTS
  // ═══════════════════════════════════════════════════════
  step('──', 'SECTION F: KEY API ENDPOINTS', '');
  const ctxAPI = await browser.newContext({ viewport: {width:1366,height:768} });
  const pgAPI = await ctxAPI.newPage();
  await pgAPI.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await pgAPI.evaluate(t => { localStorage.setItem('liftmanager_jwt', t); localStorage.setItem('authToken', t); }, adminLogin.token || '');

  const apiCalls = [
    ['GET',  '/api/lifts?limit=5',          'lifts list'],
    ['GET',  '/api/users',                   'users list'],
    ['GET',  '/api/inspections?limit=5',     'inspections'],
    ['GET',  '/api/lifts/stats',             'lift stats'],
    ['GET',  '/api/orcamentos?limit=5',      'orcamentos'],
    ['GET',  '/api/health',                  'health check'],
  ];

  for (const [method, path, label] of apiCalls) {
    const r = await pgAPI.evaluate(async ([m, p]) => {
      const token = localStorage.getItem('liftmanager_jwt');
      const resp = await fetch(p, {
        method: m,
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      }).catch(e => null);
      if (!resp) return { status: 0, ok: false, body: 'fetch failed' };
      const text = await resp.text().catch(() => '');
      return { status: resp.status, ok: resp.ok, body: text.substring(0, 100) };
    }, [method, path]);
    step(r.ok ? '✅' : '❌', `API ${method} ${label}`, `${r.status}: ${r.body.substring(0,80)}`);
    if (!r.ok) bug('❌', `API ${method} ${path} returned ${r.status}: ${r.body.substring(0,60)}`);
  }
  await ctxAPI.close();

  // ═══════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════
  const report = { steps, findings };
  fs.writeFileSync('/tmp/qa_report.json', JSON.stringify(report, null, 2));
  
  console.log('\n' + '═'.repeat(60));
  console.log('QA FINDINGS SUMMARY');
  console.log('═'.repeat(60));
  findings.forEach(f => console.log(f));
  console.log('═'.repeat(60));
  console.log(`Total steps: ${steps.length}, Total findings: ${findings.length}`);
  console.log('Screenshots: ' + SS);

  await browser.close();
})();
