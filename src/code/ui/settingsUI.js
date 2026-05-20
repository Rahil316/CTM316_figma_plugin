/**
 * ============================================================================
 * CTM316 SETTINGS
 *
 * Everything that connects the settings UI to appState:
 *   - Primitive DOM builders (_card, _row, _togglePill, _textInput …)
 *   - Panel renderers        (renderSettingsTokensPanel, renderSettingsPluginPanel)
 *   - Dynamic list renderers (renderSettingsVariations, renderSettingsThemes,
 *                             renderSettingsStepLabels, renderTokenOrderPills)
 *   - Mode setters           (toggleBoolSetting, setPluginMode, setAlgoScope …)
 *   - State → DOM sync       (syncInputsFromState, syncOutputToggles …)
 *   - DOM → State            (updateSettingsFromInputs)
 *   - Sidebar project tab    (renderSidebarProject)
 * ============================================================================
 */

// ── PRIMITIVE BUILDERS ────────────────────────────────────────────────────────

function _sLabel(text) {
  return el("p", { class: "text-[11px] font-bold tracking-[0.6px] uppercase text-[var(--text-muted)] mb-2" }, [text]);
}

function _card(children) {
  return el("div", { class: "settings-card space-y-3" }, children);
}

function _row(labelText, descText, control) {
  return el("div", { class: "flex items-center justify-between gap-3" }, [
    el("div", {}, [
      el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, [labelText]),
      descText ? el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, [descText]) : null,
    ]),
    control,
  ]);
}

function _smallRow(labelText, control) {
  return el("div", { class: "flex items-center justify-between" }, [
    el("p", { class: "text-[12px] text-[var(--text-muted)] font-medium" }, [labelText]),
    control,
  ]);
}

function _togglePill(id, onclickFn) {
  return el("button", { id, class: "toggle-pill", onclick: onclickFn });
}

