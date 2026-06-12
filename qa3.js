const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://localhost:5000';
const SS = '/tmp/qa_ss3';
fs.mkdirSync(SS, { recursive: true });

const bugs = [];
function bug(sev, msg) { bugs.push(sev + ' ' + msg); console.error('  BUG: ' + msg); }
function step(ok, label, detail) {
  const icon = ok === true ? '✅' : ok === false ? '❌' : ok;
  console.log(`${icon} ${label}${detail !== undefined ? ' → ' + String(detail).substring(0,120) : ''}`);
}
async function shot(pg, name) { try { await pg.screenshot({ path: `${SS}/${name}.png` }); } catch(_){} }

// ─── API helpers ───────────────────────────────────────────
async function apiReq(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const resp = await fetch(BASE + path, opts);
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch(_) {}
    return { ok: resp.ok, status: resp.status, json, text };
  } catch(e) {
    return { ok: false, status: 0, json: null, text: e.message };
  }
}

async function login(email, pass) {
  const r = await apiReq('POST', '/api/auth/login', { email, password: pass });
  return {
    ok: r.ok,
    token: r.json?.data?.token || r.json?.token,
    role:  r.json?.data?.user?.role || r.json?.user?.role,
    name:  r.json?.data?.user?.firstName || r.json?.user?.firstName || '',
  };
}

// ─── Browser nav helper ─────────────────────────────────────
async function nav(pg, path, token) {
  if (token) {
    await pg.context().addInitScript(t => {
      localStorage.setItem('liftmanager_jwt', t);
      localStorage.setItem('authToken', t);
    }, token);
  }
  const resp = await pg.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
  await pg.waitForTimeout(2000);
  const url = pg.url();
  const ok = !url.includes('/auth/login') && !url.includes('/login.html');
  return { ok, url, status: resp?.status() };
}

async function setToken(pg, token) {
  await pg.evaluate(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
    sessionStorage.setItem('liftmanager_jwt', t);
  }, token);
}

(async () => {
// ─── SETUP: get tokens ──────────────────────────────────────
console.log('\n══ GETTING TOKENS ══');

const adminR  = await login('info@festlift.pt',       'Test1234!');
const dispR   = await login('dispatcher@festlift.pt', 'Test1234!');
const techR   = await login('ctaruj78@gmail.com',     'Test1234!');
const clientR = await login('client@festlift.pt',     'Test1234!');

step(!!adminR.token,  'admin token',      `role=${adminR.role}`);
step(!!dispR.token,   'dispatcher token', `role=${dispR.role}`);
step(!!techR.token,   'technician token', `role=${techR.role}`);
step(!!clientR.token, 'client token',     `role=${clientR.role}`);

if (!adminR.token) { bug('❌','No admin token'); }
const ADMIN=adminR.token, DISP=dispR.token, TECH=techR.token, CLI=clientR.token;

// ─── API TESTS (independent of browser) ────────────────────
console.log('\n══ SECTION F: API TESTS ══');
const apis = [
  ['GET', '/api/health',                null, null,  200, 'health (no auth)'],
  ['GET', '/api/lifts?limit=3',         null, ADMIN, 200, 'GET lifts (admin)'],
  ['GET', '/api/lifts/stats',           null, ADMIN, 200, 'GET lifts/stats'],
  ['GET', '/api/users?limit=3',         null, ADMIN, 200, 'GET users (admin)'],
  ['GET', '/api/inspections?limit=3',   null, ADMIN, 200, 'GET inspections'],
  ['GET', '/api/lifts?limit=3',         null, null,  401, 'GET lifts (no token) → 401'],
  ['GET', '/api/lifts?limit=3',         null, DISP,  200, 'GET lifts (dispatcher)'],
  ['GET', '/api/users?limit=3',         null, DISP, 403, 'GET users (dispatcher) → 403'],
  ['GET', '/api/lifts/badid/documents', null, ADMIN, 400, 'GET lift/badid/docs → 400'],
];
for (const [m,p,body,tok,expect,label] of apis) {
  const r = await apiReq(m, p, body, tok);
  const ok = r.status === expect || (expect===200 && r.ok) || (expect===400 && r.status===400) || (expect===401 && (r.status===401||r.status===403));
  step(ok, `API: ${label}`, `${r.status}`);
  if (!ok) bug(r.status>=500 ? '❌':'⚠️', `API ${p}: expected ${expect}, got ${r.status}`);
  if (r.status>=500) bug('❌', `API ${p}: server error! body=${r.text.substring(0,100)}`);
}


// ─── BROWSER SECTION ────────────────────────────────────────
const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });

