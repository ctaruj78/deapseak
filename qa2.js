const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5000';
const SS = '/tmp/qa_ss';
fs.mkdirSync(SS, { recursive: true });

const findings = [];
const steps = [];

function step(icon, label, detail) {
  const s = `${icon} ${label}${detail !== undefined ? ' → ' + String(detail).substring(0,150) : ''}`;
  steps.push(s);
  console.log(s);
}
function bug(sev, msg) { findings.push(`${sev} ${msg}`); console.error('BUG: ' + msg); }
async function shot(page, name) {
  try { await page.screenshot({ path: `${SS}/${name}.png`, fullPage: false }); } catch(_) {}
}

async function apiLogin(page, email, pass) {
  const r = await page.evaluate(async (c) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: c.email, password: c.pass })
    });
    const d = await resp.json();
    // response: {success, data: {user, token}}
    const token = d.data?.token || d.token;
    const role  = d.data?.user?.role || d.user?.role;
    const name  = d.data?.user?.firstName || '';
    if (token) {
      localStorage.setItem('liftmanager_jwt', token);
      localStorage.setItem('authToken', token);
    }
    return { ok: resp.ok, token, role, name, msg: d.message };
  }, { email, pass });
  return r;
}

async function nav(page, path, token) {
  if (token) {
    await page.evaluate(t => {
      localStorage.setItem('liftmanager_jwt', t);
      localStorage.setItem('authToken', t);
    }, token);
  }
  const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 15000 });
  if (token && page.url().includes('login')) {
    await page.evaluate(t => {
      localStorage.setItem('liftmanager_jwt', t);
      localStorage.setItem('authToken', t);
    }, token);
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 15000 });
  }
  await page.waitForTimeout(1500);
  return { ok: !page.url().includes('login'), status: resp?.status(), url: page.url() };
}

(async () => {
const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });

// ═══════ SECTION A: LOGIN ═══════
step('──','SECTION A: LOGIN PAGE','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();

  // A1 - Load login page
  await pg.goto(BASE + '/pages/auth/login.html', { waitUntil:'domcontentloaded', timeout:10000 });
  await shot(pg, '01_login_page');
  
  const emailFld = await pg.$('#email, input[name=email], input[type=email]');
  const passFld  = await pg.$('#password, input[name=password], input[type=password]');
  const submitBtn= await pg.$('button[type=submit], #loginBtn');
  step(emailFld ? '✅':'❌', 'Login: email field present');
  step(passFld  ? '✅':'❌', 'Login: password field present');
  step(submitBtn? '✅':'❌', 'Login: submit button present');
  if (!passFld) bug('❌','Login: password field not found with common selectors');

  // A2 - Wrong credentials
  if (emailFld && passFld && submitBtn) {
    await emailFld.fill('wrong@x.com');
    await passFld.fill('badpass');
    await submitBtn.click();
    await pg.waitForTimeout(2000);
    const errEl = await pg.$('.alert-danger, .alert-error, [class*="error"], .invalid-feedback:visible');
    step(errEl ? '✅':'⚠️', 'Login: error shown for wrong creds', !!errEl);
    await shot(pg, '01b_login_wrong_creds');
    if (!errEl) bug('⚠️','Login: no visible error message for bad credentials');
  }

  // A3 - Correct admin login via UI
  if (emailFld && passFld && submitBtn) {
    await pg.goto(BASE + '/pages/auth/login.html', { waitUntil:'domcontentloaded', timeout:10000 });
    const ef2 = await pg.$('#email');
    const pf2 = await pg.$('#password');
    if (ef2 && pf2) {
      await ef2.fill('info@festlift.pt');
      await pf2.fill('Test1234!');
      await pg.click('button[type=submit], #loginBtn');
      await pg.waitForTimeout(3000);
      await shot(pg, '01c_after_login');
      const loggedIn = !pg.url().includes('login');
      step(loggedIn ? '✅':'❌', 'Login via UI redirects away from login page', pg.url());
      if (!loggedIn) bug('❌','Login: UI login does not redirect after correct credentials');
    }
  }
  await ctx.close();
}

