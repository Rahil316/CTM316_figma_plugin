/**
 * ============================================================================
 * CTM316 UI CONTROLS
 * All user-triggered interactions: CRUD for colors/roles/variations,
 * and settings sync between appState and the DOM.
 * ============================================================================
 */

// ── SECTION & SHEET MANAGEMENT ──

function toggleSection(id, event) {
  if (event && event.target.closest("button")) return;
  const section = document.getElementById(id);
  const isCollapsed = section.classList.toggle("collapsed");
  const trigger = section.querySelector('[role="button"]');
  if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
}

function showSheet(id) {
  document.getElementById(id).classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => s.classList.remove("open"));
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function showOverlay(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideOverlay(id) {
  document.getElementById(id).classList.add("hidden");
  if (id === "success-overlay" || id === "error-overlay") hideSheets();
}

// ── SETTINGS SCREEN ──

let _settingsSnapshot = null;

function openSettings() {
  _settingsSnapshot = JSON.parse(JSON.stringify({
    name: appState.name,
    themes: appState.themes,
    scaleLength: appState.scaleLength,
    scaleAlgorithm: appState.scaleAlgorithm,
    scaleStepNames: appState.scaleStepNames,
    pluginMode: appState.pluginMode,
    baseSelection: appState.baseSelection,
    spreadUnit: appState.spreadUnit,
    tonalScaleCollectionName: appState.tonalScaleCollectionName,
    tokenCollectionName: appState.tokenCollectionName,
    embedDirectly: appState.embedDirectly,
    includeGlobalColors: appState.includeGlobalColors,
    globalColorsCollectionName: appState.globalColorsCollectionName,
    includeAlphaTints: appState.includeAlphaTints,
    alphaValues: appState.alphaValues,
    variableStructure: appState.variableStructure,
    useShorthandColors: appState.useShorthandColors,
    useShorthandRoles: appState.useShorthandRoles,
    useShorthandVariations: appState.useShorthandVariations,
    includeDescriptions: appState.includeDescriptions,
    allowRoleVariations: appState.allowRoleVariations,
    perRoleControls: appState.perRoleControls,
  }));
  syncInputsFromState();
  switchSettingsTab("project");
  document.getElementById("settings-screen").classList.remove("hidden");
}

function closeSettings(cancel) {
  if (cancel && _settingsSnapshot) {
    Object.assign(appState, _settingsSnapshot);
    syncOutputToggles();
    renderColorGroups();
    renderRoles();
  } else {
    updateSettingsFromInputs();
  }
  _settingsSnapshot = null;
  document.getElementById("settings-screen").classList.add("hidden");
}

function switchSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.tab === tab)
  );
  document.querySelectorAll(".settings-panel").forEach((panel) =>
    panel.classList.toggle("hidden", panel.dataset.panel !== tab)
  );
}

// ── COLOR CRUD ──

function updateGroup(idx, key, value, el) {
  setColor(idx, key, value);
  if (key === "value") {
    const clean = appState.colors[idx].value;
    if (el && el.value !== clean) {
      const pos = el.selectionStart;
      el.value = clean;
      el.setSelectionRange(pos, pos);
    }
    const textEl = document.getElementById(`clr-${idx}-hex`);
    const pickerEl = document.getElementById(`clr-${idx}-picker`);
    if (textEl && textEl !== el) textEl.value = clean;
    if (pickerEl && pickerEl !== el && clean.length === 6) pickerEl.value = "#" + clean;
  }
  schedulePreview();
}

function removeGroup(idx) {
  appState.colors.splice(idx, 1);
  renderColorGroups();
  schedulePreview();
}

function moveGroup(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.colors.length) return;
  const [item] = appState.colors.splice(idx, 1);
  appState.colors.splice(target, 0, item);
  renderColorGroups();
}

function addGroup() {
  const n = appState.colors.length + 1;
  appState.colors.unshift({ _id: generateId(), name: `color${n}`, shorthand: `C${n}`, value: "888888" });
  renderColorGroups();
  schedulePreview();
}

// ── ROLE CRUD ──

