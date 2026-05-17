/**
 * ============================================================================
 * CTM316 UI RUNTIME
 *
 * Read this file first. It owns all runtime state, maps how each piece of
 * state changes, and wires every user interaction to the right handler.
 *
 * Building blocks live in their own files — go there when you want to change
 * HOW something works, not when it fires:
 *   state.js      — appState store, all mutations, validation, dirty hash
 *   components.js — DOM utilities, element factory, component templates
 *   controls.js   — CRUD handlers + settings panel sync
 *   output.js     — Banners, preview rendering, Figma sync dispatch, import/export
 * ============================================================================
 */

// ── 1. RUNTIME STATE REGISTRY ──────────────────────────────────────────────
//
// Every module-level variable the runtime owns or references, with what it
// is, what reads it, and what causes it to change.
//
// Variables declared in state.js (store layer) — referenced here, not re-declared:
//   appState           The full plugin config. All mutations go through state.js
//                      (setColor, setRole, setVariation, loadState, etc.).
//                      Reads: every renderer, every message handler.
//                      Mutates: ui-actions.js CRUD, ui-io.js import, message
//                               handlers "load-config" and "finish" (below).
//
//   uiPrefs            { scale, theme }. Persisted in Figma clientStorage.
//                      Reads: applyUiPrefs().
//                      Mutates: updateUiPref(), "load-ui-prefs-meta" message.
//
//   activeSidebarTab   Which sidebar tab is visible ("color-groups" | "roles-config").
//                      Reads: renderColorGroups, renderRoles (gate on tab).
//                      Mutates: sidebar tab onclick (section 6).
//
//   savedState         Deep-clone of appState at last successful Figma sync.
//                      Used to build variable rename maps.
//                      Reads: handleSubmit, proceedWithSync (ui-io.js).
//                      Mutates: setSavedState() called from "load-config",
//                               "finish" messages, and finalizeImport (ui-io.js).

// Plugin mode / selection constants — consumed by ui-settings.js setters.
const UI_MODES = {
  plugin:    ["tonalScalesBased", "adaptiveEngine"],
  grouping:  ["color",           "role"           ],
  spread:    ["steps",           "contrast"       ],
  selection: ["By Contrast",     "By Index",  "Manual"],
};

// Sync dialog state — scoped to the run-confirm flow.
let pendingScope = "all";
// Reads: proceedWithSync (ui-io.js), refreshRunDialog (ui-io.js).
// Mutates: setRunScope (ui-io.js), handleSubmit (ui-io.js), scope buttons (section 6).

let lastCollectionCheckResult = [];
// Reads: refreshRunDialog (ui-io.js).
// Mutates: "collection-check-result" message handler (section 3).

let lastRenameData = null;
// Reads: refreshRunDialog (ui-io.js).
// Mutates: "collection-check-result" message handler (section 3).

// Resize drag state — owned entirely by the resize handle logic (section 4).
let isResizing  = false;
let resizeOriginX = 0, resizeOriginY = 0;
let resizeStartW  = 0, resizeStartH  = 0;
// Mutates: resize-handle mousedown → onMouseMove → onMouseUp (section 4).


// ── 2. RENDER PIPELINE ─────────────────────────────────────────────────────
//
// These are the only functions that write to the DOM.
// Call them after any appState mutation that affects their output.
// Debounced so rapid mutations don't thrash the DOM.
//
//   renderColorGroups()  → rebuilds color cards in the sidebar
//   renderRoles()        → rebuilds role cards in the sidebar
//   schedulePreview()    → debounced preview panel update  (ui-preview.js)
//   syncOutputToggles()  → syncs settings buttons to appState (ui-settings.js)
//   syncInputsFromState() → syncs all settings inputs to appState (ui-settings.js)

// Drag-and-drop reorder helper — used by both renderColorGroups and renderRoles.
function bindDragDrop(card, idx, { cardSelector, getIdx, setIdx, onDrop }) {
  card.draggable = true;
  card.addEventListener("dragstart", (e) => {
    setIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    card.style.opacity = "0.5";
  });
  card.addEventListener("dragend", () => {
    setIdx(null);
    card.style.opacity = "";
    document.querySelectorAll(cardSelector).forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
  });
  card.addEventListener("dragover", (e) => {
    const src = getIdx();
    if (src === null || src === idx) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(cardSelector).forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
    card.classList.add("border-t-2", "!border-t-[var(--accent)]");
  });
  card.addEventListener("dragleave", (e) => {
    if (!card.contains(e.relatedTarget)) card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
  });
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    const src = getIdx();
    if (src === null || src === idx) return;
    onDrop(src, idx);
  });
}