// ═══════ GET TOKENS FOR ALL ROLES ═══════
step('──','GETTING AUTH TOKENS','');
const ctx0 = await browser.newContext({ viewport:{width:1366,height:768} });
const pg0 = await ctx0.newPage();
await pg0.goto(BASE + '/pages/auth/login.html', { waitUntil:'domcontentloaded', timeout:10000 });

const adminR = await apiLogin(pg0, 'info@festlift.pt', 'Test1234!');
step(adminR.token ? '✅':'❌', 'Admin token', `role=${adminR.role}, name=${adminR.name}`);

const dispR = await apiLogin(pg0, 'dispatcher@festlift.pt', 'Test1234!');
step(dispR.token ? '✅':'❌', 'Dispatcher token', `role=${dispR.role}`);

const techR = await apiLogin(pg0, 'ctaruj78@gmail.com', 'Test1234!');
step(techR.token ? '✅':'❌', 'Technician token', `role=${techR.role}`);

const clientR = await apiLogin(pg0, 'client@festlift.pt', 'Test1234!');
step(clientR.token ? '✅':'❌', 'Client token', `role=${clientR.role}`);
await ctx0.close();

const ADMIN = adminR.token;
const DISP  = dispR.token;
const TECH  = techR.token;
const CLI   = clientR.token;

if (!ADMIN) { bug('❌','Cannot get admin token — all admin tests will fail'); }