// ════ SECTION A: LOGIN ══════════════════════════════════════
console.log('\n══ SECTION A: LOGIN ══');
{
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  const pg  = await ctx.newPage();

  await pg.goto(BASE + '/pages/auth/login.html', { waitUntil:'domcontentloaded' });
  await shot(pg, '01_login');
  step(!!(await pg.$('#email')),                   'Login: email field');
  step(!!(await pg.$('#password')),                'Login: password field');
  step(!!(await pg.$('button[type=submit]')),      'Login: submit button');

  // Wrong creds
  await pg.fill('#email', 'bad@x.com');
  await pg.fill('#password', 'wrong');
  await pg.click('button[type=submit]');
  await pg.waitForTimeout(2000);
  const errEl = await pg.$('.alert-danger,.alert-error,.invalid-feedback,.swal2-popup');
  step(!!errEl || pg.url().includes('login'), 'Login: error / stays on page for wrong creds', !!errEl);
  if (!errEl && !pg.url().includes('login')) bug('⚠️','Login: no error for wrong creds');

  // Correct creds UI
  await pg.goto(BASE + '/pages/auth/login.html', { waitUntil:'domcontentloaded' });
  await pg.fill('#email', 'info@festlift.pt');
  await pg.fill('#password', 'Test1234!');
  await pg.click('button[type=submit]');
  await pg.waitForTimeout(3000);
  await shot(pg, '01b_after_login');
  const redirected = !pg.url().includes('/auth/login');
  step(redirected, 'Login: redirects after correct creds', pg.url().split('/').pop());
  if (!redirected) bug('❌','Login UI does not redirect after correct credentials');

  await ctx.close();
}

