/**
 * ============================================================================
 * UI ORCHESTRATOR
 * Main entry point for the plugin UI. Manages high-level rendering and
 * communication between sub-modules.
 * ============================================================================
 */

// 1. CONSTANTS & SHARED STATE
const UI_MODES = {
  plugin: ["tonalScalesBased", "adaptiveEngine"],
  grouping: ["color", "role"],
  spread: ["steps", "contrast"],
  selection: ["By Contrast", "By Index", "Manual"],
};

let pendingScope = "all";
let lastCollectionCheckResult = [];
let lastRenameData = null;

// 2. CORE RENDERERS

// Attaches drag-and-drop reorder behaviour to a card element.
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
        setIdx: (v) => {
          _colorDragSrcIdx = v;
        },
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
        setIdx: (v) => {
          _roleDragSrcIdx = v;
        },
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

// 3. MESSAGE HANDLING
window.onmessage = (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  if (msg.type === "collection-check-result") {
    lastCollectionCheckResult = msg.existing || [];
    lastRenameData = msg.renames || null;
    setRunScope(pendingScope || "all");
    showOverlay("run-dialog-overlay");
    return;
  }

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

  if (msg.type === "processed-data-response") {
    const { content, exportType } = msg;
    const mimeMap = { json: "application/json", css: "text/css", csv: "text/csv", scss: "text/plain" };
    const extMap = { json: "json", css: "css", csv: "csv", scss: "scss" };
    const typeLabel = { json: "tokens", css: "variables", csv: "token_list", scss: "tokens" };
    triggerDownload(content, exportFileName(typeLabel[exportType] || exportType, extMap[exportType] || exportType), mimeMap[exportType] || "text/plain");
    return;
  }

  if (msg.type === "finish") {
    // Snapshot current state as the new baseline for rename detection
    setSavedState(appState);
    markClean();
    hideOverlay("loading-overlay");
    showOverlay("success-overlay");
    const resultsEl = document.getElementById("success-results");
    resultsEl.innerHTML = "";
    const t = msg.tally;
    [["Created", t.created, "text-white"], ["Updated", t.updated, "text-white"], ...(t.renamed > 0 ? [["Renamed", t.renamed, "text-blue-300"]] : []), ["Failed", t.failed, "text-red-400"]].forEach(([label, count, cls]) => {
      resultsEl.appendChild(el("p", { class: "text-sm" }, [`${label}: `, el("span", { class: `${cls} font-bold` }, String(count))]));
    });
    showSystemBanners(msg.errors || null, msg.result || null);
  }

  if (msg.type === "error") {
    hideOverlay("loading-overlay");
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = msg.message;
  }

  if (msg.type === "warning") {
    BannerManager.warn(msg.message, { dismissable: true, autoClose: 8000 });
  }

  if (msg.type === "load-ui-prefs-meta") {
    if (msg.prefs.scale !== undefined) uiPrefs.scale = msg.prefs.scale;
    if (msg.prefs.theme !== undefined) uiPrefs.theme = msg.prefs.theme;
    applyUiPrefs();
    syncUiSettingsInputs();
  }
};

// 4. UI PREFERENCES & RESIZE

