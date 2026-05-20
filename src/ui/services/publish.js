/**
 * ============================================================================
 * CTM316 SERVICE: PUBLISH
 * Figma sync dispatch, dialog rendering, import/export, post-sync reporting.
 * ============================================================================
 */

// ── DIALOG RENDERERS ─────────────────────────────────────────────────────────
// Each function builds the full content of its overlay slot.
// Call before showOverlay() so the slot is populated when it becomes visible.

function renderLoadingOverlay() {
  const slot = document.getElementById("loading-overlay");
  if (!slot) return;
  slot.innerHTML = "";
  slot.appendChild(el("div", { class: "w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" }));
  slot.appendChild(el("p", { class: "text-xl font-bold text-[var(--text-primary)]" }, "Creating Variables..."));
  slot.appendChild(el("p", { class: "text-[var(--text-muted)]" }, "Generating color tokens and thematic variations in Figma."));
}

function renderSuccessDialog(tally) {
  const slot = document.getElementById("success-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const iconEl = el("div", { class: "w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500" });
  iconEl.innerHTML = Icons.Check;

  const resultsEl = el("div", { id: "success-results", class: "text-[var(--text-muted)] space-y-1" });
  if (tally) {
    [["Created", tally.created, "text-white"], ["Updated", tally.updated, "text-white"], ...(tally.renamed > 0 ? [["Renamed", tally.renamed, "text-blue-300"]] : []), ["Failed", tally.failed, "text-red-400"]].forEach(([label, count, cls]) => {
      resultsEl.appendChild(el("p", { class: "text-sm" }, [`${label}: `, el("span", { class: `${cls} font-bold` }, String(count))]));
    });
  }

  const inner = el("div", { class: "flex-1 flex items-center justify-center p-8 text-center flex-col gap-4" }, [
    iconEl,
    el("h2", { class: "text-2xl font-bold text-[var(--text-primary)]" }, "Success!"),
    resultsEl,
    el("button", { onclick: () => hideOverlay("success-overlay"), class: "mt-4 h-[36px] px-6 text-[12px] font-semibold rounded-[8px] bg-[var(--accent)] border border-[var(--accent)] text-white hover:opacity-90 cursor-pointer transition-all" }, "Back to Editor"),
  ]);
  slot.appendChild(inner);
}

function renderErrorDialog(message) {
  const slot = document.getElementById("error-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const iconEl = el("div", { class: "w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500" });
  iconEl.innerHTML = Icons.Close;

  slot.appendChild(iconEl);
  slot.appendChild(el("h2", { class: "text-2xl font-bold text-[var(--text-primary)]" }, "Error"));
  slot.appendChild(el("p", { id: "error-message", class: "text-[var(--danger)]" }, message || ""));
  slot.appendChild(el("button", { onclick: () => hideOverlay("error-overlay"), class: "mt-4 h-[36px] px-6 text-[12px] font-medium rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all" }, "Dismiss"));
}

function renderRunDialog() {
  const slot = document.getElementById("run-dialog-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const header = el("div", { class: "px-4 py-3 flex items-center justify-between border-b border-[var(--border)]" }, [
    el("h2", { class: "text-[17px] font-bold text-[var(--text-primary)]" }, "Apply to Figma"),
    el("button", { onclick: () => hideOverlay("run-dialog-overlay"), class: "h-[36px] px-3 text-[12px] font-medium rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all" }, "Cancel"),
  ]);

  const body = el("div", { class: "flex-1 overflow-y-auto p-4 space-y-5" }, [
    // Scope
    el("div", { id: "rd-scope-section", class: "space-y-2" }, [
      el("h3", { class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px]" }, "WHAT TO UPDATE"),
      el("div", { class: "flex gap-2" }, [
        el("button", { id: "rd-scope-all", class: "seg-btn", onclick: () => setRunScope("all") }, "Everything"),
        el("button", { id: "rd-scope-groups", class: "seg-btn", onclick: () => setRunScope("groups") }, "Scale Only"),
        el("button", { id: "rd-scope-roles", class: "seg-btn", onclick: () => setRunScope("roles") }, "Roles Only"),
      ]),
    ]),

    // Output options
    el("div", { class: "space-y-2" }, [
      el("h3", { class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px]" }, "OUTPUT OPTIONS"),
      el("div", { id: "embed-colors-directly", class: "items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [
          el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Embed Colors Directly"),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "Write hex values into tokens instead of referencing the Tonal Scales"),
        ]),
        el("button", { id: "rd-toggle-embedDirectly", class: "toggle-pill", onclick: () => { toggleBoolSetting("embedDirectly"); refreshRunDialog(); } }),
      ]),
      el("div", { class: "space-y-1" }, [
        el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, "Variable Structure"),
        el("div", { class: "flex gap-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-0.5" }, [
          el("button", { id: "rd-seg-group-color", class: "seg-btn flex-1", onclick: () => { setTokenGrouping(0); refreshRunDialog(); } }, "Color-first color/role/step"),
          el("button", { id: "rd-seg-group-role", class: "seg-btn flex-1", onclick: () => { setTokenGrouping(1); refreshRunDialog(); } }, "Role-first role/color/step"),
        ]),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Colors"), el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. primary → pr")]),
        el("button", { id: "rd-toggle-useShorthandColors", class: "toggle-pill", onclick: () => { toggleBoolSetting("useShorthandColors"); refreshRunDialog(); } }),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Roles"), el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. Text → tx")]),
        el("button", { id: "rd-toggle-useShorthandRoles", class: "toggle-pill", onclick: () => { toggleBoolSetting("useShorthandRoles"); refreshRunDialog(); } }),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Variations"), el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. Darker → dk")]),
        el("button", { id: "rd-toggle-useShorthandVariations", class: "toggle-pill", onclick: () => { toggleBoolSetting("useShorthandVariations"); refreshRunDialog(); } }),
      ]),
      el("div", { class: "bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 py-2" }, [
        el("p", { class: "text-[11px] text-[var(--text-muted)]" }, "Example variable name:"),
        el("p", { id: "rd-name-preview", class: "text-[12px] font-mono text-[var(--accent)] mt-0.5" }),
      ]),
    ]),

    // Collections
    el("div", { class: "space-y-2" }, [
      el("h3", { class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px]" }, "COLLECTIONS"),
      el("div", { id: "rd-collections", class: "space-y-1.5" }),
    ]),

    // Renames
    el("div", { id: "rd-renames", class: "hidden space-y-2" }, [
      el("h3", { class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px]" }, "VARIABLES TO RENAME"),
      el("div", { id: "rd-renames-list", class: "space-y-1.5" }),
      el("p", { class: "text-[11px] text-[var(--text-muted)] px-1 leading-relaxed" }, "Existing variables matching the previous names will be renamed in place — no variables are deleted or recreated."),
    ]),

    // Summary
    el("div", { class: "space-y-2" }, [
      el("h3", { class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px]" }, "SUMMARY"),
      el("div", { id: "rd-summary", class: "space-y-1" }),
    ]),

    // Warning
    el("div", { id: "rd-warnings", class: "hidden bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-[8px] p-3 space-y-1" }, [
      el("p", { class: "text-[12px] font-bold text-[var(--warning)]" }, "⚠ Existing Collections Detected"),
      el("p", { id: "rd-warning-text", class: "text-[11px] text-[var(--text-muted)]" }),
    ]),
  ]);

  const footer = el("div", { class: "p-4 border-t border-[var(--border)]" }, [
    el("button", { id: "btn-run-confirm", class: "w-full h-[40px] px-4 text-[13px] font-semibold rounded-[8px] bg-[var(--accent)] border border-[var(--accent)] text-white hover:opacity-90 cursor-pointer transition-all" }, "Apply to Figma"),
  ]);

  slot.appendChild(header);
  slot.appendChild(body);
  slot.appendChild(footer);
}

