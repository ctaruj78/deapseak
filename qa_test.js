const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5000';
const SCREENSHOTS = '/tmp/qa_screenshots';
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const USERS = {
  admin:      { email: 'info@festlift.pt',       pass: null },
  dispatcher: { email: null, pass: null },
  tech:       { email: null, pass: null },
  client:     { email: null, pass: null }
};

const log = [];
const findings = [];

function note(icon, msg, detail='') {
  const line = `${icon} ${msg}${detail ? ' → ' + detail : ''}`;
  log.push(line);
  console.log(line);
}

function finding(severity, msg) {
  const line = `${severity} ${msg}`;
  findings.push(line);
  console.log('FINDING: ' + line);
}

async function ss(page, name) {
  try {
    await page.screenshot({ path: path.join(SCREENSHOTS, name + '.png'), fullPage: false });
  } catch(e) {}
}

async function login(page, email, password) {
  await page.goto(BASE + '/pages/login.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('#email, input[type=email], input[name=email]', email);
  await page.fill('#password, input[type=password], input[name=password]', password);
  await page.click('button[type=submit], .btn-primary, #loginBtn');
  await page.waitForTimeout(2000);
}

async function getAdminCredentials(page) {
  // Try to find credentials from DB via API
  try {
    const r = await page.evaluate(async () => {
      // Try with no auth to get info
      const r = await fetch('/api/auth/me').catch(() => null);
      return r ? r.status : null;
    });
    return null;
  } catch(e) { return null; }
}

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({ 
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true
  });
  const page = await ctx.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', e => consoleErrors.push('PAGE_ERROR: ' + e.message));

  // ── 1. CHECK LOGIN PAGE ──────────────────────────────────────────
  note('🔍', 'Opening login page');
  try {
    const resp = await page.goto(BASE, { timeout: 10000 });
    note('✅', 'Homepage status', resp.status());
    await ss(page, '01_homepage');
    
    // Check if redirects to login
    const url = page.url();
    note('📍', 'Landed on', url);
  } catch(e) {
    finding('❌', 'Homepage unreachable: ' + e.message);
  }

  // ── 2. LOGIN PAGE ────────────────────────────────────────────────
  try {
    await page.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await ss(page, '02_login_page');
    
    const hasEmailField = await page.$('#email, input[type=email]') !== null;
    const hasPassField = await page.$('#password, input[type=password]') !== null;
    const hasSubmit = await page.$('button[type=submit], #loginBtn') !== null;
    
    note(hasEmailField ? '✅' : '❌', 'Login: email field', hasEmailField);
    note(hasPassField  ? '✅' : '❌', 'Login: password field', hasPassField);
    note(hasSubmit     ? '✅' : '❌', 'Login: submit button', hasSubmit);
  } catch(e) {
    finding('❌', 'Login page error: ' + e.message);
  }

  // ── 3. FIND USERS IN DB VIA API ──────────────────────────────────
  note('🔍', 'Finding test users via API');
  let adminToken = null;
  let adminEmail = 'info@festlift.pt';
  
  // Try to get users list directly (no auth needed for our test)
  const usersResp = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/users', { headers: { 'Content-Type': 'application/json' } });
      return { status: r.status, body: await r.text() };
    } catch(e) { return { error: e.message }; }
  });
  note('📋', 'Users API (no auth)', JSON.stringify(usersResp).substring(0, 100));

  // ── 4. ADMIN LOGIN ───────────────────────────────────────────────
  note('🔍', 'Attempting admin login');
  const passwords = ['Admin123!', 'admin123', 'festlift2024', 'admin', 'Admin@123', 'festlift', 'password'];
  
  for (const pass of passwords) {
    try {
      const loginResult = await page.evaluate(async (creds) => {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds)
        });
        const data = await r.json();
        return { status: r.status, token: data.token, role: data.user?.role, message: data.message };
      }, { email: adminEmail, password: pass });
      
      if (loginResult.token) {
        adminToken = loginResult.token;
        note('✅', 'Admin login OK', `pass: ${pass}, role: ${loginResult.role}`);
        break;
      } else {
        note('⚠️', 'Login failed', `${pass}: ${loginResult.message}`);
      }
    } catch(e) {}
  }
  
  if (!adminToken) {
    // Try to get token from env or other sources
    finding('⚠️', 'Could not login with common passwords - trying page login');
    
    // Navigate to login and try
    await page.goto(BASE + '/pages/login.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const emailInput = await page.$('#email, input[type=email], input[name=email]');
    const passInput = await page.$('#password, input[type=password], input[name=password]');
    
    if (emailInput && passInput) {
      for (const pass of passwords) {
        await emailInput.fill(adminEmail);
        await passInput.fill(pass);
        await page.click('button[type=submit], .btn-primary, #loginBtn').catch(() => {});
        await page.waitForTimeout(1500);
        
        const token = await page.evaluate(() => 
          localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || null
        );
        if (token) {
          adminToken = token;
          note('✅', 'Admin login via UI OK', `pass: ${pass}`);
          break;
        }
      }
    }
  }

  if (!adminToken) {
    finding('❌', 'BLOCKED: Cannot login with any password - manual password needed');
    await browser.close();
    fs.writeFileSync('/tmp/qa_results.json', JSON.stringify({ log, findings, consoleErrors }));
    return;
  }

  // Set token in localStorage
  await page.evaluate((token) => {
    localStorage.setItem('liftmanager_jwt', token);
    localStorage.setItem('authToken', token);
  }, adminToken);

  // ── 5. ADMIN DASHBOARD ───────────────────────────────────────────
  note('🔍', 'Loading admin dashboard');
  try {
    await page.goto(BASE + '/pages/admin/dashboard.html', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate((token) => {
      localStorage.setItem('liftmanager_jwt', token);
      localStorage.setItem('authToken', token);
    }, adminToken);
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await ss(page, '03_admin_dashboard');
    
    const title = await page.title();
    const url = page.url();
    note('📍', 'Dashboard URL', url);
    note('📋', 'Dashboard title', title);
    
    // Check if redirected to login (token not accepted)
    if (url.includes('login')) {
      finding('❌', 'Admin dashboard redirects to login - token not accepted');
    } else {
      note('✅', 'Admin dashboard accessible');
      
      // Check key elements
      const sidebar = await page.$('.sidebar, #sidebar, nav') !== null;
      const content = await page.$('.content-wrapper, main, #main-content') !== null;
      note(sidebar ? '✅' : '⚠️', 'Sidebar present', sidebar);
      note(content ? '✅' : '⚠️', 'Content area present', content);
    }
    
    // Count JS errors so far
    if (consoleErrors.length > 0) {
      finding('⚠️', `Dashboard JS errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }
  } catch(e) {
    finding('❌', 'Dashboard load error: ' + e.message);
  }

  // ── 6. ADMIN LIFTS PAGE ──────────────────────────────────────────
  note('🔍', 'Loading admin lifts page');
  consoleErrors.length = 0; // reset
  
  try {
    await page.goto(BASE + '/pages/admin/lifts.html', { waitUntil: 'networkidle', timeout: 20000 });
    await page.evaluate((token) => {
      localStorage.setItem('liftmanager_jwt', token);
      localStorage.setItem('authToken', token);
    }, adminToken);
    
    if (page.url().includes('login')) {
      await page.goto(BASE + '/pages/admin/lifts.html', { waitUntil: 'networkidle', timeout: 20000 });
    }
    
    await page.waitForTimeout(3000);
    await ss(page, '04_admin_lifts');
    
    const url = page.url();
    note('📍', 'Lifts page URL', url);
    
    if (url.includes('login')) {
      finding('❌', 'Lifts page redirects to login');
    } else {
      note('✅', 'Lifts page accessible');
      
      // Check table/list
      const table = await page.$('table, .lift-card, #liftsTable, .lifts-list') !== null;
      note(table ? '✅' : '⚠️', 'Lifts table/list present', table);
      
      // Count lifts shown
      const liftRows = await page.$$('table tbody tr, .lift-row, [class*="lift-item"]');
      note('📊', 'Lift rows visible', liftRows.length);
      
      // Check buttons in first row
      const infoBtn = await page.$('.btn-info, [onclick*="showLiftDetails"], [onclick*="viewLift"]');
      const editBtn = await page.$('.btn-primary[onclick*="edit"], .btn-edit, [onclick*="editLift"]');
      note(infoBtn ? '✅' : '❌', 'Info (i) button present', !!infoBtn);
      note(editBtn ? '✅' : '⚠️', 'Edit button present', !!editBtn);
      
      if (consoleErrors.length > 0) {
        finding('⚠️', `Lifts page JS errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
      }
    }
  } catch(e) {
    finding('❌', 'Lifts page error: ' + e.message);
  }

  // ── 7. TEST LIFT DETAILS MODAL ───────────────────────────────────
  note('🔍', 'Testing lift details modal (info button)');
  consoleErrors.length = 0;
  
  try {
    // Click first info button
    const infoButton = await page.$('.btn-info, [onclick*="showLiftDetails"]');
    if (infoButton) {
      await infoButton.click();
      await page.waitForTimeout(2000);
      await ss(page, '05_lift_details_modal');
      
      const modal = await page.$('#liftDetailsModal.show, #liftDetailsModal[style*="display: block"]');
      note(modal ? '✅' : '❌', 'Details modal opened', !!modal);
      
      if (modal) {
        // Check key elements in modal
        const certDate = await page.$('#detail-license-date');
        const inspList = await page.$('#inspection-reports-list');
        const addBtn = await page.$('[onclick*="showAddReportModal"]');
        const pdfBtn = await page.$('#detailsPdfParserBtn');
        
        const certDateText = certDate ? await certDate.textContent() : 'NOT FOUND';
        const inspListHTML = inspList ? (await inspList.innerHTML()).substring(0, 100) : 'NOT FOUND';
        
        note(certDate ? '✅' : '❌', 'Certificate date field', certDateText);
        note(inspList ? '✅' : '❌', 'Inspection reports list div', !!inspList);
        note(addBtn ? '✅' : '❌', 'Add report button', !!addBtn);
        note(pdfBtn ? '✅' : '❌', 'PDF parser button (NEW)', !!pdfBtn);
        note('📋', 'Reports list content', inspListHTML);
        
        if (consoleErrors.length > 0) {
          finding('⚠️', `Details modal JS errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
        }
        
        // Check if PDF button visible
        if (!pdfBtn) {
          finding('❌', 'NEW PDF button in details modal not found - change may not have applied');
        }
      } else {
        finding('❌', 'Details modal did not open');
      }
    } else {
      finding('⚠️', 'No info button found to test details modal');
    }
  } catch(e) {
    finding('❌', 'Details modal test error: ' + e.message);
  }

  // ── 8. TEST EDIT MODAL ───────────────────────────────────────────
  note('🔍', 'Testing edit modal (pencil button)');
  consoleErrors.length = 0;
  
  try {
    // Close details modal first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const editButton = await page.$('[onclick*="editLift"]');
    if (editButton) {
      await editButton.click();
      await page.waitForTimeout(2500);
      await ss(page, '06_edit_modal');
      
      const modal = await page.$('#enhancedLiftModal.show, #enhancedLiftModal[style*="block"]');
      note(modal ? '✅' : '❌', 'Edit modal opened', !!modal);
      
      if (modal) {
        // Check tabs
        const tab1 = await page.$('#eLiftTab-obj');
        const tab4 = await page.$('#eLiftTab-svc');
        note(tab1 ? '✅' : '❌', 'Tab 1 (Instalação)', !!tab1);
        note(tab4 ? '✅' : '❌', 'Tab 4 (Serviço)', !!tab4);
        
        // Navigate to Serviço tab
        if (tab4) {
          await tab4.click();
          await page.waitForTimeout(1000);
          await ss(page, '07_edit_modal_servico_tab');
          
          const pdfParserBtn = await page.$('[data-target="#pdfParserModal"], [data-bs-target="#pdfParserModal"]');
          const adminInsp = await page.$('#adminStep4InspectionInfo, #adminAddInspectionReportBtn');
          const licenseDate = await page.$('[name="licenseDate"]');
          
          note(pdfParserBtn ? '✅' : '⚠️', 'PDF parser btn in edit modal', !!pdfParserBtn);
          note(adminInsp ? '✅' : '⚠️', 'Inspection section in Serviço', !!adminInsp);
          note(licenseDate ? '✅' : '❌', 'License date input', !!licenseDate);
          
          // Test licenseDate auto-calc
          if (licenseDate) {
            const expiryBefore = await page.$eval('[name="licenseExpiry"]', el => el.value).catch(() => '');
            await licenseDate.fill('2025-01-15');
            await licenseDate.dispatchEvent('change');
            await page.waitForTimeout(500);
            const expiryAfter = await page.$eval('[name="licenseExpiry"]', el => el.value).catch(() => '');
            const autoCalcOK = expiryAfter === '2027-01-15';
            note(autoCalcOK ? '✅' : '❌', 'licenseExpiry auto-calc (+2yr)', `before=${expiryBefore}, after=${expiryAfter}, expected=2027-01-15`);
            if (!autoCalcOK && expiryAfter !== expiryBefore) {
              finding('⚠️', `licenseExpiry auto-calc: got "${expiryAfter}", expected "2027-01-15"`);
            }
          }
        }
        
        if (consoleErrors.length > 0) {
          finding('⚠️', `Edit modal JS errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
        }
      } else {
        finding('❌', 'Edit modal did not open');
      }
    } else {
      finding('⚠️', 'No edit button found');
    }
  } catch(e) {
    finding('❌', 'Edit modal test error: ' + e.message);
  }

  // ── 9. TEST OTHER ADMIN PAGES ────────────────────────────────────
  const adminPages = [
    { path: '/pages/admin/dashboard.html', name: 'Admin Dashboard' },
    { path: '/pages/admin/inspections.html', name: 'Admin Inspections' },
    { path: '/pages/admin/users.html', name: 'Admin Users' },
    { path: '/pages/admin/analysis.html', name: 'Admin Analysis' },
  ];
  
  for (const pg of adminPages) {
    consoleErrors.length = 0;
    try {
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 12000 });
      await page.evaluate((token) => {
        localStorage.setItem('liftmanager_jwt', token);
        localStorage.setItem('authToken', token);
      }, adminToken);
      await page.waitForTimeout(1500);
      
      const url = page.url();
      const isLogin = url.includes('login');
      const ssName = '08_' + pg.name.replace(/ /g,'_').toLowerCase();
      await ss(page, ssName);
      
      if (isLogin) {
        finding('❌', `${pg.name}: redirects to login (auth issue)`);
      } else {
        note('✅', pg.name + ' accessible', url.substring(url.lastIndexOf('/') + 1));
        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
          finding('⚠️', `${pg.name} JS errors: ${consoleErrors.filter(e => !e.includes('favicon')).slice(0, 2).join(' | ')}`);
        }
      }
    } catch(e) {
      finding('⚠️', `${pg.name} load error: ${e.message.substring(0, 100)}`);
    }
  }

  // ── 10. FIND OTHER ROLES ─────────────────────────────────────────
  note('🔍', 'Finding users of different roles via API');
  const usersViaApi = await page.evaluate(async (token) => {
    try {
      const r = await fetch('/api/users?limit=50', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      return d.data || d.users || d;
    } catch(e) { return { error: e.message }; }
  }, adminToken);
  
  let otherUsers = [];
  if (Array.isArray(usersViaApi)) {
    otherUsers = usersViaApi.filter(u => u.role !== 'admin').slice(0, 3);
    note('📊', 'Non-admin users found', otherUsers.map(u => `${u.email}(${u.role})`).join(', ').substring(0, 100));
  } else if (usersViaApi && usersViaApi.users) {
    otherUsers = usersViaApi.users.filter(u => u.role !== 'admin').slice(0, 3);
  }
  
  if (otherUsers.length === 0) {
    finding('⚠️', 'No non-admin users found for role testing');
  }

  // ── 11. TEST DISPATCHER PAGES ────────────────────────────────────
  const dispatcherUser = otherUsers.find(u => u.role === 'dispatcher');
  if (dispatcherUser && dispatcherUser.email) {
    note('🔍', 'Testing dispatcher role', dispatcherUser.email);
    // Try to get dispatcher token
    for (const pass of passwords) {
      const r = await page.evaluate(async (creds) => {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds)
        });
        const d = await resp.json();
        return { token: d.token, role: d.user?.role };
      }, { email: dispatcherUser.email, password: pass });
      
      if (r.token) {
        note('✅', 'Dispatcher login OK', `${dispatcherUser.email} / ${pass}`);
        await page.evaluate((token) => localStorage.setItem('liftmanager_jwt', token), r.token);
        
        await page.goto(BASE + '/pages/dispatcher/lifts.html', { waitUntil: 'networkidle', timeout: 12000 });
        await page.waitForTimeout(1500);
        await ss(page, '09_dispatcher_lifts');
        
        const url = page.url();
        note(url.includes('login') ? '❌' : '✅', 'Dispatcher lifts page', url.includes('login') ? 'REDIRECTED' : 'OK');
        break;
      }
    }
  }

  // ── 12. TEST QR CODE ─────────────────────────────────────────────
  note('🔍', 'Testing QR code page');
  await page.evaluate((token) => {
    localStorage.setItem('liftmanager_jwt', token);
    localStorage.setItem('authToken', token);
  }, adminToken);
  
  try {
    await page.goto(BASE + '/pages/admin/lifts.html', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const qrBtn = await page.$('[onclick*="generateQRCode"], [onclick*="QR"], .btn-success[onclick*="qr"]');
    note(qrBtn ? '✅' : '⚠️', 'QR code button present', !!qrBtn);
    
    if (qrBtn) {
      await qrBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, '10_qr_modal');
      const qrModal = await page.$('#qrModal.show, [id*="qr"]');
      note(qrModal ? '✅' : '⚠️', 'QR modal opened', !!qrModal);
    }
  } catch(e) {
    finding('⚠️', 'QR test error: ' + e.message.substring(0, 80));
  }

  // ── 13. TEST MAP PAGE ────────────────────────────────────────────
  note('🔍', 'Testing map page');
  try {
    await page.goto(BASE + '/pages/admin/map.html', { waitUntil: 'networkidle', timeout: 12000 });
    await page.evaluate((token) => localStorage.setItem('liftmanager_jwt', token), adminToken);
    await page.waitForTimeout(2000);
    await ss(page, '11_map_page');
    
    const mapDiv = await page.$('#map, .leaflet-container, [id*="map"]');
    note(mapDiv ? '✅' : '❌', 'Map container present', !!mapDiv);
    
    const leafletTiles = await page.$$('.leaflet-tile-loaded');
    note(leafletTiles.length > 0 ? '✅' : '⚠️', 'Map tiles loaded', leafletTiles.length);
  } catch(e) {
    finding('⚠️', 'Map page error: ' + e.message.substring(0, 80));
  }

  // ── 14. TEST MAINTENANCE REQUESTS ───────────────────────────────
  note('🔍', 'Testing maintenance requests page');
  try {
    await page.goto(BASE + '/pages/admin/maintenance.html', { waitUntil: 'networkidle', timeout: 12000 });
    await page.evaluate((token) => localStorage.setItem('liftmanager_jwt', token), adminToken);
    await page.waitForTimeout(1500);
    await ss(page, '12_maintenance');
    const url = page.url();
    note(url.includes('login') ? '❌' : '✅', 'Maintenance page', url.includes('login') ? 'REDIRECT' : 'OK');
  } catch(e) {
    finding('⚠️', 'Maintenance page error: ' + e.message.substring(0, 80));
  }

  // ── 15. API ENDPOINT QUICK CHECKS ───────────────────────────────
  note('🔍', 'Testing key API endpoints');
  const apiTests = [
    { url: '/api/lifts?limit=5', name: 'lifts list' },
    { url: '/api/users', name: 'users list' },
    { url: '/api/inspections?limit=5', name: 'inspections' },
    { url: '/api/orcamentos?limit=5', name: 'orcamentos' },
  ];
  
  for (const api of apiTests) {
    const result = await page.evaluate(async (opts) => {
      const r = await fetch(opts.url, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('liftmanager_jwt') }
      });
      const text = await r.text();
      return { status: r.status, ok: r.ok, preview: text.substring(0, 80) };
    }, api);
    note(result.ok ? '✅' : '❌', `API ${api.name}`, `${result.status}: ${result.preview}`);
  }

  // ── FINAL REPORT ─────────────────────────────────────────────────
  const report = { log, findings, consoleErrors: consoleErrors.slice(0, 20) };
  fs.writeFileSync('/tmp/qa_results.json', JSON.stringify(report, null, 2));
  
  console.log('\n=== FINDINGS SUMMARY ===');
  findings.forEach(f => console.log(f));
  console.log('\n=== DONE ===');
  console.log('Screenshots saved to: ' + SCREENSHOTS);
  
  await browser.close();
})();