function _textInput(id, placeholder, label, extraClass = "") {
  const input = el("input", {
    type: "text",
    id,
    placeholder,
    class: `w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] ${extraClass}`.trim(),
  });
  if (!label) return input;
  return el("div", { class: "space-y-1" }, [
    el("label", { for: id, class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, [label]),
    input,
  ]);
}

function _numberInput(id, label) {
  const input = el("input", {
    type: "number",
    id,
    class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]",
  });
  if (!label) return input;
  return el("div", { class: "space-y-1" }, [
    el("label", { for: id, class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, [label]),
    input,
  ]);
}

function _selectInput(id, options, label) {
  const select = el("select", {
    id,
    class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] appearance-none cursor-pointer",
  }, options.map(([val, txt]) => el("option", { value: val }, [txt])));
  if (!label) return select;
  return el("div", { class: "space-y-1 flex-1" }, [
    el("label", { for: id, class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, [label]),
    select,
  ]);
}

function _segmented(buttons) {
  return el("div", { class: "flex gap-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-0.5" },
    buttons.map(({ id, label, onclick }) =>
      el("button", { id, onclick, class: "seg-btn flex-1" }, [label])
    )
  );
}

// ── TOKEN SETTINGS PANEL ──────────────────────────────────────────────────────

function renderSettingsTokensPanel() {
  const mount = document.getElementById("settings-panel-tokens");
  if (!mount) return;
  mount.innerHTML = "";

  // ── Token Creation Mode ──
  const modeCard = _card([
    _sLabel("Token Creation Mode"),
    _segmented([
      { id: "mode-btn-ramp",   label: "Tonal Scale Based", onclick: () => setPluginMode(0) },
      { id: "mode-btn-direct", label: "Adaptive Engine",   onclick: () => setPluginMode(1) },
    ]),

    // Global algo toggle (label/desc text updated dynamically by syncAlgoSection)
    el("div", { class: "flex items-center justify-between gap-3" }, [
      el("div", {}, [
        el("p", { id: "setting-global-algo-title", class: "text-[13px] font-medium text-[var(--text-primary)]" },
          ["Use Global Algorithm for Tonal Scale Generation"]),
        el("p", { id: "setting-global-algo-desc", class: "text-[11px] text-[var(--text-muted)] mt-0.5" },
          ["Use a single algorithm for all colors. If unchecked, each color will have its own algorithm."]),
      ]),
      _togglePill("toggle-useGlobalAlgo", () => toggleBoolSetting("useGlobalAlgo")),
    ]),

    // Global algo selector
    el("div", { id: "setting-global-algo-row", class: "space-y-1" }, [
      _selectInput("setting-scaleAlgorithm", [
        ["Natural","Natural"], ["Uniform","Uniform"], ["Expressive","Expressive"],
        ["Symmetric","Symmetric"], ["OKLCH","OKLCH"], ["Material","Material"], ["Linear","Linear"],
      ], "Algorithm"),
    ]),

    // Adaptive scope (hidden unless adaptive + global off)
    el("div", { id: "setting-algo-scope-row", class: "hidden" }, [
      el("p", { class: "text-[var(--text-muted)] text-[12px] font-medium mb-2" }, ["Solver scope"]),
      el("div", { class: "flex gap-2" }, [
        el("button", { id: "algo-scope-btn-color", onclick: () => setAlgoScope("color"), class: "seg-btn flex-1" }, ["By Color"]),
        el("button", { id: "algo-scope-btn-role",  onclick: () => setAlgoScope("role"),  class: "seg-btn flex-1" }, ["By Role"]),
      ]),
    ]),
  ]);
  mount.appendChild(modeCard);

  // ── Palette (tonal-only, hidden in adaptive mode) ──
  const paletteCard = el("div", { id: "settings-scale-section", class: "settings-card space-y-3" }, [
    _sLabel("Palette"),
    el("div", { class: "grid grid-cols-2 gap-3" }, [
      _numberInput("setting-scaleLength", "Steps"),
    ]),
  ]);
  mount.appendChild(paletteCard);

  // ── Role Variations ──
  const rolesCard = _card([
    _sLabel("Variations"),

    // Allow role-specific overrides (sits outside the card, matches old layout)
    _row(
      "Role-specific Variations",
      "Allow individual roles to override the global variation list",
      _togglePill("toggle-allowRoleVariations", () => toggleBoolSetting("allowRoleVariations"))
    ),

    // Global variations list
    el("div", { class: "pt-2 border-t border-[var(--border)] space-y-2" }, [
      el("div", { class: "flex items-center justify-between" }, [
        el("div", {}, [
          el("p", { class: "text-[12px] text-[var(--text-muted)] font-medium" }, ["Global Variations"]),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, ["Shared across all roles unless overridden"]),
        ]),
        el("button", {
          onclick: () => addSharedVariation(),
          class: "h-[28px] px-2 text-[11px] font-medium rounded-[6px] bg-transparent border border-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer transition-all",
        }, ["+ Add"]),
      ]),
      el("div", { class: "flex items-center gap-1.5 px-0.5" }, [
        el("span", { class: "w-[18px] shrink-0" }),
        el("span", { class: "flex-1 text-[10px] font-bold text-[var(--text-muted)] px-1" }, ["Name"]),
        el("span", { class: "w-[76px] text-[10px] font-bold text-[var(--text-muted)] px-1" }, ["Shorthand"]),
        el("span", { class: "w-[32px] shrink-0" }),
      ]),
      el("div", { id: "settings-variations-list", class: "space-y-1.5" }),
    ]),
  ]);
  mount.appendChild(rolesCard);

  // ── Token Naming ──
  const namingCard = _card([
    _sLabel("Token Naming"),
    _smallRow("Shorthand for Colors",     _togglePill("toggle-useShorthandColors",     () => toggleBoolSetting("useShorthandColors"))),
    _smallRow("Shorthand for Roles",      _togglePill("toggle-useShorthandRoles",      () => toggleBoolSetting("useShorthandRoles"))),
    _smallRow("Shorthand for Variations", _togglePill("toggle-useShorthandVariations", () => toggleBoolSetting("useShorthandVariations"))),
    _smallRow("Shorthand for Scale Steps", _togglePill("toggle-useShorthandSteps",     () => toggleBoolSetting("useShorthandSteps"))),

    el("div", { class: "pt-1 border-t border-[var(--border)] space-y-2" }, [
      el("p", { class: "text-[12px] text-[var(--text-muted)] font-medium" }, ["Token Name Format"]),
      el("div", { id: "token-order-pills", class: "flex items-center gap-2 px-1 min-h-[32px]" }),
      el("div", { class: "px-1" }, [
        el("span", { class: "text-[11px] text-[var(--text-muted)]" }, ["Preview — "]),
        el("span", { id: "name-format-preview", class: "text-[11px] font-mono" }),
      ]),
    ]),

    el("div", { class: "flex items-center justify-between pt-1 border-t border-[var(--border)]" }, [
      el("p", { class: "text-[12px] text-[var(--text-muted)] font-medium" }, ["Variable Descriptions"]),
      _togglePill("toggle-includeDescriptions", () => toggleBoolSetting("includeDescriptions")),
    ]),
  ]);
  mount.appendChild(namingCard);

  // ── Figma Collections ──
  const collectionsCard = _card([
    _sLabel("Collections"),

    // Palettes collection — hidden in adaptive engine mode
    el("div", { id: "settings-palettes-collection-group", class: "space-y-2" }, [
      _row(
        "Palettes collection",
        null,
        _togglePill("toggle-includeTonalCollection", () => toggleBoolSetting("includeTonalCollection"))
      ),
      el("div", { id: "settings-tonal-collection-row" }, [
        _textInput("setting-tonalScaleCollectionName", "_Palettes"),
      ]),
    ]),

    // Color role collection
    el("div", { class: "space-y-2" }, [
      el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, ["Color role collection"]),
      _textInput("setting-tokenCollectionName", "Color Tokens"),
    ]),

    // Map roles with Palettes (inverse of embedDirectly) — hidden in adaptive engine mode
    el("div", { id: "settings-map-roles-row" }, [
      _row(
        "Map roles with Palettes",
        "Role tokens reference the Palettes collection",
        _togglePill("toggle-mapRolesWithPalettes", () => toggleMapRolesWithPalettes())
      ),
    ]),

    // Global Colors + sub-options
    _row(
      "Global Colors",
      "Store raw brand hex values — no themes, no processing",
      _togglePill("toggle-includeGlobalColors", () => toggleBoolSetting("includeGlobalColors"))
    ),
    el("div", { id: "constants-options", class: "hidden space-y-2 pl-2 border-l-2 border-[var(--border)]" }, [
      _textInput("setting-globalColorsCollectionName", "_constants", "Collection Name"),

      _row(
        "Alpha Tints",
        "Add alpha tint variables under colorName/Opacities/",
        _togglePill("toggle-includeAlphaTints", () => toggleBoolSetting("includeAlphaTints"))
      ),

      el("div", { id: "opacity-values-row", class: "hidden space-y-1" }, [
        _textInput("setting-alphaValues", "10, 25, 50, 75, 90", "Alpha Values (CSV, 0–100)"),
      ]),
    ]),
  ]);
  mount.appendChild(collectionsCard);

  // ── Step Labels (tonal-only, hidden in adaptive mode) ──
  const stepLabelsCard = el("div", { id: "settings-step-labels-section", class: "settings-card space-y-3" }, [
    _sLabel("Scale Step Labels"),
    el("p", { class: "text-[11px] text-[var(--text-muted)] -mt-1" }, ["Name each step in the tonal scale. Shorthand is used in token names when 'Shorthand for Scale Steps' is on."]),
    el("div", { class: "flex items-center justify-between" }, [
      el("div", { class: "flex items-center gap-1.5 px-0.5 flex-1" }, [
        el("span", { class: "w-[18px] shrink-0" }),
        el("span", { class: "flex-1 text-[10px] font-bold text-[var(--text-muted)] px-1" }, ["Label"]),
        el("span", { class: "w-[52px] text-[10px] font-bold text-[var(--text-muted)] px-1" }, ["Short"]),
        el("span", { class: "w-[32px] shrink-0" }),
      ]),
      el("button", {
        onclick: () => addStepLabel(),
        class: "h-[28px] px-2 text-[11px] font-medium rounded-[6px] bg-transparent border border-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer transition-all shrink-0",
      }, ["+ Add"]),
    ]),
    el("div", { id: "settings-step-labels-list", class: "space-y-1.5" }),
    el("p", { class: "text-[11px] text-[var(--text-muted)]" }, ["If empty, steps are numbered 1 … N automatically."]),
  ]);
  mount.appendChild(stepLabelsCard);
}

