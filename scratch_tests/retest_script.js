const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  const filePath = `file://${path.resolve(__dirname, '../dist/ui.html')}`;
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  // Give the page a little time
  await new Promise(resolve => setTimeout(resolve, 500));

  const results = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const output = [];
    const fails = [];
    
    function logTest(testName, result, details = '') {
      const line = `${testName} — ${result}${details ? ': ' + details : ''}`;
      output.push(line);
      if (result === 'FAIL') {
        fails.push(line);
      }
    }

    try {
      if (window.appState === undefined) {
        // Mock appState tracking if the variable is not global
        // We will do DOM checks mostly, but we'll try to find it
      }

      // ── REGRESSION CHECKS ──
      
      // TEST 1
      document.querySelector('.sidebar-tab-btn[data-tab="color-groups"]')?.click();
      await sleep(50);
      let t1_cc = document.querySelectorAll('#sidebar-content-container .card-drag-handle, #sidebar-content-container [data-color-id]').length;
      if (t1_cc === 0) t1_cc = document.getElementById('sidebar-content-container').children.length - 1; // Subtract Add button
      logTest('TEST 1 (Palette render)', t1_cc === 3 ? 'PASS' : 'FAIL', `count = ${t1_cc}`);

      // TEST 2
      document.querySelector('.sidebar-tab-btn[data-tab="project"]')?.click();
      await sleep(50);
      let t2_ok = !!document.getElementById('sidebar-project-name');
      logTest('TEST 2 (Project tab)', t2_ok ? 'PASS' : 'FAIL', t2_ok ? '' : '#sidebar-project-name missing');

      // TEST 3
      document.getElementById('btn-settings')?.click();
      await sleep(50);
      let t3_ok = !document.getElementById('settings-screen').classList.contains('hidden');
      logTest('TEST 3 (Settings open)', t3_ok ? 'PASS' : 'FAIL', t3_ok ? '' : 'Settings screen hidden');

      // TEST 4 & 5 & 6
      document.getElementById('mode-btn-direct')?.click();
      await sleep(50);
      let t4_ok = document.getElementById('setting-global-algo-title')?.textContent.includes('Solver');
      logTest('TEST 4 (Adaptive Mode)', t4_ok ? 'PASS' : 'FAIL');

      document.getElementById('toggle-useGlobalAlgo')?.click();
      await sleep(50);
      let t5_ok = !document.getElementById('setting-algo-scope-row').classList.contains('hidden');
      logTest('TEST 5 (Global Solver off)', t5_ok ? 'PASS' : 'FAIL');

      document.getElementById('algo-scope-btn-role')?.click();
      await sleep(50);
      let t6_ok = document.getElementById('algo-scope-btn-role')?.classList.contains('active');
      logTest('TEST 6 (Scope toggle)', t6_ok ? 'PASS' : 'FAIL');

      // TEST 8
      document.getElementById('settings-cancel')?.click();
      await sleep(50);
      let t8_ok = document.getElementById('settings-screen').classList.contains('hidden');
      logTest('TEST 8 (Settings cancel)', t8_ok ? 'PASS' : 'FAIL');

      // ── DETAILED TESTS ──

      // TEST 7
      let t7_fail = [];
      document.getElementById('btn-settings')?.click();
      await sleep(50);
      document.getElementById('mode-btn-ramp')?.click();
      await sleep(50);
      
      const glAlgo = document.getElementById('toggle-useGlobalAlgo');
      if (glAlgo && glAlgo.classList.contains('on')) glAlgo.click();
      await sleep(50);
      
      document.getElementById('settings-done')?.click();
      await sleep(50);
      
      document.querySelector('.sidebar-tab-btn[data-tab="color-groups"]')?.click();
      await sleep(50);
      
      const algoSelects = document.querySelectorAll('[data-testid="color-algo-select"]');
      if (algoSelects.length === 3) {
        logTest('TEST 7', 'PASS');
      } else {
        logTest('TEST 7', 'FAIL', `Expected 3 algo selects, found ${algoSelects.length}`);
      }

      // TEST 9
      let t9_fail = [];
      // we are in tonal mode from test 7.
      document.querySelector('.sidebar-tab-btn[data-tab="preview"]')?.click();
      await sleep(50);
      
      const pColorTab = document.querySelector("[data-target='preview-colors']");
      if (pColorTab && pColorTab.classList.contains('hidden')) {
        t9_fail.push('[data-target="preview-colors"] is hidden');
      }
      const activePre = document.querySelector("#preview-screen .preview-tab-btn:not(.hidden).active");
      if (!activePre) {
        t9_fail.push('No visible active preview tab');
      }
      
      if (t9_fail.length > 0) logTest('TEST 9', 'FAIL', t9_fail.join('; '));
      else logTest('TEST 9', 'PASS');

      // TEST 10
      let t10_fail = [];
      document.querySelector('.sidebar-tab-btn[data-tab="project"]')?.click(); // go back to main
      await sleep(50);
      document.getElementById('btn-settings')?.click();
      await sleep(50);
      document.querySelector('.settings-tab[data-tab="tokens"]')?.click();
      await sleep(50);
      
      const pills = document.querySelectorAll('#token-order-pills [draggable="true"]');
      const seps = document.querySelectorAll('#token-order-pills .pill-sep');
      
      if (pills.length !== 3) t10_fail.push(`Expected 3 draggable pills, found ${pills.length}`);
      if (seps.length !== 2) t10_fail.push(`Expected 2 separators, found ${seps.length}`);
      
      for (let p of pills) {
        if (!p.style.background && !p.style.backgroundColor) {
          t10_fail.push(`Pill missing background inline style`);
        }
      }
      
      if (t10_fail.length > 0) logTest('TEST 10', 'FAIL', t10_fail.join('; '));
      else logTest('TEST 10', 'PASS');

      // TEST 11
      let t11_fail = [];
      document.getElementById('settings-done')?.click();
      await sleep(50);
      document.querySelector('.sidebar-tab-btn[data-tab="color-groups"]')?.click();
      await sleep(50);
      
      let cCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (cCards.length === 0) cCards = document.querySelectorAll('.color-group-card-plugin');
      const startCCount = cCards.length;
      
      const addColorBtn = document.querySelector('[data-action="add-color"]');
      if (!addColorBtn) t11_fail.push('[data-action="add-color"] not found');
      else {
        addColorBtn.click();
        await sleep(50);
      }
      
      cCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (cCards.length === 0) cCards = document.querySelectorAll('.color-group-card-plugin');
      
      if (cCards.length !== startCCount + 1) {
        t11_fail.push(`Count after add: ${cCards.length}, expected ${startCCount + 1}`);
      }
      
      const delBtns = document.querySelectorAll('[aria-label="Delete color"]');
      if (delBtns.length === 0) {
        t11_fail.push('[aria-label="Delete color"] not found');
      } else {
        delBtns[delBtns.length - 1].click();
        await sleep(50);
      }
      
      cCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (cCards.length === 0) cCards = document.querySelectorAll('.color-group-card-plugin');
      
      if (cCards.length !== startCCount) {
        t11_fail.push(`Count after delete: ${cCards.length}, expected ${startCCount}`);
      }
      
      if (t11_fail.length > 0) logTest('TEST 11', 'FAIL', t11_fail.join('; '));
      else logTest('TEST 11', 'PASS', `Counts: ${startCCount} -> ${startCCount+1} -> ${startCCount}`);

      // TEST 12
      let t12_fail = [];
      document.querySelector('.sidebar-tab-btn[data-tab="roles-config"]')?.click();
      await sleep(50);
      
      let rCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (rCards.length === 0) rCards = document.querySelectorAll('.role-card-plugin');
      const startRCount = rCards.length;
      
      const addRoleBtn = document.querySelector('[data-action="add-role"]');
      if (!addRoleBtn) t12_fail.push('[data-action="add-role"] not found');
      else {
        addRoleBtn.click();
        await sleep(50);
      }
      
      rCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (rCards.length === 0) rCards = document.querySelectorAll('.role-card-plugin');
      if (rCards.length !== startRCount + 1) {
        t12_fail.push(`Count after add: ${rCards.length}, expected ${startRCount + 1}`);
      }
      
      const delRoleBtns = document.querySelectorAll('[aria-label="Delete role"]');
      if (delRoleBtns.length === 0) {
        t12_fail.push('[aria-label="Delete role"] not found');
      } else {
        delRoleBtns[0].click(); // clicks first found
        await sleep(50);
      }
      
      rCards = document.querySelectorAll('#sidebar-content-container .card-drag-handle');
      if (rCards.length === 0) rCards = document.querySelectorAll('.role-card-plugin');
      
      if (rCards.length !== startRCount) {
        t12_fail.push(`Count after delete: ${rCards.length}, expected ${startRCount}`);
      }
      
      if (t12_fail.length > 0) logTest('TEST 12', 'FAIL', t12_fail.join('; '));
      else logTest('TEST 12', 'PASS', `Counts: ${startRCount} -> ${startRCount+1} -> ${startRCount}`);

      // TEST 13
      let t13_fail = [];
      document.activeElement.blur();
      const dispatchCode = (code, keyStr) => {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: keyStr || 'Alt', altKey: true, bubbles: true }));
      };
      
      dispatchCode('Digit0');
      await sleep(50);
      let aT = document.querySelector('.sidebar-tab-btn.active')?.dataset.tab;
      if (aT !== 'project') t13_fail.push(`Alt+Digit0 activated ${aT}`);
      
      dispatchCode('Digit1');
      await sleep(50);
      aT = document.querySelector('.sidebar-tab-btn.active')?.dataset.tab;
      if (aT !== 'color-groups') t13_fail.push(`Alt+Digit1 activated ${aT}`);
      
      dispatchCode('Digit2');
      await sleep(50);
      aT = document.querySelector('.sidebar-tab-btn.active')?.dataset.tab;
      if (aT !== 'roles-config') t13_fail.push(`Alt+Digit2 activated ${aT}`);
      
      dispatchCode('Digit3');
      await sleep(50);
      const ps = document.getElementById("preview-screen");
      if (ps.classList.contains("hidden")) t13_fail.push('Alt+Digit3 preview hidden');
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      await sleep(50);
      if (!ps.classList.contains("hidden")) t13_fail.push('Escape preview not hidden');
      
      if (t13_fail.length > 0) logTest('TEST 13', 'FAIL', t13_fail.join('; '));
      else logTest('TEST 13', 'PASS');

      // TEST 14
      let t14_fail = [];
      document.getElementById('btn-settings')?.click();
      await sleep(50);
      document.querySelector('.settings-tab[data-tab="tokens"]')?.click();
      await sleep(50);
      
      const vList = document.querySelector('#settings-variations-list');
      let startVCount = 0;
      if (vList) {
        startVCount = vList.children.length;
      }
      
      const addVarBtn = document.querySelector('[data-action="add-variation"]');
      if (!addVarBtn) t14_fail.push('[data-action="add-variation"] not found');
      else {
        addVarBtn.click();
        await sleep(50);
      }
      
      let endVCount = vList ? vList.children.length : 0;
      if (endVCount !== startVCount + 1) t14_fail.push(`Count is ${endVCount}, expected ${startVCount + 1}`);
      
      if (endVCount > 0 && vList) {
        const lastRow = vList.children[endVCount - 1];
        const hasName = Array.from(lastRow.querySelectorAll('input')).some(i => i.placeholder.includes('Name') || i.placeholder === '1');
        if (!hasName) t14_fail.push('Last row does not contain input with placeholder Name');
      }
      
      if (t14_fail.length > 0) logTest('TEST 14', 'FAIL', t14_fail.join('; '));
      else logTest('TEST 14', 'PASS');

      return { output, fails };
    } catch (e) {
      return { output: [`FATAL ERROR: ${e.message}`], fails: [`FATAL ERROR: ${e.message}`] };
    }
  });

  console.log("=== RESULTS ===");
  results.output.forEach(l => console.log(l));
  
  console.log("\n=== CONSOLE LOGS ===");
  if (consoleMessages.length === 0) console.log("No console errors/warnings.");
  else consoleMessages.forEach(m => console.log(m));
  
  if (errors.length > 0) {
    console.log("\n=== PAGE ERRORS ===");
    errors.forEach(e => console.log(e));
  }

  await browser.close();
})();
