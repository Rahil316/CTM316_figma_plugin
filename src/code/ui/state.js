/**
 * ============================================================================
 * CTM316 STATE MANAGEMENT (The Vanilla Store)
 * Centralized source of truth for the plugin state.
 * ============================================================================
 */

/**
 * 0. IDENTITY GENERATION
 */
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function ensureIds(state) {
  if (state.colors)
    state.colors.forEach((c) => {
      if (!c._id) c._id = generateId();
    });
  if (state.roles)
    state.roles.forEach((r) => {
      if (!r._id) r._id = generateId();
    });
  return state;
}

/**
 * 1. DEFAULT CONFIGURATION
 */
const demoConfig = {
  name: "CTM316",
  tonalScaleCollectionName: "_scale",
  tokenCollectionName: "contextual",
  embedDirectly: false,
  includeGlobalColors: false,
  globalColorsCollectionName: "_constants",
  includeAlphaTints: false,
  alphaValues: "10, 25, 50, 75, 90",
  variableStructure: "color",
  useShorthandColors: false,
  useShorthandRoles: false,
  useShorthandVariations: false,
  colorSteps: 25,
  scaleAlgorithm: "Natural",
  colorStepNames: "",
  pluginMode: "ramp", // "ramp" or "direct"
  baseSelection: "By Contrast",
  spreadUnit: "steps",
  variations: null,
  colors: [
    { name: "Primary", shorthand: "pr", value: "0067DD", description: "" },
    { name: "Secondary", shorthand: "sc", value: "EFEFF2", description: "" },
    { name: "Gray", shorthand: "gr", value: "808080", description: "" },
  ],
  roles: [
    { name: "Text", shorthand: "tx", spread: 2, minContrast: 4.5, baseIndex: 14, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Fill", shorthand: "fi", spread: 1, minContrast: 3.0, baseIndex: 9, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Background", shorthand: "bg", spread: 1, minContrast: 1.2, baseIndex: 4, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Border", shorthand: "br", spread: 1, minContrast: 2.0, baseIndex: 11, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
  ],
  themes: [
    { name: "light", bg: "FFFFFF" },
    { name: "dark", bg: "000000" },
  ],
  includeDescriptions: false,
};

ensureIds(demoConfig);
const _demoConfigStr = JSON.stringify(demoConfig);

/**
 * 2. APP STATE
 */
let appState = JSON.parse(JSON.stringify(demoConfig));
ensureVariations();

const UI_DIMS = {
  defaultWidth: 424,
  defaultHeight: 720,
  minWidth: 360,
  minHeight: 560,
  maxWidth: 1400,
  maxHeight: 1400,
};

let uiPrefs = { scale: 1.0, theme: "dark" };
let activeSidebarTab = "color-groups";
let _colorDragSrcIdx = null;
let _roleDragSrcIdx = null;

// Ensures appState.variations exists and all roles have matching variationTargets arrays.
function ensureVariations() {
  if (!appState.variations || appState.variations.length === 0) {
    appState.variations = [1, 2, 3, 4, 5].map((n) => ({
      _id: generateId(),
      name: String(n),
      shorthand: String(n),
    }));
  }
  for (const role of appState.roles) {
    const roleVars = role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : appState.variations;
    const vLen = roleVars.length;
    if (!role.variationTargets || role.variationTargets.length !== vLen) {
      const oldVals = role.variations ? Object.values(role.variations) : Array.isArray(role.variationTargets) ? role.variationTargets : [];
      role.variationTargets = roleVars.map((_, i) => oldVals[i] || (appState.pluginMode === "direct" ? DEFAULT_VARIATION_TARGETS[i] || 4.5 : Math.floor(((appState.colorSteps || 25) / Math.max(1, vLen - 1)) * i)));
      delete role.variations;
    }
  }
}