// ═══════ SECTION B: ADMIN PAGES ═══════
step('──','SECTION B: ADMIN PAGES','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if(m.type()==='error' && !m.text().includes('favicon') && !m.text().includes('MIME')) errs.push(m.text()); });

  // B1 Dashboard
  errs.length=0;
  const dash = await nav(pg, '/pages/admin/dashboard.html', ADMIN);
  await shot(pg, '02_admin_dashboard');
  step(dash.ok ? '✅':'❌', 'Admin: Dashboard accessible', dash.url.split('/').pop());
  if (!dash.ok) bug('❌','Admin dashboard not accessible (redirects to login)');
  else {
    const statBoxes = await pg.$$('.info-box, .small-box, .stat-card, .card.h-100');
    step('📊', 'Dashboard: stat boxes', statBoxes.length);
    if (errs.length) bug('⚠️','Dashboard JS: '+errs.slice(0,2).join(' | '));
  }

  // B2 Lifts page — detailed test
  errs.length=0;
  const lifts = await nav(pg, '/pages/admin/lifts.html', ADMIN);
  await pg.waitForTimeout(2500);
  await shot(pg, '03_admin_lifts');
  step(lifts.ok ? '✅':'❌', 'Admin: Lifts page', lifts.url.split('/').pop());
  
  if (lifts.ok) {
    const rows = await pg.$$('table tbody tr:not(.d-none)');
    step(rows.length>0 ? '✅':'❌', 'Lifts: table has rows', rows.length);
    if (rows.length===0) bug('❌','Lifts table shows 0 rows — data not loading');

    // Search
    const srch = await pg.$('#searchInput, input[placeholder*="Pesq"]');
    if (srch) {
      await srch.fill('sintra');
      await pg.waitForTimeout(1200);
      const after = await pg.$$('table tbody tr:not([style*="none"])');
      step('✅', 'Lifts: search filter', `"sintra" → ${after.length} rows`);
      await srch.fill('');
      await pg.waitForTimeout(800);
    } else bug('⚠️','Lifts: search box not found');

    // Status filter dropdown
    const statusFilter = await pg.$('#statusFilter, select[name="status"], select[id*="status"]');
    step(statusFilter ? '✅':'⚠️', 'Lifts: status filter dropdown', !!statusFilter);

    // B2a. Info button → Details modal
    errs.length=0;
    const iBtns = await pg.$$('td .btn-info, .btn-group .btn-info');
    step(iBtns.length>0 ? '✅':'❌', 'Lifts: info buttons found', iBtns.length);
    
    if (iBtns.length > 0) {
      await iBtns[0].click();
      await pg.waitForTimeout(2500);
      await shot(pg, '04_details_modal');
      
      const detModal = await pg.$('#liftDetailsModal');
      const detVis   = detModal ? await detModal.evaluate(el => el.classList.contains('show')) : false;
      step(detVis ? '✅':'❌', 'Details modal: opens on info click', detVis);
      
      if (detVis) {
        // Check all expected elements
        const checks = [
          ['#detail-municipal-number', 'municipal number'],
          ['#detail-license-date',     'cert date display'],
          ['#detail-license-expiry',   'cert expiry display'],
          ['#inspection-reports-list', 'inspection reports list'],
          ['#detailsPdfParserBtn',     'PDF parser button (NEW)'],
          ['[onclick*="showAddReportModal"]', 'Add report button'],
          ['#maintenance-contract-section', 'contract section'],
          ['#edit-lift-from-details, .btn-primary[onclick*="editLift"]', 'Edit from details btn'],
        ];
        for (const [sel, label] of checks) {
          const el = await pg.$(sel);
          const txt = el ? (await el.textContent()).trim().substring(0,30) : '';
          step(el ? '✅':'❌', `Details: ${label}`, el ? txt||'found' : 'MISSING');
          if (!el) bug('❌', `Details modal missing: ${label} (${sel})`);
        }

        // Check reports list content
        const repList = await pg.$('#inspection-reports-list');
        if (repList) {
          const repHTML = await repList.innerHTML();
          const hasAlert = repHTML.includes('alert-warning') || repHTML.includes('Nenhum');
          const hasCards = repHTML.includes('card') || repHTML.includes('badge');
          step(hasAlert||hasCards ? '✅':'⚠️', 'Reports list: has content', 
            hasAlert ? 'shows "no reports" warning' : hasCards ? 'shows reports' : 'empty/loading');
        }

        // JS errors
        if (errs.filter(e=>e.length>10).length) bug('⚠️','Details modal JS: '+errs.slice(0,2).join(' | '));

        // Click PDF button
        const pdfBtn = await pg.$('#detailsPdfParserBtn');
        if (pdfBtn) {
          await pdfBtn.click();
          await pg.waitForTimeout(1500);
          const pdfModal = await pg.$('#pdfParserModal');
          const pdfVis = pdfModal ? await pdfModal.evaluate(el => el.classList.contains('show')) : false;
          step(pdfVis ? '✅':'❌', 'Details → PDF parser modal opens', pdfVis);
          await shot(pg, '04b_pdf_modal_from_details');
          
          // Check lift pre-selected
          const liftSel = await pg.$('#pdfParserLiftSelect');
          const autoFound = await pg.$('#pdfAutoLiftFound');
          const autoVis = autoFound ? await autoFound.evaluate(el => el.style.display!=='none' && !el.classList.contains('d-none')) : false;
          step(autoVis ? '✅':'⚠️', 'PDF: lift auto-pre-selected from details', autoVis);
          if (!autoVis && liftSel) {
            const opts = await liftSel.evaluate(el => el.options.length);
            step('📊', 'PDF: lift select options', opts);
          }
          if (!pdfVis) bug('❌','PDF parser modal does not open from Details button');
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(500);
        }

        // Click Adicionar button
        const addBtn = await pg.$('[onclick*="showAddReportModal"]');
        if (addBtn) {
          await addBtn.click();
          await pg.waitForTimeout(1500);
          const addModal = await pg.$('#addReportModal');
          const addVis = addModal ? await addModal.evaluate(el => el.classList.contains('show')) : false;
          step(addVis ? '✅':'❌', 'Details → Add Report modal opens', addVis);
          await shot(pg, '04c_add_report_modal');
          if (!addVis) bug('❌','Add Report modal does not open from Details "Adicionar" button');
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(500);
        }

        // Close details
        await pg.keyboard.press('Escape');
        await pg.waitForTimeout(700);
      } else {
        bug('❌','Details modal did NOT open on info button click');
      }
    }

    // B2b. Edit button → Edit modal
    errs.length=0;
    const editBtns = await pg.$$('[onclick*="editLift"]');
    step(editBtns.length>0 ? '✅':'⚠️', 'Lifts: edit buttons', editBtns.length);
    if (editBtns.length > 0) {
      await editBtns[0].click();
      await pg.waitForTimeout(3000);
      await shot(pg, '05_edit_modal');
      
      const eModal = await pg.$('#enhancedLiftModal');
      const eVis   = eModal ? await eModal.evaluate(el => el.classList.contains('show')) : false;
      step(eVis ? '✅':'❌', 'Edit modal: opens on edit click', eVis);
      
      if (eVis) {
        const tabs = await pg.$$('#eLiftTabs .nav-link');
        step('📊', 'Edit modal: tabs count', tabs.length);
        
        // Test tab navigation
        for (let i=0; i<Math.min(tabs.length, 4); i++) {
          await tabs[i].click();
          await pg.waitForTimeout(600);
          const tabLabel = await tabs[i].textContent();
          step('✅', `Edit: tab ${i+1} clickable`, tabLabel.trim().substring(0,20));
        }

        // Go to Serviço tab specifically
        const svcTab = await pg.$('#eLiftTab-svc');
        if (svcTab) {
          await svcTab.click();
          await pg.waitForTimeout(1000);
          await shot(pg, '05b_edit_servico');
          
          // Test auto-calc
          const ld = await pg.$('[name="licenseDate"]');
          const le = await pg.$('[name="licenseExpiry"]');
          if (ld && le) {
            await le.fill(''); // ensure empty
            await ld.fill('2025-06-15');
            await ld.dispatchEvent('change');
            await pg.waitForTimeout(400);
            const expiryVal = await le.evaluate(el => el.value);
            const autoOK = expiryVal === '2027-06-15';
            step(autoOK ? '✅':'❌', 'Serviço: licenseExpiry auto-calc', `set 2025-06-15 → got ${expiryVal}`);
            if (!autoOK) bug('❌', `licenseExpiry auto-calc broken: expected 2027-06-15, got "${expiryVal}"`);
          }

          // Check inspection section
          const inspSec = await pg.$('#adminStep4InspectionInfo, #inspection-reports-list, #adminAddInspectionReportBtn');
          step(inspSec ? '✅':'⚠️', 'Serviço: inspection section present', !!inspSec);
        }

        // Test Guardar button visible on last tab
        const saveBtn = await pg.$('#eLiftBtnSave:not(.d-none)');
        step(saveBtn ? '✅':'⚠️', 'Serviço: Guardar button visible on last tab', !!saveBtn);

        // Close
        const cancel = await pg.$('.btn-secondary[data-dismiss="modal"]');
        if (cancel) await cancel.click(); else await pg.keyboard.press('Escape');
        await pg.waitForTimeout(700);
      } else bug('❌','Edit modal did NOT open');
    }

    // B2c. Add lift button
    errs.length=0;
    const addLift = await pg.$('#add-lift-button, [onclick="openEnhancedModal()"]');
    if (addLift) {
      await addLift.click();
      await pg.waitForTimeout(2000);
      await shot(pg, '06_add_lift');
      const newModal = await pg.$('#enhancedLiftModal');
      const newVis   = newModal ? await newModal.evaluate(el => el.classList.contains('show')) : false;
      step(newVis ? '✅':'❌', '"Adicionar elevador" modal opens', newVis);
      if (newVis) {
        const titleEl = await pg.$('#enhancedModalTitle');
        const title   = titleEl ? await titleEl.textContent() : '';
        step('📋', 'Add modal title', title.trim());
        const cancel = await pg.$('.btn-secondary[data-dismiss="modal"]');
        if (cancel) await cancel.click(); else await pg.keyboard.press('Escape');
        await pg.waitForTimeout(500);
      } else bug('❌','Add lift modal did not open');
    } else bug('⚠️','"Adicionar elevador" button not found');
  }

  // B3 - Other admin pages
  const pages = [
    ['/pages/admin/inspections.html', '07_inspections', 'Inspections'],
    ['/pages/admin/users.html',       '08_users',       'Users'],
    ['/pages/admin/map.html',         '09_map',         'Map'],
    ['/pages/admin/analysis.html',    '10_analysis',    'Analysis'],
    ['/pages/admin/documents.html',   '11_documents',   'Documents'],
  ];
  for (const [path, ss, label] of pages) {
    errs.length=0;
    const r = await nav(pg, path, ADMIN);
    await pg.waitForTimeout(1500);
    await shot(pg, ss);
    step(r.ok ? '✅':'❌', `Admin: ${label}`, r.ok ? 'accessible' : 'REDIRECT→LOGIN');
    if (!r.ok) bug('❌', `Admin ${label}: redirects to login`);
    
    // Specific checks per page
    if (r.ok && label==='Map') {
      const mapEl = await pg.$('.leaflet-container, #map');
      step(mapEl ? '✅':'⚠️', 'Map: leaflet container', !!mapEl);
      const resp500s = errs.filter(e => e.includes('500'));
      if (resp500s.length) bug('⚠️', `Map: 500 errors: ${resp500s.slice(0,2).join(' | ')}`);
    }
    if (r.ok && label==='Users') {
      const table = await pg.$('table, .users-list, #usersTable');
      step(table ? '✅':'⚠️', 'Users: table present', !!table);
      const rows = await pg.$$('table tbody tr');
      step('📊', 'Users: row count', rows.length);
      if (rows.length===0) bug('⚠️','Users page: table has 0 rows');
    }
    if (errs.filter(e=>!e.includes('favicon')&&!e.includes('MIME')).length)
      bug('⚠️', `${label} JS: ${errs.filter(e=>!e.includes('favicon')&&!e.includes('MIME')).slice(0,2).join(' | ')}`);
  }

  // B4 - QR code button
  await nav(pg, '/pages/admin/lifts.html', ADMIN);
  await pg.waitForTimeout(2000);
  const qrBtns = await pg.$$('[onclick*="QR"], [onclick*="qr"], [title*="QR"], [title*="código QR"]');
  step(qrBtns.length>0 ? '✅':'⚠️', 'Lifts: QR buttons present', qrBtns.length);
  if (qrBtns.length > 0) {
    await qrBtns[0].click();
    await pg.waitForTimeout(1500);
    await shot(pg, '12_qr_modal');
    const qrM = await pg.$('[id*="qr"],[id*="QR"],[id*="modal"]');
    const hasQR = qrM ? await qrM.evaluate(el => el.classList.contains('show')) : false;
    step(hasQR ? '✅':'⚠️', 'QR: modal opens', hasQR);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
  }

  await ctx.close();
}