// ════ SECTION B: ADMIN ══════════════════════════════════════
console.log('\n══ SECTION B: ADMIN PAGES ══');
if (ADMIN) {
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  // Set token for ALL navigations in this context
  await ctx.addInitScript(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
  }, ADMIN);
  const pg = await ctx.newPage();
  const jsErrs = [];
  pg.on('pageerror', e => jsErrs.push(e.message));

  // B1 Dashboard
  jsErrs.length=0;
  await pg.goto(BASE + '/pages/admin/dashboard.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(2500);
  await shot(pg, '02_dashboard');
  const isDash = !pg.url().includes('login');
  step(isDash, 'Admin: Dashboard');
  if (isDash) {
    const boxes = await pg.$$('.info-box,.small-box,.stat-card,.card');
    step(boxes.length>0, `Dashboard: stat boxes`, boxes.length);
    if (jsErrs.length) bug('⚠️', `Dashboard JS err: ${jsErrs[0].substring(0,80)}`);
  } else bug('❌','Admin Dashboard not accessible');

  // B2 Lifts — comprehensive
  jsErrs.length=0;
  await pg.goto(BASE + '/pages/admin/lifts.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(3500);
  await shot(pg, '03_lifts');
  const isLifts = !pg.url().includes('login');
  step(isLifts, 'Admin: Lifts page');

  if (isLifts) {
    const rows = await pg.$$('table tbody tr');
    step(rows.length>0, `Lifts table has rows`, rows.length);
    if (rows.length===0) bug('❌','Lifts: 0 rows (data not loading)');

    // Search
    const srch = await pg.$('#searchInput,input[placeholder*="Pesq"],input[placeholder*="pesq"]');
    if (srch) {
      await srch.fill('a');
      await pg.waitForTimeout(1000);
      const after = await pg.$$('table tbody tr:not([style*="display: none"])');
      step(true, 'Lifts: search', `"a" → ${after.length} rows visible`);
      await srch.fill('');
      await pg.waitForTimeout(600);
    } else bug('⚠️','Lifts: search box not found');

    // Details modal (Info button)
    const infoBtns = await pg.$$('.btn-info');
    step(infoBtns.length>0, 'Lifts: info/details buttons', infoBtns.length);
    if (infoBtns.length > 0) {
      await infoBtns[0].click();
      await pg.waitForTimeout(3000);
      await shot(pg, '04_details_modal');
      const detMod = await pg.$('#liftDetailsModal.show');
      step(!!detMod, 'Details modal opens on info click', !!detMod);
      if (detMod) {
        // Fields
        for (const [sel,label] of [
          ['#detail-municipal-number','municipal number'],
          ['#inspection-reports-list','reports section'],
          ['#detailsPdfParserBtn','PDF button (new)'],
          ['[onclick*="showAddReportModal"]','Add Report button'],
        ]) {
          const el = await pg.$(sel);
          step(!!el, `Details: ${label}`, el ? 'present' : 'MISSING');
          if (!el) bug('❌', `Details modal missing: ${label}`);
        }

        // Inspection reports content
        const repEl = await pg.$('#inspection-reports-list');
        if (repEl) {
          const html = await repEl.innerHTML();
          const isEmpty = html.includes('Nenhum') || html.includes('alert-warning') || html.trim().length<20;
          const hasList = html.includes('card') || html.includes('badge') || html.includes('Relatório');
          step(true, 'Details: reports list content', isEmpty ? 'no reports' : hasList ? 'has reports' : 'unknown');
        }

        // PDF button
        const pdfBtn = await pg.$('#detailsPdfParserBtn');
        if (pdfBtn) {
          await pdfBtn.click();
          await pg.waitForTimeout(2000);
          await shot(pg, '04b_pdf_modal');
          const pdfMod = await pg.$('#pdfParserModal.show');
          step(!!pdfMod, 'Details → PDF modal opens', !!pdfMod);
          if (!pdfMod) bug('❌','PDF modal did not open from Details button');
          else {
            const autoFound = await pg.$('#pdfAutoLiftFound');
            const isVis = autoFound ? await autoFound.evaluate(e => e.style.display!=='none' && !e.hidden) : false;
            step(isVis, 'PDF modal: lift auto-selected', isVis ? 'yes' : 'no (must select manually)');
          }
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(800);
        }

        // Adicionar button  
        const addBtn = await pg.$('[onclick*="showAddReportModal"]');
        if (addBtn) {
          await addBtn.click();
          await pg.waitForTimeout(2000);
          await shot(pg, '04c_add_report');
          const addMod = await pg.$('#addReportModal.show');
          step(!!addMod, 'Details → Add Report modal opens', !!addMod);
          if (!addMod) bug('❌','Add Report modal did not open from Details');
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(800);
        }

        await pg.keyboard.press('Escape');
        await pg.waitForTimeout(800);
      } else {
        bug('❌','Details modal did not open');
      }
    }

    // Edit modal
    await pg.goto(BASE + '/pages/admin/lifts.html', { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(3000);
    const editBtns = await pg.$$('[onclick*="editLift"],[onclick*="openEnhancedModal"]');
    step(editBtns.length>0, 'Lifts: edit buttons', editBtns.length);
    if (editBtns.length>0) {
      await editBtns[0].click();
      await pg.waitForTimeout(3000);
      await shot(pg, '05_edit_modal');
      const editMod = await pg.$('#enhancedLiftModal.show');
      step(!!editMod, 'Edit modal opens', !!editMod);
      if (editMod) {
        const tabs = await pg.$$('#eLiftTabs .nav-link, .nav-tabs .nav-link');
        step(true, 'Edit modal: tabs', tabs.length);
        for (const tab of tabs) {
          await tab.click();
          await pg.waitForTimeout(500);
        }
        // Serviço tab
        const svcTab = await pg.$('#eLiftTab-svc,a[href="#eLiftPanel-svc"]');
        if (svcTab) {
          await svcTab.click();
          await pg.waitForTimeout(800);
          await shot(pg, '05b_tab_servico');
          // auto-calc test
          const ld = await pg.$('[name="licenseDate"]');
          const le = await pg.$('[name="licenseExpiry"]');
          if (ld && le) {
            await le.fill('');
            await ld.fill('2025-01-15');
            await ld.dispatchEvent('change');
            await pg.waitForTimeout(500);
            const val = await le.evaluate(e => e.value);
            const ok = val === '2027-01-15';
            step(ok, 'Serviço: expiry auto-calc (+2y)', `2025-01-15 → ${val}`);
            if (!ok) bug('❌',`licenseExpiry auto-calc: expected 2027-01-15, got "${val}"`);
          } else bug('⚠️','Serviço: licenseDate or licenseExpiry field not found');
        }
        const saveBtn = await pg.$('#eLiftBtnSave:not(.d-none):not([style*="none"]),button[onclick*="saveEnhancedLift"]:not(.d-none)');
        step(!!saveBtn, 'Edit modal: Guardar button visible on Serviço tab', !!saveBtn);
      } else bug('❌','Edit modal did not open');
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(800);
    }

    // Add lift button
    await pg.goto(BASE + '/pages/admin/lifts.html', { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(2500);
    const addLiftBtn = await pg.$('#add-lift-button,[onclick="openEnhancedModal()"]');
    step(!!addLiftBtn, 'Lifts: "Adicionar elevador" button', !!addLiftBtn);
    if (addLiftBtn) {
      await addLiftBtn.click();
      await pg.waitForTimeout(2000);
      const addMod = await pg.$('#enhancedLiftModal.show');
      step(!!addMod, 'Add lift modal opens', !!addMod);
      if (!addMod) bug('❌','"Adicionar elevador" button does not open modal');
      else {
        const title = await pg.$eval('#enhancedModalTitle', e=>e.textContent.trim()).catch(()=>'');
        step(true, 'Add modal title', title);
      }
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(500);
    }

    if (jsErrs.length) bug('⚠️',`Lifts page JS errors: ${jsErrs[0].substring(0,100)}`);
  } else bug('❌','Admin Lifts page not accessible');

  // B3 Other admin pages
  const adminPages = [
    ['/pages/admin/inspections.html', '06_inspections', 'Inspections'],
    ['/pages/admin/users.html',       '07_users',       'Users'],
    ['/pages/admin/map.html',         '08_map',         'Map'],
    ['/pages/admin/analysis.html',    '09_analysis',    'Analysis'],
    ['/pages/admin/documents.html',   '10_documents',   'Documents'],
  ];
  for (const [path, ss, label] of adminPages) {
    jsErrs.length=0;
    await pg.goto(BASE + path, { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(2500);
    await shot(pg, ss);
    const ok = !pg.url().includes('login');
    step(ok, `Admin: ${label}`, ok ? 'OK' : 'REDIRECT→LOGIN');
    if (!ok) bug('❌', `Admin ${label} redirects to login`);
    else {
      if (label === 'Map') {
        const mapEl = await pg.$('.leaflet-container,#map,[class*="leaflet"]');
        step(!!mapEl, 'Map: leaflet container', !!mapEl);
        if (!mapEl) bug('⚠️','Map: no leaflet container visible');
      }
      if (label === 'Users') {
        const rows = await pg.$$('table tbody tr, .user-card, .users-list li');
        step(rows.length>0, `Users: content rows`, rows.length);
        if (rows.length===0) bug('⚠️','Users: 0 rows shown');
      }
      if (label === 'Inspections') {
        const rows = await pg.$$('table tbody tr,.inspection-card');
        step(true, 'Inspections: content', rows.length + ' items');
      }
      if (jsErrs.length) bug('⚠️',`${label} JS: ${jsErrs[0].substring(0,80)}`);
    }
  }

  await ctx.close();
}

// ════ SECTION C: DISPATCHER ════════════════════════════════
console.log('\n══ SECTION C: DISPATCHER ══');
if (DISP) {
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  await ctx.addInitScript(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
  }, DISP);
  const pg = await ctx.newPage();

  const dispPages = [
    ['/pages/dispatcher/dashboard.html', '11_disp_dash',  'Dispatcher Dashboard'],
    ['/pages/dispatcher/lifts.html',     '12_disp_lifts', 'Dispatcher Lifts'],
    ['/pages/dispatcher/inspections.html','13_disp_insp', 'Dispatcher Inspections'],
  ];
  for (const [path, ss, label] of dispPages) {
    await pg.goto(BASE + path, { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(2500);
    await shot(pg, ss);
    const ok = !pg.url().includes('login');
    step(ok, label, ok ? 'OK' : 'REDIRECT→LOGIN');
    if (!ok) bug('❌', `${label} not accessible for dispatcher`);
  }

  // Security: admin pages should be blocked
  await pg.goto(BASE + '/pages/admin/users.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(2000);
  const blocked = pg.url().includes('login') || pg.url().includes('auth');
  step(blocked, 'Security: dispatcher blocked from admin/users', blocked ? 'BLOCKED✓':'⚠️ ACCESS ALLOWED');
  if (!blocked) bug('❌','SECURITY: Dispatcher can access admin/users.html');

  await ctx.close();
}

// ════ SECTION D: TECHNICIAN ═════════════════════════════════
console.log('\n══ SECTION D: TECHNICIAN ══');
if (TECH) {
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  await ctx.addInitScript(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
  }, TECH);
  const pg = await ctx.newPage();

  const techPages = [
    ['/pages/tech/dashboard.html',   '14_tech_dash', 'Tech Dashboard'],
    ['/pages/tech/inspections.html', '15_tech_insp', 'Tech Inspections'],
  ];
  for (const [path, ss, label] of techPages) {
    await pg.goto(BASE + path, { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(2500);
    await shot(pg, ss);
    const ok = !pg.url().includes('login');
    step(ok, label, ok ? 'OK' : 'REDIRECT→LOGIN (not found?)');
    if (!ok) bug('⚠️', `${label} not accessible (may not exist yet)`);
  }

  // Security
  await pg.goto(BASE + '/pages/admin/lifts.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(2000);
  const blocked = pg.url().includes('login') || pg.url().includes('auth');
  step(blocked, 'Security: tech blocked from admin', blocked ? 'BLOCKED✓':'⚠️ ACCESS');
  if (!blocked) bug('❌','SECURITY: Technician can access admin pages');

  await ctx.close();
}

// ════ SECTION E: CLIENT ══════════════════════════════════════
console.log('\n══ SECTION E: CLIENT ══');
if (CLI) {
  const ctx = await browser.newContext({ viewport:{width:1366,height:768} });
  await ctx.addInitScript(t => {
    localStorage.setItem('liftmanager_jwt', t);
    localStorage.setItem('authToken', t);
  }, CLI);
  const pg = await ctx.newPage();

  const clientPages = [
    ['/pages/client/dashboard.html', '16_cli_dash', 'Client Dashboard'],
    ['/pages/client/my-lifts.html',  '17_cli_lifts','Client My Lifts'],
  ];
  for (const [path, ss, label] of clientPages) {
    await pg.goto(BASE + path, { waitUntil:'domcontentloaded' });
    await pg.waitForTimeout(2500);
    await shot(pg, ss);
    const ok = !pg.url().includes('login');
    step(ok, label, ok ? 'OK' : 'REDIRECT→LOGIN');
    if (!ok) bug('⚠️', `${label} not accessible for client`);
  }

  // Security
  await pg.goto(BASE + '/pages/admin/lifts.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(2000);
  const blocked = pg.url().includes('login') || pg.url().includes('auth');
  step(blocked, 'Security: client blocked from admin', blocked ? 'BLOCKED✓':'⚠️ ACCESS');
  if (!blocked) bug('❌','SECURITY: Client can access admin pages');

  await ctx.close();
}

// ════ REPORT ════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log('QA REPORT — ' + bugs.length + ' FINDINGS');
console.log('═'.repeat(60));
bugs.forEach((b,i) => console.log(`${i+1}. ${b}`));
console.log('═'.repeat(60));
console.log('Screenshots: ' + SS + '/');
fs.writeFileSync('/tmp/qa_report3.json', JSON.stringify({ bugs, ss: SS }, null, 2));
await browser.close();
})();
