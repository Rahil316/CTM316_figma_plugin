/**
 * ============================================================================
 * CTM316 NAVIGATION & SETTINGS LIFECYCLE
 *
 * Owns:
 *   - Sheet / overlay show-hide
 *   - Settings screen open / cancel / done
 *   - Settings tab switching
 *
 * Does NOT own any appState mutations (those are in crud.js) or
 * any DOM↔state synchronisation (that is in sync.js).
 * ============================================================================
 */

// ── SHEETS & OVERLAYS ──

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

// ── SETTINGS LIFECYCLE ──
//
// openSettings  — snapshots the fields that the settings screen can mutate,
//                 then syncs all inputs to current appState.
// closeSettings — if cancel: restores snapshot. If done: reads inputs back
//                 into appState via updateSettingsFromInputs (sync.js).

let _settingsSnapshot = null;

function openSettings() {
  _settingsSnapshot = JSON.parse(JSON.stringify({
    scaleLength:                appState.scaleLength,
    scaleAlgorithm:             appState.scaleAlgorithm,
    scaleStepNames:             appState.scaleStepNames,
    pluginMode:                 appState.pluginMode,
    baseSelection:              appState.baseSelection,
    spreadUnit:                 appState.spreadUnit,
    tonalScaleCollectionName:   appState.tonalScaleCollectionName,
    tokenCollectionName:        appState.tokenCollectionName,
    embedDirectly:              appState.embedDirectly,
    includeGlobalColors:        appState.includeGlobalColors,
    globalColorsCollectionName: appState.globalColorsCollectionName,
    includeAlphaTints:          appState.includeAlphaTints,
    alphaValues:                appState.alphaValues,
    variableStructure:          appState.variableStructure,
    useShorthandColors:         appState.useShorthandColors,
    useShorthandRoles:          appState.useShorthandRoles,
    useShorthandVariations:     appState.useShorthandVariations,
    includeDescriptions:        appState.includeDescriptions,
    allowRoleVariations:        appState.allowRoleVariations,
    perRoleControls:            appState.perRoleControls,
    includeTonalCollection:     appState.includeTonalCollection,
    addSeedValues:              appState.addSeedValues,
    useGlobalAlgo:              appState.useGlobalAlgo,
    perColorAlgoScope:          appState.perColorAlgoScope,
    tokenNameOrder:             appState.tokenNameOrder ? [...appState.tokenNameOrder] : null,
    variations:                 appState.variations ? JSON.parse(JSON.stringify(appState.variations)) : null,
  }));
  syncInputsFromState();
  switchSettingsTab("tokens");
  document.getElementById("settings-screen").classList.remove("hidden");
}

function closeSettings(cancel) {
  if (cancel && _settingsSnapshot) {
    Object.assign(appState, _settingsSnapshot);
    syncOutputToggles();
    syncAlgoSection();
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
