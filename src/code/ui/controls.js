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
  const sheet = document.getElementById(id);
  sheet.removeAttribute("inert");
  sheet.classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => {
    s.classList.remove("open");
    s.setAttribute("inert", "");
  });
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
  if (typeof renderPreviewTabs === "function") renderPreviewTabs();
  schedulePreview();
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

const _PRESET_COLORS = [
  { name: "Crimson",    shorthand: "cr", value: "DC143C" },
  { name: "Coral",      shorthand: "co", value: "FF6B6B" },
  { name: "Tomato",     shorthand: "to", value: "FF4500" },
  { name: "Orange",     shorthand: "or", value: "FF7F00" },
  { name: "Amber",      shorthand: "am", value: "F59E0B" },
  { name: "Gold",       shorthand: "gd", value: "FFD700" },
  { name: "Lime",       shorthand: "li", value: "84CC16" },
  { name: "Emerald",    shorthand: "em", value: "10B981" },
  { name: "Teal",       shorthand: "te", value: "14B8A6" },
  { name: "Cyan",       shorthand: "cy", value: "06B6D4" },
  { name: "Sky",        shorthand: "sk", value: "0EA5E9" },
  { name: "Blue",       shorthand: "bl", value: "3B82F6" },
  { name: "Cobalt",     shorthand: "cb", value: "0047AB" },
  { name: "Indigo",     shorthand: "in", value: "6366F1" },
  { name: "Violet",     shorthand: "vi", value: "7C3AED" },
  { name: "Purple",     shorthand: "pu", value: "A855F7" },
  { name: "Fuchsia",    shorthand: "fu", value: "D946EF" },
  { name: "Pink",       shorthand: "pk", value: "EC4899" },
  { name: "Rose",       shorthand: "ro", value: "F43F5E" },
  { name: "Brown",      shorthand: "br", value: "92400E" },
  { name: "Sienna",     shorthand: "si", value: "A0522D" },
  { name: "Sand",       shorthand: "sa", value: "C2B280" },
  { name: "Slate",      shorthand: "sl", value: "64748B" },
  { name: "Stone",      shorthand: "st", value: "78716C" },
  { name: "Zinc",       shorthand: "zn", value: "71717A" },
  { name: "Gray",       shorthand: "gr", value: "6B7280" },
  { name: "Neutral",    shorthand: "nt", value: "737373" },
  { name: "Charcoal",   shorthand: "ch", value: "374151" },
  { name: "Navy",       shorthand: "nv", value: "1E3A5F" },
  { name: "Forest",     shorthand: "fo", value: "166534" },
  { name: "Olive",      shorthand: "ol", value: "6B7C2C" },
  { name: "Mint",       shorthand: "mn", value: "A7F3D0" },
  { name: "Lavender",   shorthand: "lv", value: "C4B5FD" },
  { name: "Peach",      shorthand: "pe", value: "FBBF9C" },
  { name: "Blush",      shorthand: "bs", value: "FCA5A5" },
  { name: "Cream",      shorthand: "cm", value: "FFFBEB" },
  { name: "Ivory",      shorthand: "iv", value: "FFFFF0" },
  { name: "Snow",       shorthand: "sn", value: "FFFAFA" },
  { name: "White",      shorthand: "wh", value: "FFFFFF" },
  { name: "Black",      shorthand: "bk", value: "000000" },
  { name: "Midnight",   shorthand: "md", value: "121212" },
  { name: "Obsidian",   shorthand: "ob", value: "1A1A2E" },
  { name: "Magenta",    shorthand: "mg", value: "FF00FF" },
  { name: "Turquoise",  shorthand: "tu", value: "40E0D0" },
  { name: "Aqua",       shorthand: "aq", value: "00FFFF" },
  { name: "Chartreuse", shorthand: "cz", value: "7FFF00" },
  { name: "Maroon",     shorthand: "mr", value: "800000" },
  { name: "Burgundy",   shorthand: "bg", value: "800020" },
  { name: "Scarlet",    shorthand: "sc", value: "FF2400" },
  { name: "Tangerine",  shorthand: "tg", value: "F28500" },
];

function _nextPresetColor() {
  const usedNames = new Set(appState.colors.map((c) => c.name.toLowerCase()));
  const usedShorthands = new Set(appState.colors.map((c) => (c.shorthand || "").toLowerCase()));
  const available = _PRESET_COLORS.filter((p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase()));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  const n = appState.colors.length + 1;
  return { name: `Color ${n}`, shorthand: `c${n}`, value: "888888" };
}

