/**
 * ============================================================================
 * UI I/O & DATA MANAGEMENT
 * Logic for importing/exporting JSON and syncing with Figma.
 * ============================================================================
 */

function handleSubmit(scope = "all") {
  const dupError = validateState();
  if (dupError) {
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = dupError;
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
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creater", state: appState, scope: pendingScope, savedState: getSavedState() } }, "*");
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

  // Collections
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

  // Name preview
  const sampleColor = appState.colors[0] || { name: "Primary", shorthand: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shorthand: "tx" };
  const cLabel = shortC ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const stepLabel = appState.variations && appState.variations[2] ? (appState.useShorthandVariations && appState.variations[2].shorthand ? appState.variations[2].shorthand : appState.variations[2].name) : "3";
  const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("rd-name-preview");
  if (previewEl) previewEl.textContent = exName;

  // Renames section
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

  // Summary
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

  // Warnings
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

let _pendingImportData = null;
function handleImportJSON(json) {
  try {
    const imported = typeof json === "string" ? JSON.parse(json) : json;
    if (!imported.colors || !imported.roles) throw new Error("Invalid config format");

    _pendingImportData = imported;
    showOverlay("confirm-import-overlay");

    document.getElementById("btn-import-save").onclick = () => {
      exportConfig();
      finalizeImport();
    };
    document.getElementById("btn-import-now").onclick = () => {
      finalizeImport();
    };
  } catch (err) {
    BannerManager.error("Import failed: " + err.message);
  }
}

function finalizeImport() {
  if (!_pendingImportData) return;
  loadState(_pendingImportData); // merges, re-syncs ids/variations, marks clean
  _pendingImportData = null;
  hideOverlay("confirm-import-overlay");
  syncInputsFromState();
  renderColorGroups();
  renderRoles();
  BannerManager.success("Config imported successfully");
}

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

function showSystemBanners(errors, result = null) {
  if (!errors) return;

  const accessFails = [];
  if (result && result.colorTokens) {
    for (const mode of ["light", "dark"]) {
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

  if (critCount > 0) {
    detailNode.appendChild(
      _detailSection(
        "Critical Issues:",
        "text-red-400",
        errors.critical.map((e) => `${e.color}/${e.role}: ${e.error}`),
      ),
    );
  }
  if (warnCount > 0) {
    detailNode.appendChild(
      _detailSection(
        "Warnings:",
        "text-amber-400",
        errors.warnings.map((w) => `${w.color}/${w.role}: ${w.warning}`),
      ),
    );
  }
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
