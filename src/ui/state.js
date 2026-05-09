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
  roleSteps: 5,
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

const UI_DIMS = {
  defaultWidth: 424,
  defaultHeight: 720,
  minWidth: 360,
  minHeight: 560,
  maxWidth: 1400,
  maxHeight: 1400,
};

const UI_SCALES = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5];
const UI_THEMES = ["figma", "dark", "light"]; // "figma" = follow Figma's own theme

let uiPrefs = { scale: 1.0, theme: "figma" };
let activeSidebarTab = "color-groups";
let _colorDragSrcIdx = null;
let _roleDragSrcIdx = null;

