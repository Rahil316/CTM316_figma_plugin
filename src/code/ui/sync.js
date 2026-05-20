/**
 * ============================================================================
 * CTM316 SETTINGS SYNC
 *
 * All the two-way glue between appState and the settings DOM.
 *
 * ┌─ SECTION                CONTAINS ───────────────────────────────────────┐
 * │  Mode setters           toggleBoolSetting, setPluginMode, setSpreadUnit  │
 * │                         setBaseSelection, setTokenGrouping, setAlgoScope │
 * │                         toggleMapRolesWithPalettes, setTokenNameOrder    │
 * │  State → DOM            syncInputsFromState, syncUiSettingsInputs        │
 * │                         syncOutputToggles, syncAlgoSection               │
 * │  DOM → State            updateSettingsFromInputs                         │
 * │  Token order pills      renderTokenOrderPills, _syncNameFormatPreview    │
 * │  Settings renderers     renderSettingsVariations, renderSettingsThemes   │
 * │  Sidebar project tab    renderSidebarProject                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ============================================================================
 */

// ── MODE SETTERS ─────────────────────────────────────────────────────────────
//
//  Each setter mutates one slice of appState and then triggers the minimum
//  sync + render needed to reflect the change in the UI.

function toggleBoolSetting(key) {
  appState[key] = !appState[key];
  syncOutputToggles();
  if (key === "allowRoleVariations" || key === "includeDescriptions" || key === "perRoleControls") {
    renderColorGroups();
    renderRoles();
  }
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

function setTokenGrouping(idx) {
  appState.variableStructure = UI_MODES.grouping[idx] || "color";
  syncOutputToggles();
  schedulePreview();
}

function setAlgoScope(scope) {
  appState.perColorAlgoScope = scope;
  const colorBtn = document.getElementById("algo-scope-btn-color");
  const roleBtn = document.getElementById("algo-scope-btn-role");
  if (colorBtn) colorBtn.classList.toggle("active", scope === "color");
  if (roleBtn) roleBtn.classList.toggle("active", scope === "role");
  schedulePreview();
}

function toggleMapRolesWithPalettes() {
  appState.mapRolesWithPalettes = !appState.mapRolesWithPalettes;
  const btn = document.getElementById("toggle-mapRolesWithPalettes");
  if (btn) btn.classList.toggle("on", !!appState.mapRolesWithPalettes);
  schedulePreview();
}

function setTokenNameOrder(order) {
  appState.tokenNameOrder = order;
  renderTokenOrderPills();
  _syncNameFormatPreview();
  schedulePreview();
}

// ── STATE → DOM ───────────────────────────────────────────────────────────────

function _syncTogglePills() {
  [
    "embedDirectly", "useShorthandColors", "useShorthandRoles", "useShorthandVariations",
    "includeGlobalColors", "includeAlphaTints", "allowRoleVariations", "includeDescriptions",
    "perRoleControls", "useGlobalAlgo", "includeTonalCollection", "addSeedValues",
    "mapRolesWithPalettes",
  ].forEach((key) => {
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
    ["seg-group-role",  "rd-seg-group-role"],
  ].forEach(([settingsId, rdId]) => {
    const isColor = settingsId.includes("color");
    const isActive = isColor ? tg === "color" : tg === "role";
    const s = document.getElementById(settingsId);
    const r = document.getElementById(rdId);
    if (s) s.classList.toggle("active", isActive);
    if (r) r.classList.toggle("active", isActive);
  });
}

function _syncModeControls() {
  const isDirect = appState.pluginMode === "adaptiveEngine";

  const mbRamp   = document.getElementById("mode-btn-ramp");
  const mbDirect = document.getElementById("mode-btn-direct");
  if (mbRamp)   mbRamp.classList.toggle("active", !isDirect);
  if (mbDirect) mbDirect.classList.toggle("active",  isDirect);

  const rampSection       = document.getElementById("settings-ramp-section");
  const tonalCollRow      = document.getElementById("settings-tonal-collection-row");
  const embedDirectlyRow  = document.getElementById("settings-embed-directly-row");
  if (rampSection)      rampSection.classList.toggle("hidden", isDirect);
  if (tonalCollRow)     tonalCollRow.classList.toggle("hidden", isDirect);
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

  const suSteps    = document.getElementById("su-btn-steps");
  const suContrast = document.getElementById("su-btn-contrast");
  if (suSteps)    suSteps.classList.toggle("active",    (appState.spreadUnit || "steps") === "steps");
  if (suContrast) suContrast.classList.toggle("active", appState.spreadUnit === "contrast");
}

function _syncPerRoleControls() {
  const isPerRole = !!appState.perRoleControls;
  const bsLabel = document.getElementById("label-baseSelection");
  const suLabel = document.getElementById("label-spreadUnit");
  if (bsLabel) bsLabel.textContent = isPerRole ? "Default Base Selection" : "Base Selection";
  if (suLabel) suLabel.textContent = isPerRole ? "Default Spread Unit" : "Spread Unit";
}

function _syncNameFormatPreview() {
  const tg = appState.variableStructure || "color";
  const sampleColor = appState.colors && appState.colors[0];
  const sampleRole  = appState.roles  && appState.roles[0];
  if (!sampleColor || !sampleRole) return;
  const cLabel = appState.useShorthandColors ? (sampleColor.shorthand || sampleColor.name) : sampleColor.name;
  const rLabel = appState.useShorthandRoles  ? (sampleRole.shorthand  || sampleRole.name)  : sampleRole.name;
  const v3     = appState.variations && appState.variations[2];
  const stepLabel = v3 ? (appState.useShorthandVariations && v3.shorthand ? v3.shorthand : v3.name) : "3";
  const preview = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("name-format-preview");
  if (previewEl) previewEl.textContent = preview;
}

function syncAlgoSection() {
  const isDirect    = appState.pluginMode === "adaptiveEngine";
  const isPerColor  = !appState.useGlobalAlgo;
  const scopeRow    = document.getElementById("setting-algo-scope-row");
  const globalRow   = document.getElementById("setting-global-algo-row");

  if (scopeRow)  scopeRow.classList.toggle("hidden", !(isDirect && isPerColor));
  if (globalRow) globalRow.classList.toggle("hidden", isPerColor && !isDirect);

  const colorBtn = document.getElementById("algo-scope-btn-color");
  const roleBtn  = document.getElementById("algo-scope-btn-role");
  const scope    = appState.perColorAlgoScope || "color";
  if (colorBtn) colorBtn.classList.toggle("active", scope === "color");
  if (roleBtn)  roleBtn.classList.toggle("active",  scope === "role");
}

function syncOutputToggles() {
  _syncTogglePills();
  _syncGroupingButtons();
  _syncModeControls();
  _syncSpreadUnit();
  _syncPerRoleControls();
  syncAlgoSection();
  renderSettingsVariations();
  _syncNameFormatPreview();
}

function syncUiSettingsInputs() {
  const scaleEl = document.getElementById("setting-ui-scale");
  const themeEl = document.getElementById("setting-ui-theme");
  if (scaleEl) scaleEl.value = String(uiPrefs.scale);
  if (themeEl) themeEl.value = uiPrefs.theme;
}

function syncInputsFromState() {
  document.getElementById("setting-name").value                      = appState.name || "";
  document.getElementById("setting-tonalScaleCollectionName").value  = appState.tonalScaleCollectionName || "_scale";
  document.getElementById("setting-tokenCollectionName").value       = appState.tokenCollectionName || "contextual";

  document.getElementById("setting-scaleLength").value              = appState.scaleLength;
  document.getElementById("setting-scaleAlgorithm").value           = appState.scaleAlgorithm || "Natural";
  document.getElementById("setting-scaleStepNames").value           = appState.scaleStepNames || "";

  const bsEl = document.getElementById("setting-baseSelection");
  if (bsEl) {
    const idx = UI_MODES.selection.indexOf(appState.baseSelection || "By Contrast");
    bsEl.selectedIndex = idx !== -1 ? idx : 0;
  }

  document.getElementById("setting-globalColorsCollectionName").value = appState.globalColorsCollectionName || "_constants";
  document.getElementById("setting-alphaValues").value               = appState.alphaValues || "10, 25, 50, 75, 90";

  syncOutputToggles();
  renderSettingsThemes();
  renderSettingsVariations();
  renderTokenOrderPills();
  syncUiSettingsInputs();
}

// ── DOM → STATE ───────────────────────────────────────────────────────────────

function updateSettingsFromInputs() {
  appState.name                      = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName  = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName       = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";

  const wCount = parseInt(document.getElementById("setting-scaleLength").value);
  appState.scaleLength    = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  appState.scaleStepNames = document.getElementById("setting-scaleStepNames").value;

  const bsSelect = document.getElementById("setting-baseSelection");
  appState.baseSelection = UI_MODES.selection[bsSelect.selectedIndex] || "By Contrast";

  appState.globalColorsCollectionName = document.getElementById("setting-globalColorsCollectionName").value.trim() || "_constants";
  appState.alphaValues                = document.getElementById("setting-alphaValues").value;

  renderColorGroups();
  renderRoles();
  schedulePreview();
}

// ── TOKEN ORDER PILLS ─────────────────────────────────────────────────────────
//
//  Renders draggable pills for tokenNameOrder (["color","role","variation"]).
//  Drag-to-reorder updates appState.tokenNameOrder and re-renders.

const PILL_LABELS  = { color: "Color", role: "Role", variation: "Variation" };
const PILL_COLORS  = { color: "bg-blue-500/20 text-blue-300 border-blue-500/40", role: "bg-purple-500/20 text-purple-300 border-purple-500/40", variation: "bg-green-500/20 text-green-300 border-green-500/40" };
let _pillDragSrc   = null;

function renderTokenOrderPills() {
  const container = document.getElementById("token-order-pills");
  if (!container) return;
  const order = appState.tokenNameOrder || ["color", "role", "variation"];

  container.innerHTML = "";
  order.forEach((key, i) => {
    const pill = document.createElement("div");
    pill.className = `flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium cursor-grab select-none ${PILL_COLORS[key] || ""}`;
    pill.draggable = true;
    pill.dataset.key = key;
    pill.textContent = PILL_LABELS[key] || key;

    pill.addEventListener("dragstart", (e) => {
      _pillDragSrc = i;
      e.dataTransfer.effectAllowed = "move";
    });
    pill.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    pill.addEventListener("drop", (e) => {
      e.preventDefault();
      if (_pillDragSrc === null || _pillDragSrc === i) return;
      const next = [...order];
      const [moved] = next.splice(_pillDragSrc, 1);
      next.splice(i, 0, moved);
      setTokenNameOrder(next);
    });
    pill.addEventListener("dragend", () => { _pillDragSrc = null; });

    container.appendChild(pill);
  });

  _syncNameFormatPreview();
}

// ── SETTINGS RENDERERS ────────────────────────────────────────────────────────

function renderSettingsVariations() {
  const container = document.getElementById("settings-variations-list");
  if (!container) return;
  const vars     = appState.variations || [];
  const canDelete = vars.length > 1;

  container.innerHTML = "";
  vars.forEach((v, idx) => {
    container.appendChild(
      el("div", { class: "flex items-center gap-1.5" }, [
        el("div", { class: "flex flex-col gap-0.5 shrink-0" }, [
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▲", onclick: () => moveSharedVariation(idx, -1), disabled: idx === 0 }),
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveSharedVariation(idx, 1),  disabled: idx === vars.length - 1 }),
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

function renderSettingsThemes() {
  const container = document.getElementById("settings-themes-list");
  if (!container) return;
  const themes   = appState.themes || [];
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
            const clean   = e.target.value.replace("#", "").toUpperCase();
            const textEl  = document.getElementById(`theme-hex-${idx}`);
            const swatch  = document.getElementById(`theme-swatch-${idx}`);
            if (textEl)  textEl.value = clean;
            if (swatch)  swatch.style.background = "#" + clean;
            updateTheme(idx, "bg", clean);
            schedulePreview();
          },
          class: "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
        }),
        el("div", {
          class: "size-[32px] rounded-[8px] border border-[var(--border)] cursor-pointer shrink-0",
          style: `background:#${hexVal}`,
          id:    `theme-swatch-${idx}`,
        }),
      ]),
      el("input", {
        type: "text",
        value: hexVal,
        placeholder: "RRGGBB",
        id: `theme-hex-${idx}`,
        maxlength: 6,
        oninput: (e) => {
          const clean  = sanitizeHex(e.target.value);
          const swatch = document.getElementById(`theme-swatch-${idx}`);
          const picker = document.getElementById(`theme-picker-${idx}`);
          updateTheme(idx, "bg", clean);
          if (swatch) swatch.style.background = "#" + clean;
          if (picker && clean.length === 6) picker.value = "#" + clean;
          schedulePreview();
        },
        class: "w-[80px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] uppercase outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)] font-mono",
      }),
      inputsUI.btn("danger", {
        size: "md", square: true, icon: Icons.Close, disabled: !canDelete,
        onclick: () => { removeTheme(idx); renderSettingsThemes(); renderPreviewTabs(); schedulePreview(); },
      }),
    ]);
    container.appendChild(row);
  });
}

// ── SIDEBAR: PROJECT TAB ──────────────────────────────────────────────────────
//
//  Renders a lightweight project-name card into #sidebar-content-container
//  when the "Project" sidebar tab is active.

function renderSidebarProject() {
  const container = document.getElementById("sidebar-content-container");
  if (!container) return;
  container.innerHTML = "";

  container.appendChild(
    el("div", { class: "space-y-3" }, [
      el("div", { class: "space-y-1" }, [
        el("label", { class: "text-[11px] text-[var(--text-muted)] font-medium ml-1" }, ["Project Name"]),
        el("input", {
          type: "text",
          value: appState.name || "",
          placeholder: "CTM316",
          oninput: (e) => updateProjectName(e.target.value),
          class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]",
        }),
      ]),
    ]),
  );
}