const _PRESET_ROLES = [
  { name: "Text",        shorthand: "tx" },
  { name: "Fill",        shorthand: "fi" },
  { name: "Background",  shorthand: "bg" },
  { name: "Border",      shorthand: "bd" },
  { name: "Icon",        shorthand: "ic" },
  { name: "Surface",     shorthand: "su" },
  { name: "Overlay",     shorthand: "ov" },
  { name: "Shadow",      shorthand: "sh" },
  { name: "Accent",      shorthand: "ac" },
  { name: "Muted",       shorthand: "mu" },
  { name: "Subtle",      shorthand: "sb" },
  { name: "Emphasis",    shorthand: "em" },
  { name: "Link",        shorthand: "lk" },
  { name: "Placeholder", shorthand: "ph" },
  { name: "Disabled",    shorthand: "ds" },
  { name: "Success",     shorthand: "ok" },
  { name: "Warning",     shorthand: "wn" },
  { name: "Error",       shorthand: "er" },
  { name: "Info",        shorthand: "nf" },
  { name: "Inverse",     shorthand: "iv" },
];

function _nextPresetRole() {
  const usedNames = new Set(appState.roles.map((r) => r.name.toLowerCase()));
  const usedShorthands = new Set(appState.roles.map((r) => (r.shorthand || "").toLowerCase()));
  const available = _PRESET_ROLES.filter((p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase()));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  const n = appState.roles.length + 1;
  return { name: `Role ${n}`, shorthand: `r${n}` };
}

function addGroup() {
  const preset = _nextPresetColor();
  appState.colors.unshift({ _id: generateId(), name: preset.name, shorthand: preset.shorthand, value: preset.value });
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
  const preset = _nextPresetRole();
  const mid = Math.floor(appState.scaleLength / 2);
  appState.roles.unshift({
    _id: generateId(),
    name: preset.name,
    shorthand: preset.shorthand,
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

// ── SETTINGS: THEMES LIST ──

function renderSettingsThemes() {
  const container = document.getElementById("settings-themes-list");
  if (!container) return;
  const themes = appState.themes || [];
  const canDelete = themes.length > 1;

  container.innerHTML = "";
  themes.forEach((theme, idx) => {
    const hexVal = theme.bg || "FFFFFF";
    const row = el("div", { class: "flex items-center gap-1.5" }, [
      el("input", {
        type: "text",
        value: theme.name || "",
        placeholder: "Mode name",
        oninput: (e) => { updateTheme(idx, "name", e.target.value); renderPreviewTabs(); },
        class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
      }),
      el("div", { class: "relative flex items-center" }, [
        el("input", {
          type: "color",
          value: "#" + hexVal,
          id: `theme-picker-${idx}`,
          oninput: (e) => {
            const clean = e.target.value.replace("#", "").toUpperCase();
            const textEl = document.getElementById(`theme-hex-${idx}`);
            const swatch = document.getElementById(`theme-swatch-${idx}`);
            if (textEl) textEl.value = clean;
            if (swatch) swatch.style.background = "#" + clean;
            updateTheme(idx, "bg", clean);
            schedulePreview();
          },
          class: "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
        }),
        el("div", {
          class: "size-[32px] rounded-[8px] border border-[var(--border)] cursor-pointer shrink-0",
          style: `background:#${hexVal}`,
          id: `theme-swatch-${idx}`,
        }),
      ]),
      el("input", {
        type: "text",
        value: hexVal,
        placeholder: "RRGGBB",
        id: `theme-hex-${idx}`,
        maxlength: 6,
        oninput: (e) => {
          const clean = sanitizeHex(e.target.value);
          updateTheme(idx, "bg", clean);
          const swatch = document.getElementById(`theme-swatch-${idx}`);
          const picker = document.getElementById(`theme-picker-${idx}`);
          if (swatch) swatch.style.background = "#" + clean;
          if (picker && clean.length === 6) picker.value = "#" + clean;
          schedulePreview();
        },
        class: "w-[80px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] uppercase outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)] font-mono",
      }),
      inputsUI.btn("danger", { size: "md", square: true, icon: Icons.Close, disabled: !canDelete, onclick: () => { removeTheme(idx); renderSettingsThemes(); renderPreviewTabs(); schedulePreview(); } }),
    ]);
    container.appendChild(row);
  });
}

function addThemeRow() {
  addTheme();
  renderSettingsThemes();
  renderPreviewTabs();
  schedulePreview();
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
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▲", onclick: () => moveSharedVariation(idx, -1), disabled: idx === 0 }),
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveSharedVariation(idx, 1), disabled: idx === vars.length - 1 }),
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
        inputsUI.btn("danger", { size: "md", square: true, icon: Icons.Close, onclick: () => removeSharedVariation(idx), disabled: !canDelete }),
      ]),
    );
  });
}

// ── SETTINGS: INPUT SYNC ──

function updateSettingsFromInputs() {
  appState.name = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";

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
  renderSettingsThemes();

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