function _buildImportWarningIcon() {
  const warnSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  warnSvg.setAttribute("width", "40"); warnSvg.setAttribute("height", "40");
  warnSvg.setAttribute("viewBox", "0 0 24 24"); warnSvg.setAttribute("fill", "none");
  warnSvg.setAttribute("stroke", "currentColor"); warnSvg.setAttribute("stroke-width", "2.5");
  warnSvg.innerHTML = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
  const wrap = el("div", { class: "w-20 h-20 bg-[var(--warning)]/10 rounded-full flex items-center justify-center text-[var(--warning)]" });
  wrap.appendChild(warnSvg);
  return wrap;
}

// ── FIGMA SYNC ────────────────────────────────────────────────────────────────

function handleSubmit(scope = "all") {
  const dupError = validateState();
  if (dupError) {
    renderErrorDialog(dupError);
    showOverlay("error-overlay");
    return;
  }
  pendingScope = scope;
  parent.postMessage(
    {
      pluginMessage: {
        type: "check-collections",
        colorName: appState.tonalScaleCollectionName || "_scale",
        contextualName: appState.tokenCollectionName || "contextual",
        state: appState,
        savedState: getSavedState(),
      },
    },
    "*",
  );
}

function proceedWithSync() {
  renderLoadingOverlay();
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creator", state: appState, scope: pendingScope, savedState: getSavedState() } }, "*");
  }, 50);
}