// ── PLUGIN SETTINGS PANEL ─────────────────────────────────────────────────────

function renderSettingsPluginPanel() {
  const mount = document.getElementById("settings-panel-plugin");
  if (!mount) return;
  mount.innerHTML = "";

  const scaleSelect = _selectInput("setting-ui-scale", [
    ["1.0", "100% (default)"],
    ["0.7", "70%"], ["0.8", "80%"], ["0.9", "90%"],
    ["1.1", "110%"], ["1.25", "125%"], ["1.5", "150%"],
  ], "UI Scale");
  const themeSelect = _selectInput("setting-ui-theme", [
    ["figma", "Follow Figma"],
    ["dark",  "Dark"],
    ["light", "Light"],
  ], "UI Theme");

  // attach handlers to the actual <select> inside the wrapper
  scaleSelect.querySelector("select").onchange = (e) => updateUiPref("scale", parseFloat(e.target.value) || 1.0);
  themeSelect.querySelector("select").onchange = (e) => updateUiPref("theme", e.target.value);

  const uiCard = _card([
    _sLabel("Interface"),
    el("div", { class: "flex gap-3" }, [scaleSelect, themeSelect]),
  ]);
  mount.appendChild(uiCard);
}

// ── ONE-SHOT INIT ─────────────────────────────────────────────────────────────