// ═══════ SECTION C: DISPATCHER ═══════
step('──','SECTION C: DISPATCHER ROLE','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if(m.type()==='error'&&!m.text().includes('favicon')&&!m.text().includes('MIME')) errs.push(m.text()); });

  const dispPages = [
    ['/pages/dispatcher/lifts.html',       '13_disp_lifts',  'Dispatcher Lifts'],
    ['/pages/dispatcher/inspections.html', '14_disp_insp',   'Dispatcher Inspections'],
    ['/pages/dispatcher/dashboard.html',   '15_disp_dash',   'Dispatcher Dashboard'],
  ];
  for (const [path, ss, label] of dispPages) {
    errs.length=0;
    const r = await nav(pg, path, DISP);
    await pg.waitForTimeout(1500);
    await shot(pg, ss);
    step(r.ok ? '✅':'❌', `Dispatcher: ${label}`, r.ok ? 'OK' : 'REDIRECT→LOGIN');
    if (!r.ok) bug('❌', `Dispatcher: ${label} not accessible`);
    if (errs.filter(e=>!e.includes('favicon')&&!e.includes('MIME')).length)
      bug('⚠️', `Disp ${label} JS: ${errs.filter(e=>!e.includes('favicon')&&!e.includes('MIME')).slice(0,2).join(' | ')}`);
  }

  // Security: dispatcher should NOT access admin
  const adminAccess = await nav(pg, '/pages/admin/users.html', DISP);
  step(!adminAccess.ok ? '✅':'❌', 'Security: dispatcher blocked from admin/users', !adminAccess.ok ? 'BLOCKED✓' : '⚠️ACCESS');
  if (adminAccess.ok) bug('❌','SECURITY: Dispatcher can access admin pages!');

  await ctx.close();
}