const renderColorGroups = debounce(() => {
  if (activeSidebarTab !== "color-groups") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inputsUI.actionButton("+ Add Color", addGroup));

    appState.colors.forEach((group, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2 color-group-card-plugin shadow-sm hover:shadow-md transition-all group relative overflow-hidden";

      bindDragDrop(card, idx, {
        cardSelector: ".color-group-card-plugin",
        getIdx: () => _colorDragSrcIdx,
        setIdx: (v) => { _colorDragSrcIdx = v; },
        onDrop: (src, dst) => {
          const [moved] = appState.colors.splice(src, 1);
          appState.colors.splice(dst, 0, moved);
          renderColorGroups();
          schedulePreview();
        },
      });

      Components.ColorGroupCard(group, idx, appState).forEach((node) => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);

const renderRoles = debounce(() => {
  if (activeSidebarTab !== "roles-config") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inputsUI.actionButton("+ Add Color Role", addRole));

    appState.roles.forEach((role, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2 role-card-plugin";

      bindDragDrop(card, idx, {
        cardSelector: ".role-card-plugin",
        getIdx: () => _roleDragSrcIdx,
        setIdx: (v) => { _roleDragSrcIdx = v; },
        onDrop: (src, dst) => {
          const [moved] = appState.roles.splice(src, 1);
          appState.roles.splice(dst, 0, moved);
          renderRoles();
          schedulePreview();
        },
      });

      Components.RoleGroupCard(role, idx, appState).forEach((node) => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);


// ── 3. MESSAGE HANDLING ────────────────────────────────────────────────────
//
// Every message the Figma backend sends to this UI thread lands here.
// One block per message type, in the order they typically fire during a session.

window.onmessage = (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  // Backend probed capabilities on startup — store and apply to UI gating.
  if (msg.type === "capabilities") {
    if (!msg.capabilities.multiMode) {
      const multiModeEls = document.querySelectorAll("[data-requires-multimode]");
      multiModeEls.forEach((el) => el.classList.add("hidden"));
    }
    return;
  }

  // Saved config loaded from Figma document storage — initialize the full UI.
  if (msg.type === "load-config") {
    ensureIds(msg.state);
    setSavedState(msg.state);
    appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), msg.state);

    if (appState.pluginMode === 0) appState.pluginMode = "tonalScalesBased";
    else if (appState.pluginMode === 1) appState.pluginMode = "adaptiveEngine";

    ensureIds(appState);
    ensureVariations();
    markClean();
    renderColorGroups();
    renderRoles();
    syncInputsFromState();
    return;
  }

  // Saved UI preferences (scale, theme) loaded from Figma client storage.
  if (msg.type === "load-ui-prefs-meta") {
    const VALID_SCALES = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5];
    const VALID_THEMES = ["figma", "dark", "light"];
    if (msg.prefs.scale !== undefined) {
      const s = parseFloat(msg.prefs.scale);
      if (VALID_SCALES.includes(s)) uiPrefs.scale = s;
    }
    if (msg.prefs.theme !== undefined && VALID_THEMES.includes(msg.prefs.theme)) {
      uiPrefs.theme = msg.prefs.theme;
    }
    applyUiPrefs();
    syncUiSettingsInputs();
    return;
  }

  // Collection existence check done — show the run-confirm dialog.
  if (msg.type === "collection-check-result") {
    lastCollectionCheckResult = msg.existing || [];
    lastRenameData = msg.renames || null;
    setRunScope(pendingScope || "all");
    showOverlay("run-dialog-overlay");
    return;
  }

  // Sync complete — update baseline snapshot, show success overlay.
  if (msg.type === "finish") {
    setSavedState(appState);
    markClean();
    hideOverlay("loading-overlay");
    showOverlay("success-overlay");
    const resultsEl = document.getElementById("success-results");
    resultsEl.innerHTML = "";
    const t = msg.tally;
    [
      ["Created", t.created, "text-white"  ],
      ["Updated", t.updated, "text-white"  ],
      ...(t.renamed > 0 ? [["Renamed", t.renamed, "text-blue-300"]] : []),
      ["Failed",  t.failed,  "text-red-400"],
    ].forEach(([label, count, cls]) => {
      resultsEl.appendChild(el("p", { class: "text-sm" }, [`${label}: `, el("span", { class: `${cls} font-bold` }, String(count))]));
    });
    showSystemBanners(msg.errors || null, msg.result || null);
    return;
  }

  // Export data ready — trigger a file download.
  if (msg.type === "processed-data-response") {
    const { content, exportType } = msg;
    const mimeMap  = { json: "application/json", css: "text/css", csv: "text/csv", scss: "text/plain" };
    const extMap   = { json: "json", css: "css", csv: "csv", scss: "scss" };
    const typeLabel = { json: "tokens", css: "variables", csv: "token_list", scss: "tokens" };
    triggerDownload(content, exportFileName(typeLabel[exportType] || exportType, extMap[exportType] || exportType), mimeMap[exportType] || "text/plain");
    return;
  }

  // Backend error — surface to the user.
  if (msg.type === "error") {
    hideOverlay("loading-overlay");
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = msg.message;
    return;
  }

  // Non-fatal warning — show as a dismissable banner.
  if (msg.type === "warning") {
    BannerManager.warn(msg.message, { dismissable: true, autoClose: 8000 });
  }
};


// ── 4. UI PREFERENCES & RESIZE ─────────────────────────────────────────────

// Reads uiPrefs and applies scale + theme to the document.
// Called on boot, on pref change, and when Figma's theme class changes.
function _detectFigmaTheme() {
  const html = document.documentElement;
  const body = document.body;
  if (html.classList.contains("figma-dark") || body.classList.contains("figma-dark")) return "dark";
  if (html.classList.contains("figma-light") || body.classList.contains("figma-light")) return "light";
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyUiPrefs() {
  document.documentElement.style.setProperty("--ui-scale", uiPrefs.scale);
  document.body.style.zoom = uiPrefs.scale;
  const theme = uiPrefs.theme === "figma" ? _detectFigmaTheme() : uiPrefs.theme;
  document.body.setAttribute("data-ui-theme", theme);
}

// Mutates uiPrefs, re-applies, and persists to Figma client storage.
function updateUiPref(key, value) {
  uiPrefs[key] = value;
  applyUiPrefs();
  parent.postMessage({ pluginMessage: { type: "save-ui-prefs-meta", prefs: uiPrefs } }, "*");
}

function onMouseMove(e) {
  if (!isResizing) return;
  const w = Math.min(UI_DIMS.maxWidth,  Math.max(UI_DIMS.minWidth,  resizeStartW + (e.clientX - resizeOriginX)));
  const h = Math.min(UI_DIMS.maxHeight, Math.max(UI_DIMS.minHeight, resizeStartH + (e.clientY - resizeOriginY)));
  parent.postMessage({ pluginMessage: { type: "resize", width: w, height: h } }, "*");
}

function onMouseUp() {
  isResizing = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup",   onMouseUp);
}


// ── 5. TOOLTIP LOGIC ───────────────────────────────────────────────────────

const tooltipEl = document.getElementById("tooltip");

document.addEventListener("mouseenter", (e) => {
  if (!e.target || !e.target.closest) return;
  const target = e.target.closest("[data-tooltip]");
  if (!target) return;
  const text = target.getAttribute("data-tooltip");
  tooltipEl.textContent = text;
  tooltipEl.classList.add("active");
  const rect    = target.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  let top  = rect.top - tipRect.height - 8;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  if (top < 8) top = rect.bottom + 8;
  left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, left));
  tooltipEl.style.top  = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}, true);

document.addEventListener("mouseleave", (e) => {
  if (!e.target || !e.target.closest) return;
  if (e.target.closest("[data-tooltip]")) tooltipEl.classList.remove("active");
}, true);


// ── 6. EVENT WIRING ────────────────────────────────────────────────────────
//
// All DOM → handler bindings in one place.
// Format: element → what it does → which module handles it.

// Navigation & sheets
document.getElementById("btn-settings").onclick  = openSettings;
document.getElementById("settings-cancel").onclick = () => closeSettings(true);
document.getElementById("settings-done").onclick   = () => closeSettings(false);
document.querySelectorAll(".settings-tab").forEach((btn) =>
  btn.addEventListener("click", () => switchSettingsTab(btn.dataset.tab))
);
document.getElementById("btn-more").onclick     = () => showSheet("more-sheet");
document.getElementById("overlay").onclick      = hideSheets;
document.getElementById("close-more").onclick   = hideSheets;

// Primary actions
document.getElementById("btn-run").onclick    = () => handleSubmit("all");                   // ui-io.js
document.getElementById("btn-run-confirm").onclick = () => { hideOverlay("run-dialog-overlay"); proceedWithSync(); }; // ui-io.js
document.getElementById("btn-import").onclick = () => document.getElementById("file-input").click();
document.getElementById("btn-preview").onclick = () => {
  const result = variableMaker(translateConfig(appState));
  document.querySelectorAll(".preview-tab-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  document.querySelectorAll(".preview-panel").forEach((p, i) => p.classList.toggle("active", i === 0));
  renderPreviewPanel(result);
  showOverlay("preview-overlay");
};
document.getElementById("preview-close").onclick = () => {
  hideOverlay("preview-overlay");
  document.getElementById("preview-overlay").classList.remove("theme-light", "theme-dark", "theme-tonalscales");
  BannerManager.clear();
};

// Sidebar tabs — mutates activeSidebarTab, triggers relevant renderer
document.querySelectorAll(".sidebar-tab-btn").forEach((btn) => {
  btn.onclick = () => {
    activeSidebarTab = btn.dataset.tab;
    document.querySelectorAll(".sidebar-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeSidebarTab));
    if (activeSidebarTab === "color-groups") renderColorGroups();
    else if (activeSidebarTab === "roles-config") renderRoles();
  };
});

// Export (More sheet)
document.getElementById("opt-save-config").onclick  = () => { exportConfig();  hideSheets(); }; // ui-io.js
document.getElementById("opt-export-css").onclick   = () => { exportToCSS();   hideSheets(); }; // ui-io.js
document.getElementById("opt-export-csv").onclick   = () => { exportToCSV();   hideSheets(); }; // ui-io.js
document.getElementById("opt-export-scss").onclick  = () => { exportToSCSS();  hideSheets(); }; // ui-io.js

// Export (main tab shortcuts)
if (document.getElementById("btn-export-css"))  document.getElementById("btn-export-css").onclick  = exportToCSS;
if (document.getElementById("btn-export-csv"))  document.getElementById("btn-export-csv").onclick  = exportToCSV;
if (document.getElementById("btn-export-scss")) document.getElementById("btn-export-scss").onclick = exportToSCSS;
if (document.getElementById("btn-export-json")) document.getElementById("btn-export-json").onclick = exportConfig;

// Reset to defaults — replaces appState with demoConfig and re-renders everything
document.getElementById("opt-clear").onclick = () => {
  if (confirm("Are you sure you want to clear all data? This will reset the system to defaults.")) {
    appState = JSON.parse(JSON.stringify(demoConfig));
    ensureIds(appState);
    ensureVariations();
    setSavedState(null);
    renderColorGroups();
    renderRoles();
    syncInputsFromState();
    schedulePreview();
    hideSheets();
  }
};

// Preview panel tab switching (light / dark / tonal scale views)
document.getElementById("preview-tabs").onclick = (e) => {
  const btn = e.target.closest(".preview-tab-btn");
  if (!btn) return;
  const target  = btn.dataset.target;
  const overlay = document.getElementById("preview-overlay");
  overlay.classList.remove("theme-light", "theme-dark", "theme-tonalscales");
  if      (target === "preview-light") overlay.classList.add("theme-light");
  else if (target === "preview-dark")  overlay.classList.add("theme-dark");
  else                                 overlay.classList.add("theme-tonalscales");
  document.querySelectorAll(".preview-tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".preview-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(target).classList.add("active");
};

// UI scale and theme selects — mutates uiPrefs
document.getElementById("setting-ui-scale").onchange = (e) => updateUiPref("scale", parseFloat(e.target.value) || 1.0);
document.getElementById("setting-ui-theme").onchange = (e) => updateUiPref("theme", e.target.value);

// Resize handle — mutates isResizing and resize origin/start vars
document.getElementById("resize-handle").onmousedown = (e) => {
  isResizing    = true;
  resizeOriginX = e.clientX;
  resizeOriginY = e.clientY;
  resizeStartW  = window.innerWidth;
  resizeStartH  = window.innerHeight;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup",   onMouseUp);
};

// File input import (triggered by btn-import click above)
document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result); // ui-io.js
    reader.readAsText(file);
  }
  e.target.value = "";
};

// Drag-and-drop config import
window.addEventListener("dragenter", (e) => {
  if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
    e.preventDefault();
    showOverlay("drop-overlay");
  }
});
document.getElementById("drop-overlay").ondragover  = (e) => e.preventDefault();
document.getElementById("drop-overlay").ondragleave = () => hideOverlay("drop-overlay");
document.getElementById("drop-overlay").ondrop = (e) => {
  e.preventDefault();
  hideOverlay("drop-overlay");
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result); // ui-io.js
    reader.readAsText(file);
  }
};


// ── 7. BOOT ────────────────────────────────────────────────────────────────
//
// Initial render on startup. The "load-config" message (section 3) will
// re-run these if saved state exists in the Figma document.

renderColorGroups();
renderRoles();
syncInputsFromState();
syncUiSettingsInputs();
applyUiPrefs();

// Re-apply theme whenever Figma toggles its dark/light class (fires on both
// <html> and <body> depending on the Figma API version in use).
const _themeObserver = new MutationObserver(() => {
  if (uiPrefs.theme === "figma") applyUiPrefs();
});
_themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
_themeObserver.observe(document.body,            { attributes: true, attributeFilter: ["class"] });

// React to OS-level dark/light changes (fallback path in _detectFigmaTheme).
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (uiPrefs.theme === "figma") applyUiPrefs();
  });
}
