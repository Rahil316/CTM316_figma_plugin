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

  // Give the page a little time in case of setTimeout in init
  await new Promise(resolve => setTimeout(resolve, 1000));

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

    // HELPER: Wait for DOM updates
    async function waitFor(fn, timeout = 1000) {
      const start = Date.now();
      while(Date.now() - start < timeout) {
        if(fn()) return true;
        await sleep(50);
      }
      return false;
    }

    try {
      // SETUP
      let setupFail = false;
      if (window.appState === undefined) {
        logTest('SETUP', 'WARN', 'window.appState is undefined');
      }

      // TEST 1 — Initial render
      let t1_fail = [];
      const tabs = document.querySelectorAll('.sidebar-tab-btn');
      if (tabs.length !== 4) t1_fail.push(`Found ${tabs.length} sidebar-tab-btn, expected 4`);
      
      const paletteTab = document.querySelector('.sidebar-tab-btn[data-tab="color-groups"]');
      if (paletteTab) paletteTab.click();
      await sleep(100);
      let colorCards = document.querySelectorAll('#sidebar-content-container .color-card-wrapper, #sidebar-content-container .color-card, #sidebar-content-container [data-color-id]');
      if (!colorCards || colorCards.length === 0) {
        colorCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback guess
      }
      if (colorCards.length !== 3) t1_fail.push(`Found ${colorCards.length} color cards, expected 3`);
      if (document.getElementById('sidebar-content-container').children.length === 0) t1_fail.push('sidebar-content-container empty after Palette click');
      
      const rolesTab = document.querySelector('.sidebar-tab-btn[data-tab="roles-config"]');
      if (rolesTab) rolesTab.click();
      await sleep(100);
      let roleCards = document.querySelectorAll('#sidebar-content-container .role-card-wrapper, #sidebar-content-container .role-item, #sidebar-content-container [data-role-id]');
      if (!roleCards || roleCards.length === 0) {
         roleCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback guess
      }
      if (roleCards.length !== 4) t1_fail.push(`Found ${roleCards.length} role cards, expected 4`);
      if (document.getElementById('sidebar-content-container').children.length === 0) t1_fail.push('sidebar-content-container empty after Roles click');

      if (t1_fail.length > 0) logTest('TEST 1', 'FAIL', t1_fail.join('; '));
      else logTest('TEST 1', 'PASS');


      // TEST 2 — Project tab
      let t2_fail = [];
      const projectTab = document.querySelector('.sidebar-tab-btn[data-tab="project"]');
      if (projectTab) projectTab.click();
      await sleep(100);
      const container = document.getElementById('sidebar-content-container');
      if (container.children.length === 0) t2_fail.push('sidebar-content-container empty');
      else {
        const wrapper = container.firstElementChild;
        const cardCount = wrapper ? wrapper.children.length : 0;
        if (cardCount !== 3) t2_fail.push(`Expected 1 wrapper with 3 cards, found wrapper with ${cardCount} cards`);
        if (wrapper && !wrapper.className.includes('gap-3')) t2_fail.push('Wrapper does not contain gap-3 class');
      }
      const pName = document.getElementById('sidebar-project-name');
      if (!pName) t2_fail.push('#sidebar-project-name missing');
      const themesList = document.getElementById('settings-themes-list');
      if (!themesList) t2_fail.push('#settings-themes-list missing inside container');
      
      if (t2_fail.length > 0) logTest('TEST 2', 'FAIL', t2_fail.join('; '));
      else logTest('TEST 2', 'PASS');


      // TEST 3 — Settings open
      let t3_fail = [];
      const settingsBtn = document.querySelector('button[onclick="openSettings()"], button .feather-settings')?.closest('button');
      if (settingsBtn) settingsBtn.click();
      else if (typeof openSettings === 'function') openSettings();
      else t3_fail.push('Settings button not found');
      
      await sleep(100);
      const settingsScreen = document.getElementById('settings-screen');
      if (!settingsScreen || settingsScreen.classList.contains('hidden')) t3_fail.push('#settings-screen is hidden or missing');
      
      const settingsTabs = Array.from(document.querySelectorAll('.settings-tab, .settings-tab-btn'));
      const hasTokenSettings = settingsTabs.some(t => t.textContent.includes('Token Settings'));
      const hasPluginSettings = settingsTabs.some(t => t.textContent.includes('Plugin'));
      if (!hasTokenSettings || !hasPluginSettings) t3_fail.push('Settings tabs missing text');
      
      const tokenTab = settingsTabs.find(t => t.textContent.includes('Token Settings'));
      if (tokenTab) tokenTab.click();
      await sleep(50);
      const tokenPanel = document.querySelector('[data-panel="tokens"], #settings-panel-tokens, .settings-panel[data-target="tokens"]');
      if (!tokenPanel || tokenPanel.classList.contains('hidden') || tokenPanel.style.display === 'none') t3_fail.push('Token Settings panel not visible');
      
      if (t3_fail.length > 0) logTest('TEST 3', 'FAIL', t3_fail.join('; '));
      else logTest('TEST 3', 'PASS');


      // TEST 4 — Mode switching in settings
      let t4_fail = [];
      if (window.appState && window.appState.pluginMode !== 'tonalScalesBased') t4_fail.push(`Initial pluginMode is ${window.appState?.pluginMode}, expected tonalScalesBased`);
      
      const rampSection = document.getElementById('settings-ramp-section');
      if (rampSection && rampSection.classList.contains('hidden')) t4_fail.push('#settings-ramp-section is hidden');
      
      const globalAlgoTitle = document.getElementById('setting-global-algo-title');
      if (!globalAlgoTitle || globalAlgoTitle.textContent !== 'Global Algorithm') t4_fail.push(`#setting-global-algo-title text is "${globalAlgoTitle?.textContent}", expected "Global Algorithm"`);
      
      const modeBtnDirect = document.getElementById('mode-btn-direct');
      if (modeBtnDirect) modeBtnDirect.click();
      else t4_fail.push('#mode-btn-direct not found');
      await sleep(100);
      
      if (window.appState && window.appState.pluginMode !== 'adaptiveEngine') t4_fail.push(`pluginMode is ${window.appState?.pluginMode}, expected adaptiveEngine`);
      if (rampSection && !rampSection.classList.contains('hidden')) t4_fail.push('#settings-ramp-section NOT hidden after mode switch');
      if (globalAlgoTitle && globalAlgoTitle.textContent !== 'Global Solver') t4_fail.push(`#setting-global-algo-title text is "${globalAlgoTitle?.textContent}", expected "Global Solver"`);
      
      const toggleGlobalAlgo = document.getElementById('toggle-useGlobalAlgo');
      if (!toggleGlobalAlgo || !toggleGlobalAlgo.classList.contains('on')) t4_fail.push('#toggle-useGlobalAlgo does not have class "on"');
      
      const algoRow = document.getElementById('setting-global-algo-row');
      if (algoRow && algoRow.classList.contains('hidden')) t4_fail.push('#setting-global-algo-row is hidden');
      
      const scopeRow = document.getElementById('setting-algo-scope-row');
      if (scopeRow && !scopeRow.classList.contains('hidden')) t4_fail.push('#setting-algo-scope-row is NOT hidden');
      
      if (t4_fail.length > 0) logTest('TEST 4', 'FAIL', t4_fail.join('; '));
      else logTest('TEST 4', 'PASS');


      // TEST 5 — Global solver toggle
      let t5_fail = [];
      if (toggleGlobalAlgo) toggleGlobalAlgo.click();
      await sleep(50);
      
      if (window.appState && window.appState.useGlobalAlgo !== false) t5_fail.push(`useGlobalAlgo is ${window.appState?.useGlobalAlgo}, expected false`);
      if (algoRow && !algoRow.classList.contains('hidden')) t5_fail.push('#setting-global-algo-row NOT hidden');
      if (scopeRow && scopeRow.classList.contains('hidden')) t5_fail.push('#setting-algo-scope-row is hidden');
      
      const scopeColor = document.getElementById('algo-scope-btn-color');
      const scopeRole = document.getElementById('algo-scope-btn-role');
      if (!scopeColor || !scopeRole) t5_fail.push('Scope buttons missing');
      if (scopeColor && !scopeColor.classList.contains('active')) t5_fail.push('#algo-scope-btn-color not active');
      
      if (t5_fail.length > 0) logTest('TEST 5', 'FAIL', t5_fail.join('; '));
      else logTest('TEST 5', 'PASS');


      // TEST 6 — Algo scope toggle
      let t6_fail = [];
      if (scopeRole) scopeRole.click();
      await sleep(50);
      
      if (window.appState && window.appState.perColorAlgoScope !== 'role') t6_fail.push(`perColorAlgoScope is ${window.appState?.perColorAlgoScope}, expected "role"`);
      if (scopeRole && !scopeRole.classList.contains('active')) t6_fail.push('#algo-scope-btn-role not active');
      if (scopeColor && scopeColor.classList.contains('active')) t6_fail.push('#algo-scope-btn-color is active');
      
      const doneBtn = document.querySelector('#settings-screen button.btn-primary');
      if (doneBtn) doneBtn.click();
      else if (typeof closeSettings === 'function') closeSettings();
      await sleep(100);
      
      if (rolesTab) rolesTab.click();
      await sleep(100);
      let roleSelects = document.querySelectorAll('#sidebar-content-container select');
      if (roleSelects.length === 0) t6_fail.push('No select element found in role cards');
      
      if (paletteTab) paletteTab.click();
      await sleep(100);
      let colorSelects = document.querySelectorAll('#sidebar-content-container select');
      if (colorSelects.length > 0) t6_fail.push('Select element found in color cards (should be none)');
      
      if (t6_fail.length > 0) logTest('TEST 6', 'FAIL', t6_fail.join('; '));
      else logTest('TEST 6', 'PASS');


      // TEST 7 — Tonal mode per-color algo
      let t7_fail = [];
      if (settingsBtn) settingsBtn.click();
      await sleep(100);
      const modeBtnRamp = document.getElementById('mode-btn-ramp');
      if (modeBtnRamp) modeBtnRamp.click();
      await sleep(100);
      
      if (rampSection && rampSection.classList.contains('hidden')) t7_fail.push('#settings-ramp-section is hidden');
      if (globalAlgoTitle && globalAlgoTitle.textContent !== 'Global Algorithm') t7_fail.push(`Title is "${globalAlgoTitle?.textContent}"`);
      
      if (toggleGlobalAlgo) toggleGlobalAlgo.click();
      await sleep(50);
      if (window.appState && window.appState.useGlobalAlgo !== false) t7_fail.push('useGlobalAlgo not false');
      if (scopeRow && !scopeRow.classList.contains('hidden')) t7_fail.push('#setting-algo-scope-row NOT hidden (should be adaptive-only)');
      
      if (doneBtn) doneBtn.click();
      await sleep(100);
      
      if (paletteTab) paletteTab.click();
      await sleep(100);
      colorSelects = document.querySelectorAll('#sidebar-content-container select');
      if (colorSelects.length === 0) t7_fail.push('No select element found in color cards for per-color algorithm');
      
      if (t7_fail.length > 0) logTest('TEST 7', 'FAIL', t7_fail.join('; '));
      else logTest('TEST 7', 'PASS');


      // TEST 8 — Settings cancel / restore
      let t8_fail = [];
      if (settingsBtn) settingsBtn.click();
      await sleep(100);
      if (modeBtnDirect) modeBtnDirect.click();
      await sleep(50);
      if (toggleGlobalAlgo && toggleGlobalAlgo.classList.contains('on')) toggleGlobalAlgo.click();
      await sleep(50);
      if (scopeRole) scopeRole.click();
      await sleep(50);
      
      const cancelBtn = document.querySelector('#settings-screen button.btn-secondary');
      if (cancelBtn) cancelBtn.click();
      await sleep(100);
      
      if (window.appState) {
        if (window.appState.pluginMode !== 'tonalScalesBased') t8_fail.push('pluginMode not restored to tonalScalesBased');
        if (window.appState.useGlobalAlgo !== true) t8_fail.push('useGlobalAlgo not restored to true');
        if (window.appState.perColorAlgoScope !== 'color') t8_fail.push('perColorAlgoScope not restored to "color"');
      }
      
      if (t8_fail.length > 0) logTest('TEST 8', 'FAIL', t8_fail.join('; '));
      else logTest('TEST 8', 'PASS');


      // TEST 9 — Preview tabs
      let t9_fail = [];
      const previewTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="preview"]');
      if (previewTabBtn) previewTabBtn.click();
      await sleep(100);
      
      const previewScreen = document.getElementById('preview-screen');
      if (!previewScreen || previewScreen.classList.contains('hidden')) t9_fail.push('#preview-screen is hidden');
      
      const previewTabsVisible = document.querySelectorAll('.preview-tab-btn:not(.hidden)');
      if (previewTabsVisible.length === 0) t9_fail.push('No visible preview tabs');
      
      const palettePreviewTab = document.querySelector('[data-target="preview-colors"]');
      if (palettePreviewTab && palettePreviewTab.classList.contains('hidden')) t9_fail.push('[data-target="preview-colors"] is hidden in Tonal mode');
      
      // Go back
      if (projectTab) projectTab.click();
      await sleep(100);
      
      // Switch to Adaptive
      if (settingsBtn) settingsBtn.click();
      await sleep(100);
      if (modeBtnDirect) modeBtnDirect.click();
      await sleep(50);
      if (doneBtn) doneBtn.click();
      await sleep(100);
      
      if (previewTabBtn) previewTabBtn.click();
      await sleep(100);
      if (palettePreviewTab && !palettePreviewTab.classList.contains('hidden')) t9_fail.push('[data-target="preview-colors"] is NOT hidden in Adaptive mode');
      
      const firstVisibleTab = document.querySelector('.preview-tab-btn:not(.hidden)');
      if (!firstVisibleTab || firstVisibleTab.dataset.target === 'preview-colors') t9_fail.push('First visible tab is palette or none');
      else if (!firstVisibleTab.classList.contains('active')) t9_fail.push('First visible theme tab does not have class active');
      
      if (t9_fail.length > 0) logTest('TEST 9', 'FAIL', t9_fail.join('; '));
      else logTest('TEST 9', 'PASS');


      // TEST 10 — Token order pills
      let t10_fail = [];
      if (projectTab) projectTab.click(); // Close preview
      await sleep(100);
      if (settingsBtn) settingsBtn.click();
      await sleep(100);
      if (tokenTab) tokenTab.click();
      await sleep(100);
      
      const tokenOrderPills = document.getElementById('token-order-pills');
      if (!tokenOrderPills) t10_fail.push('#token-order-pills not found');
      else {
        const pills = tokenOrderPills.children;
        if (pills.length !== 3) t10_fail.push(`Expected 3 pills, found ${pills.length}`);
        
        let contents = Array.from(pills).map(p => p.textContent.trim());
        if (!contents.includes('Color') || !contents.includes('Role') || !contents.includes('Variation')) {
          t10_fail.push(`Pill contents wrong: ${contents.join(',')}`);
        }
        
        for (let p of pills) {
          if (p.getAttribute('draggable') !== 'true') t10_fail.push(`Pill ${p.textContent} not draggable`);
          if (!p.style.backgroundColor && !p.style.background) t10_fail.push(`Pill ${p.textContent} missing background inline style`);
        }
      }
      
      if (window.appState && (!Array.isArray(window.appState.tokenNameOrder) || window.appState.tokenNameOrder.length !== 3)) {
        t10_fail.push('appState.tokenNameOrder is not array of length 3');
      }
      
      if (t10_fail.length > 0) logTest('TEST 10', 'FAIL', t10_fail.join('; '));
      else logTest('TEST 10', 'PASS');


      // TEST 11 — Add and remove a color
      let t11_fail = [];
      if (doneBtn) doneBtn.click();
      await sleep(100);
      if (paletteTab) paletteTab.click();
      await sleep(100);
      
      const addColorBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Color'));
      if (addColorBtn) addColorBtn.click();
      else t11_fail.push('+ Add Color button not found');
      await sleep(100);
      
      colorCards = document.querySelectorAll('#sidebar-content-container .color-card-wrapper, #sidebar-content-container [data-color-id]');
      if (!colorCards || colorCards.length === 0) colorCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback
      if (colorCards.length !== 4) t11_fail.push(`Count after add: ${colorCards.length}, expected 4`);
      
      if (colorCards.length > 0) {
        const lastCard = colorCards[colorCards.length - 1];
        const delBtn = lastCard.querySelector('button[title="Delete"], .feather-trash-2')?.closest('button');
        if (delBtn) delBtn.click();
        else t11_fail.push('Delete button not found on last color card');
        await sleep(100);
        
        colorCards = document.querySelectorAll('#sidebar-content-container .color-card-wrapper, #sidebar-content-container [data-color-id]');
        if (!colorCards || colorCards.length === 0) colorCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback
        if (colorCards.length !== 3) t11_fail.push(`Count after delete: ${colorCards.length}, expected 3`);
      }
      
      if (t11_fail.length > 0) logTest('TEST 11', 'FAIL', t11_fail.join('; '));
      else logTest('TEST 11', 'PASS');


      // TEST 12 — Add and remove a role
      let t12_fail = [];
      if (rolesTab) rolesTab.click();
      await sleep(100);
      
      const addRoleBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Role'));
      if (addRoleBtn) addRoleBtn.click();
      else t12_fail.push('+ Add Role button not found');
      await sleep(100);
      
      roleCards = document.querySelectorAll('#sidebar-content-container .role-card-wrapper, #sidebar-content-container [data-role-id]');
      if (!roleCards || roleCards.length === 0) roleCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback
      if (roleCards.length !== 5) t12_fail.push(`Count after add: ${roleCards.length}, expected 5`);
      
      if (roleCards.length > 0) {
        const lastRole = roleCards[roleCards.length - 1];
        const delBtn = lastRole.querySelector('button[title="Delete"], .feather-trash-2')?.closest('button');
        if (delBtn) delBtn.click();
        else t12_fail.push('Delete button not found on last role card');
        await sleep(100);
        
        roleCards = document.querySelectorAll('#sidebar-content-container .role-card-wrapper, #sidebar-content-container [data-role-id]');
        if (!roleCards || roleCards.length === 0) roleCards = document.querySelectorAll('#sidebar-content-container > div > div'); // fallback
        if (roleCards.length !== 4) t12_fail.push(`Count after delete: ${roleCards.length}, expected 4`);
      }
      
      if (t12_fail.length > 0) logTest('TEST 12', 'FAIL', t12_fail.join('; '));
      else logTest('TEST 12', 'PASS');


      // TEST 13 — Keyboard shortcuts
      let t13_fail = [];
      document.activeElement.blur(); // ensure no input focused
      const dispatchAltNum = (num) => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: num, code: 'Digit' + num, altKey: true, bubbles: true }));
      };
      
      dispatchAltNum('0');
      await sleep(50);
      const activeTab0 = document.querySelector('.sidebar-tab-btn.active');
      if (!activeTab0 || activeTab0.dataset.tab !== 'project') t13_fail.push('Alt+0 did not activate project tab');
      
      dispatchAltNum('1');
      await sleep(50);
      const activeTab1 = document.querySelector('.sidebar-tab-btn.active');
      if (!activeTab1 || activeTab1.dataset.tab !== 'color-groups') t13_fail.push('Alt+1 did not activate color-groups tab');
      
      dispatchAltNum('2');
      await sleep(50);
      const activeTab2 = document.querySelector('.sidebar-tab-btn.active');
      if (!activeTab2 || activeTab2.dataset.tab !== 'roles-config') t13_fail.push('Alt+2 did not activate roles-config tab');
      
      dispatchAltNum('3');
      await sleep(50);
      const ps = document.getElementById('preview-screen');
      if (!ps || ps.classList.contains('hidden')) t13_fail.push('Alt+3 did not show preview screen');
      
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(50);
      if (ps && !ps.classList.contains('hidden')) t13_fail.push('Escape did not hide preview screen');
      
      if (t13_fail.length > 0) logTest('TEST 13', 'FAIL', t13_fail.join('; '));
      else logTest('TEST 13', 'PASS');


      // TEST 14 — Variations in settings
      let t14_fail = [];
      if (settingsBtn) settingsBtn.click();
      await sleep(100);
      if (tokenTab) tokenTab.click();
      await sleep(100);
      
      let varRows = document.querySelectorAll('#global-variations-list > div, .variation-row');
      const startVarCount = varRows.length;
      
      const addVarBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add') && b.closest('.settings-section')?.textContent.includes('Variations'));
      if (addVarBtn) addVarBtn.click();
      else t14_fail.push('+ Add button for Variations not found');
      await sleep(100);
      
      varRows = document.querySelectorAll('#global-variations-list > div, .variation-row');
      if (varRows.length !== startVarCount + 1) t14_fail.push(`Count is ${varRows.length}, expected ${startVarCount + 1}`);
      
      if (varRows.length > 0) {
        const lastRow = varRows[varRows.length - 1];
        if (!lastRow.querySelector('.drag-handle, [draggable="true"]')) t14_fail.push('Drag handle missing on last variation row');
        const inputs = lastRow.querySelectorAll('input');
        if (inputs.length < 2) t14_fail.push('Shorthand or Name input missing on last row');
      }
      
      if (t14_fail.length > 0) logTest('TEST 14', 'FAIL', t14_fail.join('; '));
      else logTest('TEST 14', 'PASS');


      return { output, fails };
    } catch (e) {
      return { output: [`FATAL ERROR in evaluate: ${e.message}`], fails: [`FATAL ERROR: ${e.message}`] };
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