function renderSettingsPanels() {
  renderSettingsTokensPanel();
  renderSettingsPluginPanel();
}

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
  appState.embedDirectly = !appState.embedDirectly;
  const btn = document.getElementById("toggle-mapRolesWithPalettes");
  if (btn) btn.classList.toggle("on", !appState.embedDirectly);
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
    "embedDirectly", "useShorthandColors", "useShorthandRoles", "useShorthandVariations", "useShorthandSteps",
    "includeGlobalColors", "includeAlphaTints", "allowRoleVariations", "includeDescriptions",
    "perRoleControls", "useGlobalAlgo", "includeTonalCollection",
  ].forEach((key) => {
    ["toggle-" + key, "rd-toggle-" + key].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle("on", !!appState[key]);
    });
  });
  const mapBtn = document.getElementById("toggle-mapRolesWithPalettes");
  if (mapBtn) mapBtn.classList.toggle("on", !appState.embedDirectly);

  const constOpts = document.getElementById("constants-options");
  if (constOpts) constOpts.classList.toggle("hidden", !appState.includeGlobalColors);
  const opacRow = document.getElementById("opacity-values-row");
  if (opacRow) opacRow.classList.toggle("hidden", !appState.includeAlphaTints);
  const tonalNameRow = document.getElementById("settings-tonal-collection-row");
  if (tonalNameRow) tonalNameRow.classList.toggle("hidden", !appState.includeTonalCollection);
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

  const rampSection       = document.getElementById("settings-scale-section");
  const stepLabelsSection = document.getElementById("settings-step-labels-section");
  const palettesGroup     = document.getElementById("settings-palettes-collection-group");
  const mapRolesRow       = document.getElementById("settings-map-roles-row");
  const embedDirectlyRow  = document.getElementById("settings-embed-directly-row");
  if (rampSection)       rampSection.classList.toggle("hidden", isDirect);
  if (stepLabelsSection) stepLabelsSection.classList.toggle("hidden", isDirect);
  if (palettesGroup)     palettesGroup.classList.toggle("hidden", isDirect);
  if (mapRolesRow)       mapRolesRow.classList.toggle("hidden", isDirect);
  if (embedDirectlyRow)  embedDirectlyRow.classList.toggle("hidden", isDirect);

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
  const previewEl = document.getElementById("name-format-preview");
  if (!previewEl) return;
  const sampleColor = appState.colors && appState.colors[0];
  const sampleRole  = appState.roles  && appState.roles[0];
  if (!sampleColor || !sampleRole) { previewEl.innerHTML = ""; return; }
  const cLabel = appState.useShorthandColors ? (sampleColor.shorthand || sampleColor.name) : sampleColor.name;
  const rLabel = appState.useShorthandRoles  ? (sampleRole.shorthand  || sampleRole.name)  : sampleRole.name;
  const v3     = appState.variations && appState.variations[2];
  const vLabel = v3 ? (appState.useShorthandVariations && v3.shorthand ? v3.shorthand : v3.name) : "3";
  const segValues = { color: cLabel, role: rLabel, variation: vLabel };
  const order = appState.tokenNameOrder || ["color", "role", "variation"];
  const sep = `<span style="color:var(--text-muted);opacity:0.35">/</span>`;
  previewEl.innerHTML = order
    .map((s) => `<span style="color:${_pillColor(s)};font-weight:600">${segValues[s] || s}</span>`)
    .join(sep);
}

