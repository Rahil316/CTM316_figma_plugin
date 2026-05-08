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

// 1. UI INITIALIZATION
figma.showUI(__html__, { width: 424, height: 720, themeColors: true });

// Load saved config from Figma on startup
(async () => {
  try {
    const vars = await figma.variables.getLocalVariablesAsync("STRING");
    const cfgVar = vars.find((v) => v.name === "__ctm316_config__");
    if (cfgVar) {
      const modeId = Object.keys(cfgVar.valuesByMode)[0];
      const savedConfigStr = cfgVar.valuesByMode[modeId];
      if (typeof savedConfigStr === "string") {
        figma.ui.postMessage({ type: "load-config", state: JSON.parse(savedConfigStr) });
      }
    }
  } catch (_) {}
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
        const renames = (msg.savedState && msg.state)
          ? buildVariableRenameMap(msg.savedState, msg.state)
          : { ramps: {}, contextual: {}, summary: { rampCount: 0, contextualCount: 0, changes: [] } };
        figma.ui.postMessage({ type: "collection-check-result", existing, renames });
        break;
      }

      case "resize":
        figma.ui.resize(msg.width, msg.height);
        break;

      case "request-processed-data": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        let content = "";
        if (msg.exportType === "json") content = JSON.stringify({ config, colorRamps: result.colorRamps, colorTokens: result.colorTokens, errors: result.errors }, null, 2);
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
