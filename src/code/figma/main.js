/**
 * FIGMA COLOR SYSTEM GENERATOR
 * Organization:
 * 1. UI Initialization
 * 2. Message Router
 * 3. Config Translator  (appState → reference engine format)
 * 4. Export Formatters  (CSV / CSS / JSON / SCSS)
 * 5. Figma Variable API (CRUD – _color_Ramps + tokens collections)
 * 6. Color Ramp Maker   (Linear / Uniform / Natural / Expressive / Symmetric)
 * 7. Color System Generator (variableMaker – ramps + semantic tokens)
 * 8. Color Math Utilities  (WCAG-correct conversions from Utils.js)
 */

// 1. UI INITIALIZATION — load saved size before showing UI to avoid resize flicker.
(async () => {
  const UI_DEFAULT_WIDTH = 400;
  const UI_DEFAULT_HEIGHT = 720;

  // Restore saved window size (falls back to defaults if none saved yet).
  let savedUiSize = { width: UI_DEFAULT_WIDTH, height: UI_DEFAULT_HEIGHT };
  try {
    const saved = await figma.clientStorage.getAsync("uiPrefs");
    if (saved && saved.width && saved.height) savedUiSize = saved;
  } catch (e) {
    console.warn("Failed to load uiPrefs:", e);
  }
  figma.showUI(__html__, { width: savedUiSize.width, height: savedUiSize.height, themeColors: true });

  // Capability probe: try adding a second mode to a temp collection.
  // This is the only reliable way to detect free-plan restrictions without
  // exposing plan details (Figma has no plan-info API for plugins).
  const capabilities = { multiMode: true };
  let probeCol = null;
  try {
    probeCol = figma.variables.createVariableCollection("__ctm316_probe__");
    probeCol.addMode("probe2");
  } catch (e) {
    console.warn("Probe failed:", e);
    capabilities.multiMode = false;
  } finally {
    if (probeCol)
      try {
        probeCol.remove();
      } catch (e) {
        console.warn("Failed to remove probe collection:", e);
      }
  }
  figma.ui.postMessage({ type: "capabilities", capabilities });

  // Send saved UI meta-prefs (scale, theme) to UI thread
  try {
    const meta = await figma.clientStorage.getAsync("uiPrefsMeta");
    if (meta) figma.ui.postMessage({ type: "load-ui-prefs-meta", prefs: meta });
  } catch (e) {
    console.warn("Failed to load uiPrefsMeta:", e);
  }

  // Load saved config — primary: document plugin data; fallback: old STRING variable (one-time migration)
  try {
    let savedConfigStr = figma.root.getPluginData("ctm316_state");

    if (!savedConfigStr) {
      // One-time migration from the old __ctm316_config__ STRING variable approach
      const vars = await figma.variables.getLocalVariablesAsync("STRING");
      const cfgVar = vars.find((v) => v.name === "__ctm316_config__");
      if (cfgVar) {
        const modeId = Object.keys(cfgVar.valuesByMode)[0];
        savedConfigStr = cfgVar.valuesByMode[modeId] || null;
        if (savedConfigStr) {
          // Migrate to new storage and remove the old variable
          figma.root.setPluginData("ctm316_state", savedConfigStr);
          try {
            cfgVar.remove();
          } catch (e) {
            console.warn("Could not remove legacy config variable:", e);
          }
        }
      }
    }

    if (savedConfigStr) {
      figma.ui.postMessage({ type: "load-config", state: JSON.parse(savedConfigStr) });
    }
  } catch (e) {
    console.warn("Failed to load saved config:", e);
  }
})();

// 2. MESSAGE ROUTER
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case "run-creater": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        await VariableManager.sync(result, config, msg.scope || "all", msg.state, msg.savedState || null);
        break;
      }

      case "check-collections": {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const names = [msg.colorName, msg.contextualName].filter(Boolean);
        const existing = names.filter((n) => cols.some((c) => c.name === n));
        const renames = msg.savedState && msg.state ? buildVariableRenameMap(msg.savedState, msg.state) : { ramps: {}, contextual: {}, summary: { rampCount: 0, contextualCount: 0, changes: [] } };
        figma.ui.postMessage({ type: "collection-check-result", existing, renames });
        break;
      }

      case "resize": {
        const w = Math.max(400, msg.width);
        const h = msg.height;
        figma.ui.resize(w, h);
        figma.clientStorage.setAsync("uiPrefs", { width: w, height: h }).catch(() => {});
        break;
      }

      case "save-ui-prefs-meta":
        figma.clientStorage.setAsync("uiPrefsMeta", msg.prefs).catch(() => {});
        break;

      case "request-processed-data": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        let content = "";
        if (msg.exportType === "json") content = JSON.stringify({ config, tonalScales: result.tonalScales, colorTokens: result.colorTokens, errors: result.errors }, null, 2);
        else if (msg.exportType === "csv") content = ExportFormatter.toCSV(result, config);
        else if (msg.exportType === "css") content = ExportFormatter.toCSS(result, config);
        else if (msg.exportType === "scss") content = generateScss(result, config);
        figma.ui.postMessage({ type: "processed-data-response", content, exportType: msg.exportType });
        break;
      }

      case "cancel":
        figma.closePlugin();
        break;
    }
  } catch (err) {
    console.error("Plugin Error:", err);
    figma.ui.postMessage({ type: "error", message: err.message || "Unknown error" });
  }
};