// ═══════ SECTION D: TECHNICIAN ═══════
step('──','SECTION D: TECHNICIAN ROLE','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();
  
  const techPages = [
    ['/pages/tech/inspections.html', '16_tech_insp',  'Tech Inspections'],
    ['/pages/tech/dashboard.html',   '17_tech_dash',  'Tech Dashboard'],
  ];
  for (const [path, ss, label] of techPages) {
    const r = await nav(pg, path, TECH);
    await pg.waitForTimeout(1500);
    await shot(pg, ss);
    step(r.ok ? '✅':'⚠️', `Tech: ${label}`, r.ok ? 'OK' : 'redirect/404');
  }
  await ctx.close();
}

// ═══════ SECTION E: CLIENT ═══════
step('──','SECTION E: CLIENT ROLE','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();

  const clientPages = [
    ['/pages/client/my-lifts.html',  '18_client_lifts', 'Client My Lifts'],
    ['/pages/client/dashboard.html', '19_client_dash',  'Client Dashboard'],
  ];
  for (const [path, ss, label] of clientPages) {
    const r = await nav(pg, path, CLI);
    await pg.waitForTimeout(1500);
    await shot(pg, ss);
    step(r.ok ? '✅':'⚠️', `Client: ${label}`, r.ok ? 'OK' : 'redirect/404');
  }

  // Security: client cannot access admin
  const clientAdmin = await nav(pg, '/pages/admin/lifts.html', CLI);
  step(!clientAdmin.ok ? '✅':'❌', 'Security: client blocked from admin', !clientAdmin.ok ? 'BLOCKED✓':'⚠️ACCESS');
  if (clientAdmin.ok) bug('❌','SECURITY: Client can access admin pages!');

  await ctx.close();
}

