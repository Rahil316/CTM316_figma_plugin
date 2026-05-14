/**
 * ============================================================================
 * UI SETTINGS MANAGEMENT
 * Logic for syncing settings between appState and the UI.
 * ============================================================================
 */

function toggleBoolSetting(key) {
  appState[key] = !appState[key];
  syncOutputToggles();
  if (key === "allowRoleVariations" || key === "includeDescriptions") {
    renderColorGroups();
    renderRoles();
  }
  schedulePreview();
}

function setTokenGrouping(idx) {
  appState.variableStructure = UI_MODES.grouping[idx] || "color";
  syncOutputToggles();
  schedulePreview();
}

function setPluginMode(idx) {
  const mode = UI_MODES.plugin[idx];
  if (!mode) return;
  appState.pluginMode = mode;
  syncOutputToggles();
  renderColorGroups();
  renderRoles();
  schedulePreview();
}

function setSpreadUnit(idx) {
  appState.spreadUnit = UI_MODES.spread[idx] || "steps";
  syncOutputToggles();
  renderRoles();
  schedulePreview();
}

function setBaseSelection(idx) {
  appState.baseSelection = UI_MODES.selection[idx] || "By Contrast";
  syncUiSettingsInputs();
  renderRoles();
  syncOutputToggles();
  schedulePreview();
}

// --- syncOutputToggles broken into focused helpers ---

function _syncTogglePills() {
  ["embedDirectly", "useShorthandColors", "useShorthandRoles", "useShorthandVariations",
   "includeGlobalColors", "includeAlphaTints", "allowRoleVariations", "includeDescriptions"]
    .forEach((key) => {
      ["toggle-" + key, "rd-toggle-" + key].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle("on", !!appState[key]);
      });
    });
  const constOpts = document.getElementById("constants-options");
  if (constOpts) constOpts.classList.toggle("hidden", !appState.includeGlobalColors);
  const opacRow = document.getElementById("opacity-values-row");
  if (opacRow) opacRow.classList.toggle("hidden", !appState.includeAlphaTints);
}

function _syncGroupingButtons() {
  const tg = appState.variableStructure || "color";
  [["seg-group-color", "rd-seg-group-color"], ["seg-group-role", "rd-seg-group-role"]]
    .forEach(([settingsId, rdId]) => {
      const isActive = settingsId.includes("color") ? tg === "color" : tg === "role";
      const s = document.getElementById(settingsId);
      const r = document.getElementById(rdId);
      if (s) s.classList.toggle("active", isActive);
      if (r) r.classList.toggle("active", isActive);
    });
}

function _syncModeControls() {
  const isDirect = appState.pluginMode === "direct";

  const mbRamp = document.getElementById("mode-btn-ramp");
  const mbDirect = document.getElementById("mode-btn-direct");
  if (mbRamp) mbRamp.classList.toggle("active", !isDirect);
  if (mbDirect) mbDirect.classList.toggle("active", isDirect);

  const rampSection = document.getElementById("settings-ramp-section");
  if (rampSection) rampSection.classList.toggle("hidden", isDirect);
  const tonalCollRow = document.getElementById("settings-tonal-collection-row");
  if (tonalCollRow) tonalCollRow.classList.toggle("hidden", isDirect);
  const embedDirectlyRow = document.getElementById("settings-embed-directly-row");
  if (embedDirectlyRow) embedDirectlyRow.classList.toggle("hidden", isDirect);

  // Direct mode can't use "By Index" — force to "By Contrast"
  if (isDirect && appState.baseSelection === "By Index") {
    appState.baseSelection = "By Contrast";
    const bsEl = document.getElementById("setting-baseSelection");
    if (bsEl) bsEl.value = "By Contrast";
  }
  const byIndexOpt = document.getElementById("base-selection-opt-byindex");
  if (byIndexOpt) byIndexOpt.hidden = isDirect;

  const previewTabColors = document.getElementById("preview-tab-colors");
  if (previewTabColors) previewTabColors.textContent = isDirect ? "Solved Colors" : "Tonal Scale";
}

function _syncSpreadUnit() {
  const isDirect = appState.pluginMode === "direct";
  const spreadUnitRow = document.getElementById("settings-spread-unit-row");
  if (spreadUnitRow) spreadUnitRow.classList.toggle("hidden", isDirect || appState.baseSelection === "Manual");

  const suSteps = document.getElementById("su-btn-steps");
  const suContrast = document.getElementById("su-btn-contrast");
  if (suSteps) suSteps.classList.toggle("active", (appState.spreadUnit || "steps") === "steps");
  if (suContrast) suContrast.classList.toggle("active", appState.spreadUnit === "contrast");
}