function syncAlgoSection() {
  const isAdaptive = appState.pluginMode === "adaptiveEngine";
  const useGlobal  = appState.useGlobalAlgo !== false;

  const algoToggleTitle = document.getElementById("setting-global-algo-title");
  const algoToggleDesc  = document.getElementById("setting-global-algo-desc");
  if (algoToggleTitle) algoToggleTitle.textContent = isAdaptive ? "Global Solver" : "Global Algorithm";
  if (algoToggleDesc)  algoToggleDesc.textContent  = isAdaptive
    ? "Use a single solver for all colors and roles"
    : "Use a single algorithm for all colors";

  const globalRow = document.getElementById("setting-global-algo-row");
  if (globalRow) globalRow.classList.toggle("hidden", !useGlobal);

  const scopeRow = document.getElementById("setting-algo-scope-row");
  if (scopeRow) scopeRow.classList.toggle("hidden", !(isAdaptive && !useGlobal));

  const scope    = appState.perColorAlgoScope || "color";
  const colorBtn = document.getElementById("algo-scope-btn-color");
  const roleBtn  = document.getElementById("algo-scope-btn-role");
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
  renderSettingsPanels();
  const _set = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
  _set("setting-name",                      appState.name || "");
  _set("setting-tonalScaleCollectionName",  appState.tonalScaleCollectionName || "_scale");
  _set("setting-tokenCollectionName",       appState.tokenCollectionName || "contextual");
  _set("setting-scaleLength",               appState.scaleLength);
  _set("setting-scaleAlgorithm",            appState.scaleAlgorithm || "Natural");

  const bsEl = document.getElementById("setting-baseSelection");
  if (bsEl) {
    const idx = UI_MODES.selection.indexOf(appState.baseSelection || "By Contrast");
    bsEl.selectedIndex = idx !== -1 ? idx : 0;
  }

  _set("setting-globalColorsCollectionName", appState.globalColorsCollectionName || "_constants");
  _set("setting-alphaValues",                appState.alphaValues || "10, 25, 50, 75, 90");

  syncOutputToggles();
  renderSettingsThemes();
  renderSettingsVariations();
  renderSettingsStepLabels();
  renderTokenOrderPills();
  syncUiSettingsInputs();
}

// ── DOM → STATE ───────────────────────────────────────────────────────────────

function updateSettingsFromInputs() {
  appState.tonalScaleCollectionName  = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName       = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";

  const wCount = parseInt(document.getElementById("setting-scaleLength").value);
  appState.scaleLength    = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  // scaleStepNames is managed live via the step labels CRUD list — no batch read needed

  appState.globalColorsCollectionName = document.getElementById("setting-globalColorsCollectionName").value.trim() || "_constants";
  appState.alphaValues                = document.getElementById("setting-alphaValues").value;

  renderColorGroups();
  renderRoles();
  schedulePreview();
}

// ── TOKEN ORDER PILLS ─────────────────────────────────────────────────────────

const PILL_COLORS  = ["#7c3aed", "#0891b2", "#ea580c", "#15803d", "#be123c", "#d97706", "#1d4ed8", "#a21caf"];
const PILL_LABELS  = { color: "Color", role: "Role", variation: "Variation" };
const _pillColorCache = {};
function _pillColor(segment) {
  if (!_pillColorCache[segment]) {
    const taken = Object.keys(_pillColorCache).length;
    _pillColorCache[segment] = PILL_COLORS[taken % PILL_COLORS.length];
  }
  return _pillColorCache[segment];
}

let _pillDragSrc = null;

function renderTokenOrderPills() {
  const container = document.getElementById("token-order-pills");
  if (!container) return;
  const order = appState.tokenNameOrder || ["color", "role", "variation"];
  container.innerHTML = "";

  order.forEach((segment, idx) => {
    const c = _pillColor(segment);
    const pill = document.createElement("span");
    pill.textContent = PILL_LABELS[segment] || segment;
    pill.draggable = true;
    pill.dataset.segment = segment;
    pill.style.cssText = `background:${c};color:#fff;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:600;cursor:grab;user-select:none;transition:opacity .15s,box-shadow .15s;outline:none;box-shadow:0 2px 8px ${c}55`;

    pill.addEventListener("dragstart", () => { _pillDragSrc = idx; pill.style.opacity = "0.4"; });
    pill.addEventListener("dragend",   () => { _pillDragSrc = null; pill.style.opacity = "1"; });
    pill.addEventListener("dragover",  (e) => { e.preventDefault(); if (_pillDragSrc !== null && _pillDragSrc !== idx) pill.style.boxShadow = `0 0 0 2px #fff8`; });
    pill.addEventListener("dragleave", () => { pill.style.boxShadow = `0 2px 8px ${c}55`; });
    pill.addEventListener("drop", (e) => {
      e.preventDefault();
      if (_pillDragSrc === null || _pillDragSrc === idx) return;
      const newOrder = [...order];
      const [moved] = newOrder.splice(_pillDragSrc, 1);
      newOrder.splice(idx, 0, moved);
      setTokenNameOrder(newOrder);
    });

    container.appendChild(pill);
    if (idx < order.length - 1) {
      const sep = document.createElement("span");
      sep.textContent = "/";
      sep.style.cssText = "color:var(--text-muted);font-size:13px;font-weight:700;opacity:0.35;user-select:none;pointer-events:none";
      container.appendChild(sep);
    }
  });

  _syncNameFormatPreview();
}