function updateRole(idx, key, value) {
  setRole(idx, key, value);
  if (key === "name" || key === "shorthand") {
    schedulePreview();
  } else {
    renderRoles();
  }
}

function removeRole(idx) {
  appState.roles.splice(idx, 1);
  renderRoles();
  schedulePreview();
}

function moveRole(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.roles.length) return;
  const [item] = appState.roles.splice(idx, 1);
  appState.roles.splice(target, 0, item);
  renderRoles();
}

function addRole() {
  const n = appState.roles.length + 1;
  const mid = Math.floor(appState.scaleLength / 2);
  appState.roles.unshift({
    _id: generateId(),
    name: "Role " + n,
    shorthand: `r-${n}`,
    spread: 2,
    minContrast: 4.5,
    baseIndex: mid,
    darkBaseIndex: mid,
    variationTargets: defaultVariationTargets(appState.variations.length, appState.pluginMode, appState.scaleLength),
    description: "",
    variationOverride: false,
    roleVariations: [],
    mappingMode: "auto",
    variationTargetsLight: [],
    variationTargetsDark: [],
  });
  renderRoles();
  schedulePreview();
}

// ── VARIATION CRUD ──

function addSharedVariation() {
  const n = appState.variations.length + 1;
  appState.variations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function removeSharedVariation(idx) {
  if (appState.variations.length <= 1) return;
  appState.variations.splice(idx, 1);
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function moveSharedVariation(idx, dir) {
  const arr = appState.variations;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function updateSharedVariation(idx, field, value) {
  setVariation(idx, field, value);
  renderRoles();
  schedulePreview();
}

// ── ROLE VARIATION OVERRIDES ──

function toggleRoleVariationOverride(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = !role.variationOverride;
  if (role.variationOverride) {
    if (!role.roleVariations || role.roleVariations.length === 0) {
      role.roleVariations = appState.variations.map(function (v) {
        return Object.assign({}, v, { _id: generateId() });
      });
    }
  } else {
    role.variationManual = false;
  }
  renderRoles();
  schedulePreview();
}

function toggleRoleVariationManual(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationManual = !role.variationManual;
  renderRoles();
  schedulePreview();
}

function addRoleVariation(roleIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations) role.roleVariations = [];
  const n = role.roleVariations.length + 1;
  role.roleVariations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function removeRoleVariation(roleIdx, varIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || role.roleVariations.length <= 1) return;
  role.roleVariations.splice(varIdx, 1);
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function moveRoleVariation(roleIdx, varIdx, dir) {
  const arr = appState.roles[roleIdx].roleVariations;
  if (!arr) return;
  const newIdx = varIdx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[varIdx], arr[newIdx]] = [arr[newIdx], arr[varIdx]];
  renderRoles();
  schedulePreview();
}

function updateRoleVariation(roleIdx, varIdx, field, value) {
  setRoleVariation(roleIdx, varIdx, field, value);
  schedulePreview();
}

function resetRoleVariationsToShared(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = false;
  role.roleVariations = [];
  renderRoles();
  schedulePreview();
}

function updateRoleVariationTarget(roleIdx, varIdx, value) {
  setRole(roleIdx, "variationTarget:" + varIdx, value);
  schedulePreview();
}

// ── SETTINGS: TOGGLE & MODE SETTERS ──

function toggleBoolSetting(key) {
  appState[key] = !appState[key];
  syncOutputToggles();
  if (key === "allowRoleVariations" || key === "includeDescriptions" || key === "perRoleControls") {
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

// ── SETTINGS: SYNC HELPERS ──

function _syncTogglePills() {
  ["embedDirectly", "useShorthandColors", "useShorthandRoles", "useShorthandVariations", "includeGlobalColors", "includeAlphaTints", "allowRoleVariations", "includeDescriptions", "perRoleControls"].forEach((key) => {
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
  [
    ["seg-group-color", "rd-seg-group-color"],
    ["seg-group-role", "rd-seg-group-role"],
  ].forEach(([settingsId, rdId]) => {
    const isActive = settingsId.includes("color") ? tg === "color" : tg === "role";
    const s = document.getElementById(settingsId);
    const r = document.getElementById(rdId);
    if (s) s.classList.toggle("active", isActive);
    if (r) r.classList.toggle("active", isActive);
  });
}

function _syncModeControls() {
  const isDirect = appState.pluginMode === "adaptiveEngine";

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
  const isDirect = appState.pluginMode === "adaptiveEngine";
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

function _syncPerRoleControls() {
  const isPerRole = !!appState.perRoleControls;
  const bsLabel = document.getElementById("label-baseSelection");
  const suLabel = document.getElementById("label-spreadUnit");
  if (bsLabel) bsLabel.textContent = isPerRole ? "Default Base Selection" : "Base Selection";
  if (suLabel) suLabel.textContent = isPerRole ? "Default Spread Unit" : "Spread Unit";
}

function syncOutputToggles() {
  _syncTogglePills();
  _syncGroupingButtons();
  _syncModeControls();
  _syncSpreadUnit();
  _syncPerRoleControls();
  renderSettingsVariations();
  _syncNameFormatPreview();
}

// ── SETTINGS: VARIATIONS LIST ──

function renderSettingsVariations() {
  const container = document.getElementById("settings-variations-list");
  if (!container) return;
  const vars = appState.variations || [];
  const canDelete = vars.length > 1;

  container.innerHTML = "";
  vars.forEach((v, idx) => {
    container.appendChild(
      el("div", { class: "flex items-center gap-1.5" }, [
        el("div", { class: "flex flex-col gap-0.5 shrink-0" }, [
          el("button", { onclick: () => moveSharedVariation(idx, -1), disabled: idx === 0, class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]" }, "▲"),
          el("button", { onclick: () => moveSharedVariation(idx, 1), disabled: idx === vars.length - 1, class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]" }, "▼"),
        ]),
        el("input", {
          type: "text",
          value: v.name || "",
          placeholder: "Name",
          oninput: (e) => updateSharedVariation(idx, "name", e.target.value),
          class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        el("input", {
          type: "text",
          value: v.shorthand || "",
          placeholder: "Short",
          oninput: (e) => updateSharedVariation(idx, "shorthand", e.target.value),
          class: "w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        el("button", { onclick: () => removeSharedVariation(idx), disabled: !canDelete, class: "w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[13px]" }, "✕"),
      ]),
    );
  });
}

// ── SETTINGS: INPUT SYNC ──

function updateSettingsFromInputs() {
  appState.name = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";

  const readHexInput = (id) => {
    const inputEl = document.getElementById(id);
    const clean = sanitizeHex(inputEl.value);
    if (inputEl.value !== clean) inputEl.value = clean;
    return clean;
  };

  if (!appState.themes)
    appState.themes = [
      { name: "light", bg: "FFFFFF" },
      { name: "dark", bg: "000000" },
    ];
  appState.themes[0].bg = readHexInput("setting-light-bg");
  appState.themes[1].bg = readHexInput("setting-dark-bg");

  const wCount = parseInt(document.getElementById("setting-scaleLength").value);
  appState.scaleLength = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  appState.scaleStepNames = document.getElementById("setting-scaleStepNames").value;

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

  document.getElementById("setting-scaleLength").value = appState.scaleLength;
  document.getElementById("setting-scaleAlgorithm").value = appState.scaleAlgorithm || "Natural";
  document.getElementById("setting-scaleStepNames").value = appState.scaleStepNames || "";

  const bsEl = document.getElementById("setting-baseSelection");
  if (bsEl) {
    const idx = UI_MODES.selection.indexOf(appState.baseSelection || "By Contrast");
    bsEl.selectedIndex = idx !== -1 ? idx : 0;
  }

  document.getElementById("setting-globalColorsCollectionName").value = appState.globalColorsCollectionName || "_constants";
  document.getElementById("setting-alphaValues").value = appState.alphaValues || "10, 25, 50, 75, 90";

  renderSettingsVariations();
  syncUiSettingsInputs();
}