function _syncNameFormatPreview() {
  const tg = appState.variableStructure || "color";
  const sampleColor = appState.colors && appState.colors[0];
  const sampleRole = appState.roles && appState.roles[0];
  if (!sampleColor || !sampleRole) return;
  const cLabel = appState.useShorthandColors ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = appState.useShorthandRoles ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const v3 = appState.variations && appState.variations[2];
  const stepLabel = v3 ? (appState.useShorthandVariations && v3.shorthand ? v3.shorthand : v3.name) : "3";
  const preview = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("name-format-preview");
  if (previewEl) previewEl.textContent = preview;
}

function syncOutputToggles() {
  _syncTogglePills();
  _syncGroupingButtons();
  _syncModeControls();
  _syncSpreadUnit();
  renderSettingsVariations();
  _syncNameFormatPreview();
}

// Renders the shared variations list in the settings sheet using el().
function renderSettingsVariations() {
  const container = document.getElementById("settings-variations-list");
  if (!container) return;
  const vars = appState.variations || [];
  const canDelete = vars.length > 1;

  container.innerHTML = "";
  vars.forEach((v, idx) => {
    container.appendChild(el("div", { class: "flex items-center gap-1.5" }, [
      el("div", { class: "flex flex-col gap-0.5 shrink-0" }, [
        el("button", {
          onclick: () => moveSharedVariation(idx, -1),
          disabled: idx === 0,
          class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]"
        }, "▲"),
        el("button", {
          onclick: () => moveSharedVariation(idx, 1),
          disabled: idx === vars.length - 1,
          class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]"
        }, "▼")
      ]),
      el("input", {
        type: "text", value: v.name || "", placeholder: "Name",
        oninput: (e) => updateSharedVariation(idx, "name", e.target.value),
        class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]"
      }),
      el("input", {
        type: "text", value: v.shorthand || "", placeholder: "Short",
        oninput: (e) => updateSharedVariation(idx, "shorthand", e.target.value),
        class: "w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]"
      }),
      el("button", {
        onclick: () => removeSharedVariation(idx),
        disabled: !canDelete,
        class: "w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[13px]"
      }, "✕")
    ]));
  });
}

function updateSettingsFromInputs() {
  appState.name = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";

  // Read and sanitize a hex input by element ID, correcting the input value in place.
  const readHexInput = (id) => {
    const inputEl = document.getElementById(id);
    const clean = sanitizeHex(inputEl.value);
    if (inputEl.value !== clean) inputEl.value = clean;
    return clean;
  };

  if (!appState.themes) appState.themes = [{ name: "light", bg: "FFFFFF" }, { name: "dark", bg: "000000" }];
  appState.themes[0].bg = readHexInput("setting-light-bg");
  appState.themes[1].bg = readHexInput("setting-dark-bg");

  const wCount = parseInt(document.getElementById("setting-colorSteps").value);
  appState.colorSteps = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  appState.colorStepNames = document.getElementById("setting-colorStepNames").value;

  const bsSelect = document.getElementById("setting-baseSelection");
  appState.baseSelection = UI_MODES.selection[bsSelect.selectedIndex] || "By Contrast";

  appState.globalColorsCollectionName = document.getElementById("setting-globalColorsCollectionName").value.trim() || "_constants";
  appState.alphaValues = document.getElementById("setting-alphaValues").value;

  renderColorGroups();
  renderRoles();
  schedulePreview();
}

function syncUiSettingsInputs() {
  const scaleEl = document.getElementById("setting-ui-scale");
  const themeEl = document.getElementById("setting-ui-theme");
  if (scaleEl) scaleEl.value = String(uiPrefs.scale);
  if (themeEl) themeEl.value = uiPrefs.theme;
}

function syncInputsFromState() {
  document.getElementById("setting-name").value = appState.name || "";
  document.getElementById("setting-tonalScaleCollectionName").value = appState.tonalScaleCollectionName || "_scale";
  document.getElementById("setting-tokenCollectionName").value = appState.tokenCollectionName || "contextual";
  syncOutputToggles();
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
  document.getElementById("setting-light-bg").value = themes[0].bg;
  document.getElementById("setting-dark-bg").value = themes[1].bg;

  document.getElementById("setting-colorSteps").value = appState.colorSteps;
  document.getElementById("setting-scaleAlgorithm").value = appState.scaleAlgorithm || "Natural";
  document.getElementById("setting-colorStepNames").value = appState.colorStepNames || "";

  const bsEl = document.getElementById("setting-baseSelection");
  if (bsEl) {
    const idx = UI_MODES.selection.indexOf(appState.baseSelection || "By Contrast");
    bsEl.selectedIndex = idx !== -1 ? idx : 0;
  }

  document.getElementById("setting-globalColorsCollectionName").value = appState.globalColorsCollectionName || "_constants";
  document.getElementById("setting-alphaValues").value = appState.alphaValues || "10, 25, 50, 75, 90";

  renderSettingsVariations();
}