// Detects Figma's current theme. Checks both <html> and <body> since Figma
// applies figma-dark to the root element in some versions. Falls back to the
// OS preference (via matchMedia) when neither class is present.
function _detectFigmaTheme() {
  const html = document.documentElement;
  const body = document.body;
  if (html.classList.contains("figma-dark") || body.classList.contains("figma-dark")) return "dark";
  if (html.classList.contains("figma-light") || body.classList.contains("figma-light")) return "light";
  // matchMedia fallback: covers the case where Figma hasn't added its class yet
  // or where the plugin is loaded in a browser context for testing.
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyUiPrefs() {
  document.documentElement.style.setProperty("--ui-scale", uiPrefs.scale);
  document.body.style.zoom = uiPrefs.scale;
  const theme = uiPrefs.theme === "figma" ? _detectFigmaTheme() : uiPrefs.theme;
  document.body.setAttribute("data-ui-theme", theme);
}

function updateUiPref(key, value) {
  uiPrefs[key] = value;
  applyUiPrefs();
  parent.postMessage({ pluginMessage: { type: "save-ui-prefs-meta", prefs: uiPrefs } }, "*");
}

let isResizing = false;
let resizeOriginX = 0,
  resizeOriginY = 0;
let resizeStartW = 0,
  resizeStartH = 0;

document.getElementById("resize-handle").onmousedown = (e) => {
  isResizing = true;
  resizeOriginX = e.clientX;
  resizeOriginY = e.clientY;
  resizeStartW = window.innerWidth;
  resizeStartH = window.innerHeight;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

function onMouseMove(e) {
  if (!isResizing) return;
  const w = Math.min(UI_DIMS.maxWidth, Math.max(UI_DIMS.minWidth, resizeStartW + (e.clientX - resizeOriginX)));
  const h = Math.min(UI_DIMS.maxHeight, Math.max(UI_DIMS.minHeight, resizeStartH + (e.clientY - resizeOriginY)));
  parent.postMessage({ pluginMessage: { type: "resize", width: w, height: h } }, "*");
}

function onMouseUp() {
  isResizing = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

// 5. TOOLTIP LOGIC
const tooltipEl = document.getElementById("tooltip");
document.addEventListener(
  "mouseenter",
  (e) => {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest("[data-tooltip]");
    if (!target) return;

    const text = target.getAttribute("data-tooltip");
    tooltipEl.textContent = text;
    tooltipEl.classList.add("active");

    const rect = target.getBoundingClientRect();
    const tipRect = tooltipEl.getBoundingClientRect();

    let top = rect.top - tipRect.height - 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (top < 8) top = rect.bottom + 8;
    left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, left));

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  },
  true,
);

document.addEventListener(
  "mouseleave",
  (e) => {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest("[data-tooltip]");
    if (target) tooltipEl.classList.remove("active");
  },
  true,
);

// 6. EVENT LISTENERS & DELEGATION
document.getElementById("btn-settings").onclick = () => showSheet("settings-sheet");
document.getElementById("btn-more").onclick = () => showSheet("more-sheet");
document.getElementById("overlay").onclick = () => {
  if (document.getElementById("settings-sheet").classList.contains("open")) {
    updateSettingsFromInputs();
  }
  hideSheets();
};
document.getElementById("close-settings").onclick = () => {
  updateSettingsFromInputs();
  hideSheets();
};
document.getElementById("close-more").onclick = hideSheets;
document.getElementById("btn-run").onclick = () => handleSubmit("all");
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

document.getElementById("btn-run-confirm").onclick = () => {
  hideOverlay("run-dialog-overlay");
  proceedWithSync();
};

// Sidebar Tab Logic
const sidebarTabs = document.querySelectorAll(".sidebar-tab-btn");
sidebarTabs.forEach((btn) => {
  btn.onclick = () => {
    activeSidebarTab = btn.dataset.tab;
    sidebarTabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === activeSidebarTab));
    if (activeSidebarTab === "color-groups") renderColorGroups();
    else if (activeSidebarTab === "roles-config") renderRoles();
  };
});

// Export Listeners (from More menu)
document.getElementById("opt-save-config").onclick = () => {
  exportConfig();
  hideSheets();
};
document.getElementById("opt-export-css").onclick = () => {
  exportToCSS();
  hideSheets();
};
document.getElementById("opt-export-csv").onclick = () => {
  exportToCSV();
  hideSheets();
};
document.getElementById("opt-export-scss").onclick = () => {
  exportToSCSS();
  hideSheets();
};

// Export Listeners (from Main Tab)
if (document.getElementById("btn-export-css")) document.getElementById("btn-export-css").onclick = exportToCSS;
if (document.getElementById("btn-export-csv")) document.getElementById("btn-export-csv").onclick = exportToCSV;
if (document.getElementById("btn-export-scss")) document.getElementById("btn-export-scss").onclick = exportToSCSS;
if (document.getElementById("btn-export-json")) document.getElementById("btn-export-json").onclick = exportConfig;
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

// Preview tab switching
document.getElementById("preview-tabs").onclick = (e) => {
  const btn = e.target.closest(".preview-tab-btn");
  if (!btn) return;
  const target = btn.dataset.target;
  const overlay = document.getElementById("preview-overlay");
  overlay.classList.remove("theme-light", "theme-dark", "theme-tonalscales");
  if (target === "preview-light") overlay.classList.add("theme-light");
  else if (target === "preview-dark") overlay.classList.add("theme-dark");
  else overlay.classList.add("theme-tonalscales");
  document.querySelectorAll(".preview-tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".preview-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(target).classList.add("active");
};

// UI Scale/Theme Selects
document.getElementById("setting-ui-scale").onchange = (e) => {
  updateUiPref("scale", parseFloat(e.target.value) || 1.0);
};
document.getElementById("setting-ui-theme").onchange = (e) => {
  updateUiPref("theme", e.target.value);
};

// Import via File Input
document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
  e.target.value = "";
};

// Drag & Drop Import
window.addEventListener("dragenter", (e) => {
  if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
    e.preventDefault();
    showOverlay("drop-overlay");
  }
});
document.getElementById("drop-overlay").ondragover = (e) => e.preventDefault();
document.getElementById("drop-overlay").ondragleave = () => hideOverlay("drop-overlay");
document.getElementById("drop-overlay").ondrop = (e) => {
  e.preventDefault();
  hideOverlay("drop-overlay");
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
};

// 7. INITIAL BOOT
renderColorGroups();
renderRoles();
syncInputsFromState();
syncUiSettingsInputs();
applyUiPrefs();

// Re-apply whenever Figma toggles its dark/light class — watch both <html> and <body>
// because Figma applies the class to the root element in some plugin API versions.
const _themeObserver = new MutationObserver(() => {
  if (uiPrefs.theme === "figma") applyUiPrefs();
});
_themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
_themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

// Also react to system-level dark/light changes (used as fallback in _detectFigmaTheme).
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (uiPrefs.theme === "figma") applyUiPrefs();
  });
}