function setRunScope(scope) {
  pendingScope = scope;
  ["all", "groups", "roles"].forEach((s) => {
    const btn = document.getElementById("rd-scope-" + s);
    if (btn) btn.classList.toggle("active", s === scope);
  });
  refreshRunDialog();
}

function refreshRunDialog() {
  const existing = lastCollectionCheckResult;
  const colorName = appState.tonalScaleCollectionName || "_scale";
  const ctxName = appState.tokenCollectionName || "contextual";
  const isDirect = appState.pluginMode === "adaptiveEngine";
  const skipRamps = appState.embedDirectly || isDirect;
  const tg = appState.variableStructure || "color";
  const shortC = appState.useShorthandColors;
  const shortR = appState.useShorthandRoles;
  const scope = pendingScope || "all";

  syncOutputToggles();

  const scopeSection = document.getElementById("rd-scope-section");
  if (scopeSection) scopeSection.classList.toggle("hidden", isDirect);
  const skipRampsRow = document.getElementById("embed-colors-directly");
  if (skipRampsRow) skipRampsRow.classList.toggle("hidden", isDirect);

  const colsEl = document.getElementById("rd-collections");
  if (colsEl) {
    colsEl.innerHTML = "";
    const entries = [];
    if (!skipRamps && scope !== "roles") {
      const exists = existing.includes(colorName);
      entries.push([colorName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (scope !== "groups") {
      const exists = existing.includes(ctxName);
      entries.push([ctxName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (appState.includeGlobalColors) {
      const constName = appState.globalColorsCollectionName || "_constants";
      const exists = existing.includes(constName);
      entries.push([constName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (entries.length) {
      entries.forEach(([name, label, isExisting]) => {
        colsEl.appendChild(
          el("div", { class: "flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2" }, [
            el("span", { class: "text-[13px] text-[var(--text-primary)] font-mono" }, name),
            el("span", { class: `text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}` }, label),
          ]),
        );
      });
    } else {
      colsEl.appendChild(el("p", { class: "text-[12px] text-[var(--text-muted)] px-1" }, "No collections will be modified for this scope."));
    }
  }

  const sampleColor = appState.colors[0] || { name: "Primary", shorthand: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shorthand: "tx" };
  const cLabel = shortC ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const stepLabel = appState.variations && appState.variations[2] ? (appState.useShorthandVariations && appState.variations[2].shorthand ? appState.variations[2].shorthand : appState.variations[2].name) : "3";
  const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("rd-name-preview");
  if (previewEl) previewEl.textContent = exName;

  const renameEl = document.getElementById("rd-renames");
  const renameListEl = document.getElementById("rd-renames-list");
  if (renameEl && renameListEl) {
    const summary = lastRenameData && lastRenameData.summary;
    const rampCount = isDirect ? 0 : (summary && summary.rampCount) || 0;
    const ctxCount = (summary && summary.contextualCount) || 0;
    const changes = ((summary && summary.changes) || []).filter((ch) => (isDirect ? ch.type !== "stepNames" : true));

    if (rampCount + ctxCount > 0 && changes.length > 0) {
      renameEl.classList.remove("hidden");
      renameListEl.innerHTML = "";
      const typeLabels = { color: "Color", role: "Role", stepNames: "Scale Steps", roleStepNames: "Variation Levels", grouping: "Grouping" };
      changes.forEach((ch) => {
        renameListEl.appendChild(
          el("div", { class: "flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0" }, [
            el("span", { class: "text-[11px] text-[var(--text-muted)] w-[68px] shrink-0" }, typeLabels[ch.type] || ch.type),
            el("span", { class: "text-[11px] font-mono text-[var(--text-primary)] truncate flex-1" }, ch.from),
            el("span", { class: "text-[11px] text-[var(--accent)] shrink-0 px-0.5" }, "→"),
            el("span", { class: "text-[11px] font-mono text-[var(--accent)] truncate flex-1" }, ch.to),
          ]),
        );
      });
      const parts = [rampCount > 0 ? `${rampCount} scale var${rampCount > 1 ? "s" : ""}` : "", ctxCount > 0 ? `${ctxCount} token var${ctxCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
      renameListEl.appendChild(el("div", { class: "flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5" }, [el("span", { class: "inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" }), el("span", {}, `${parts} will be renamed`)]));
    } else {
      renameEl.classList.add("hidden");
    }
  }

  const sumEl = document.getElementById("rd-summary");
  if (sumEl) {
    sumEl.innerHTML = "";
    const colorList = appState.colors.map((c) => `${c.name}${c.shorthand ? ` (${c.shorthand})` : ""}`).join(", ");
    const roleList = appState.roles.map((r) => `${r.name}${r.shorthand ? ` (${r.shorthand})` : ""}`).join(", ");
    const rows = [
      ["Project Name", appState.name || "—"],
      [`Colors x${appState.colors.length}`, colorList],
      [`Roles x${appState.roles.length}`, roleList],
      ["Mode", isDirect ? "Adaptive Engine" : "Tonal Scale Based"],
      ...(isDirect
        ? []
        : [
            ["Base Selection", appState.baseSelection || "By Contrast"],
            ...(appState.baseSelection !== "Manual" ? [["Spread Unit", (appState.spreadUnit || "steps") === "contrast" ? "Contrast Gap" : "Steps"]] : []),
            ["Color Steps", String(appState.scaleLength || 25)],
            ["Scale Algorithm", appState.scaleAlgorithm || "Natural"],
          ]),
    ];
    rows.forEach(([label, value]) => {
      sumEl.appendChild(
        el("div", { class: "flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0" }, [el("span", { class: "text-[var(--text-muted)] shrink-0" }, label), el("span", { class: "text-[var(--text-primary)] text-right text-[11px]" }, value)]),
      );
    });
  }

  const warnEl = document.getElementById("rd-warnings");
  if (warnEl) {
    const relevant = existing.filter((n) => (n === colorName && !skipRamps && scope !== "roles") || (n === ctxName && scope !== "groups"));
    if (relevant.length > 0) {
      warnEl.classList.remove("hidden");
      document.getElementById("rd-warning-text").textContent = `${relevant.map((n) => `"${n}"`).join(" and ")} already exist. Variables will be added or updated — nothing deleted.`;
    } else {
      warnEl.classList.add("hidden");
    }
  }
}

// ── IMPORT ────────────────────────────────────────────────────────────────────

let _pendingImportData = null;

function handleImportJSON(json) {
  try {
    const imported = typeof json === "string" ? JSON.parse(json) : json;
    if (!imported.colors || !imported.roles) throw new Error("Invalid config format");
    _pendingImportData = imported;
    createDialogue("confirm-import-overlay", {
      layout:  "sheet",
      icon:    _buildImportWarningIcon(),
      title:   "Replace Configuration?",
      body:    "The current configuration is different from the default. Importing a new file will replace all existing palettes and color roles.",
      buttons: [
        { label: "Save Current & Import", variant: "primary",    action: () => { exportConfig(); finalizeImport(); } },
        { label: "Import & Replace",      variant: "secondary",  action: () => { finalizeImport(); } },
        { label: "Cancel",                variant: "ghost" },
      ],
    });
  } catch (err) {
    BannerManager.error("Import failed: " + err.message);
  }
}

function finalizeImport() {
  if (!_pendingImportData) return;
  loadState(_pendingImportData);
  _pendingImportData = null;
  syncInputsFromState();
  renderColorGroups();
  renderRoles();
  BannerManager.success("Config imported successfully");
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

function exportConfig() {
  const data = JSON.stringify(appState, null, 2);
  triggerDownload(data, exportFileName("config", "json"), "application/json");
}

function exportToCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "css" } }, "*");
}

function exportToCSV() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "csv" } }, "*");
}

function exportToSCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "scss" } }, "*");
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFileName(type, ext) {
  const name = (appState.name || "design_system").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  return `${name}_${type}_${date}_${time}.${ext}`;
}

// ── POST-SYNC REPORTER ────────────────────────────────────────────────────────

function showSystemBanners(errors, result = null) {
  if (!errors) return;

  const accessFails = [];
  if (result && result.colorTokens) {
    for (const mode of Object.keys(result.colorTokens)) {
      const modeTokens = result.colorTokens[mode];
      if (!modeTokens) continue;
      for (const clrName in modeTokens) {
        for (const roleId in modeTokens[clrName]) {
          const roleTokens = modeTokens[clrName][roleId];
          for (const varKey in roleTokens) {
            const tkn = roleTokens[varKey];
            if (tkn.contrast && tkn.contrast.rating === "Fail") {
              accessFails.push(`${clrName}/${tkn.role} (${mode})`);
            }
          }
        }
      }
    }
  }

  const critCount = errors.critical ? errors.critical.length : 0;
  const warnCount = errors.warnings ? errors.warnings.length : 0;
  const auditCount = accessFails.length;

  if (critCount === 0 && warnCount === 0 && auditCount === 0) {
    BannerManager.clear();
    return;
  }

  const detailNode = document.createElement("div");
  detailNode.className = "flex flex-col gap-1 mt-2 border-t border-white/10 pt-2";

  function _detailSection(headerText, headerClass, items) {
    const section = document.createElement("div");
    section.className = "mb-2";
    const header = document.createElement("p");
    header.className = `font-bold ${headerClass} mb-1`;
    header.textContent = headerText;
    section.appendChild(header);
    items.forEach((text) => {
      const row = document.createElement("div");
      row.className = "ml-2 text-[10px] opacity-90";
      row.textContent = `• ${text}`;
      section.appendChild(row);
    });
    return section;
  }

  if (critCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Critical Issues:",
        "text-red-400",
        errors.critical.map((e) => `${e.color}/${e.role}: ${e.error}`),
      ),
    );
  if (warnCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Warnings:",
        "text-amber-400",
        errors.warnings.map((w) => `${w.color}/${w.role}: ${w.warning}`),
      ),
    );

  if (auditCount > 0) {
    const section = document.createElement("div");
    const header = document.createElement("p");
    header.className = "font-bold text-blue-400 mb-1";
    header.textContent = "Accessibility Concerns:";
    section.appendChild(header);
    const body = document.createElement("div");
    body.className = "ml-2 text-[10px] opacity-90";
    const shown = accessFails.slice(0, 8);
    shown.forEach((text, i) => {
      if (i > 0) body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(text));
    });
    if (auditCount > 8) {
      body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(`...and ${auditCount - 8} more`));
    }
    section.appendChild(body);
    detailNode.appendChild(section);
  }

  BannerManager.show({
    id: "system-status-banner",
    type: critCount > 0 ? "error" : warnCount > 0 ? "warning" : "info",
    title: critCount > 0 ? "Color System Errors" : "System Audit Results",
    message: `${critCount > 0 ? `${critCount} Critical · ` : ""}${warnCount} Warnings · ${auditCount} Access concerns detected.`,
    detailNode,
    dismissable: true,
  });
}