// ═══════ SECTION F: API ENDPOINTS ═══════
step('──','SECTION F: API ENDPOINTS','');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil:'domcontentloaded', timeout:10000 });
  if (ADMIN) await pg.evaluate(t => localStorage.setItem('liftmanager_jwt', t), ADMIN);

  const apis = [
    ['GET', '/api/health',                ''],
    ['GET', '/api/lifts?limit=3',         ''],
    ['GET', '/api/lifts/stats',           ''],
    ['GET', '/api/users?limit=3',         ''],
    ['GET', '/api/inspections?limit=3',   ''],
    ['GET', '/api/orcamentos?limit=3',    ''],
    ['GET', '/api/maintenance?limit=3',   ''],
    ['GET', '/api/lifts/BADID/documents', ''],
  ];

  for (const [m, path] of apis) {
    const r = await pg.evaluate(async ([method, p]) => {
      const tok = localStorage.getItem('liftmanager_jwt');
      const resp = await fetch(p, {
        method, headers: { 'Authorization': 'Bearer '+tok, 'Content-Type':'application/json' }
      }).catch(e => null);
      if (!resp) return { status:0, ok:false, body:'network error' };
      const text = await resp.text().catch(() => '');
      return { status: resp.status, ok: resp.ok, body: text.substring(0,80) };
    }, [m, path]);
    const icon = r.ok ? '✅' : (r.status===404 ? '⚠️' : '❌');
    step(icon, `API ${m} ${path}`, `${r.status}`);
    if (!r.ok && r.status!==404 && r.status!==400) bug('❌', `API ${path}: ${r.status} - ${r.body.substring(0,50)}`);
  }
  await ctx.close();
}

// ═══════ FINAL REPORT ═══════
const report = { steps, findings };
fs.writeFileSync('/tmp/qa_report2.json', JSON.stringify(report, null, 2));

console.log('\n' + '═'.repeat(60));
console.log('QA FINDINGS (' + findings.length + ' issues)');
console.log('═'.repeat(60));
findings.forEach(f => console.log(f));
console.log('═'.repeat(60));
console.log(`Steps: ${steps.length} | Findings: ${findings.length}`);
console.log('Screenshots: /tmp/qa_ss/');

await browser.close();
})();