// ── SETTINGS LIST RENDERERS ───────────────────────────────────────────────────

function renderSettingsStepLabels() {
  const container = document.getElementById("settings-step-labels-list");
  if (!container) return;
  const steps = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  container.innerHTML = "";
  steps.forEach((s, idx) => {
    container.appendChild(
      el("div", { class: "flex items-center gap-1.5" }, [
        el("div", { class: "flex flex-col gap-0.5 shrink-0" }, [
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▲", onclick: () => moveStepLabel(idx, -1), disabled: idx === 0 }),
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveStepLabel(idx, 1),  disabled: idx === steps.length - 1 }),
        ]),
        el("input", {
          type: "text", value: s.name || "", placeholder: "Label",
          oninput: (e) => updateStepLabel(idx, "name", e.target.value),
          class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        el("input", {
          type: "text", value: s.shorthand || "", placeholder: "Short",
          oninput: (e) => updateStepLabel(idx, "shorthand", e.target.value),
          class: "w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        inputsUI.btn("danger", { size: "md", square: true, icon: Icons.Close, onclick: () => removeStepLabel(idx) }),
      ]),
    );
  });
}

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
          inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveSharedVariation(idx, 1),  disabled: idx === vars.length - 1 }),
        ]),
        el("input", {
          type: "text", value: v.name || "", placeholder: "Name",
          oninput: (e) => updateSharedVariation(idx, "name", e.target.value),
          class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        el("input", {
          type: "text", value: v.shorthand || "", placeholder: "Short",
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
  const themes = appState.themes || [];
  const canDelete = themes.length > 1;
  container.innerHTML = "";
  themes.forEach((theme, idx) => {
    const hexVal = theme.bg || "FFFFFF";
    container.appendChild(
      el("div", { class: "flex items-center gap-1.5" }, [
        el("input", {
          type: "text", value: theme.name || "", placeholder: "Mode name",
          oninput: (e) => { updateTheme(idx, "name", e.target.value); renderPreviewTabs(); },
          class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]",
        }),
        el("div", { class: "relative flex items-center" }, [
          el("input", {
            type: "color", value: "#" + hexVal, id: `theme-picker-${idx}`,
            oninput: (e) => {
              const clean  = e.target.value.replace("#", "").toUpperCase();
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
            style: `background:#${hexVal}`, id: `theme-swatch-${idx}`,
          }),
        ]),
        el("input", {
          type: "text", value: hexVal, placeholder: "RRGGBB",
          id: `theme-hex-${idx}`, maxlength: 6,
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
          onclick: () => removeTheme(idx),
        }),
      ]),
    );
  });
}

// ── SIDEBAR: PROJECT TAB ──────────────────────────────────────────────────────

function renderSidebarProject() {
  const container = document.getElementById("sidebar-content-container");
  if (!container) return;
  container.innerHTML = "";

  container.appendChild(
    el("div", { class: "space-y-4 p-1" }, [
      el("div", { class: "space-y-1" }, [
        el("label", { class: "text-[11px] text-[var(--text-muted)] font-medium ml-1" }, ["Project Name"]),
        el("input", {
          type: "text", value: appState.name || "", placeholder: "CTM316",
          oninput: (e) => updateProjectName(e.target.value),
          class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]",
        }),
      ]),
      el("div", { class: "space-y-2" }, [
        el("div", { class: "flex items-center justify-between" }, [
          el("label", { class: "text-[11px] text-[var(--text-muted)] font-medium ml-1" }, ["Themes (modes)"]),
          el("button", {
            onclick: () => { addTheme(); renderSidebarProject(); },
            class: "h-[26px] px-2 text-[11px] font-medium rounded-[6px] text-[var(--accent)] hover:bg-[var(--bg-hover)] border border-dashed border-[var(--border)] transition-colors",
          }, ["+ Add theme"]),
        ]),
        el("div", { id: "settings-themes-list", class: "space-y-1.5" }),
      ]),
    ]),
  );

  renderSettingsThemes();
}
