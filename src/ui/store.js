/**
 * ============================================================================
 * CTM316 STATE MANAGEMENT (The Vanilla Store)
 * Single source of truth for all plugin state. Owns:
 *   - Identity helpers (generateId, ensureIds, ensureVariations)
 *   - appState and UI preferences
 *   - Persistence snapshot (savedState) for rename detection
 *   - Dirty-hash tracking (isDirty / markClean)
 *   - Validation (validateState)
 *   - All state mutations (setColor, setRole, setVariation, setRoleVariation)
 * ============================================================================
 */

// ── CONSTANTS ──
const DEFAULT_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

function defaultVariationTargets(len, pluginMode, scaleLength) {
  return Array.from({ length: len }, (_, i) => (pluginMode === "adaptiveEngine" ? DEFAULT_VARIATION_TARGETS[i] || 4.5 : Math.floor((scaleLength || 25) / 2)));
}

// ── IDENTITY ──
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
  if (state.themes)
    state.themes.forEach((t) => {
      if (!t._id) t._id = generateId();
    });
  return state;
}

// ── DEFAULT CONFIGURATION ──
const demoConfig = {
  name: "CTM316",
  tonalScaleCollectionName: "_scale",
  tokenCollectionName: "color tokens",
  embedDirectly: false,
  includeGlobalColors: false,
  globalColorsCollectionName: "global",
  includeAlphaTints: false,
  alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
  variableStructure: "color", // kept for backwards compat
  tokenNameOrder: ["color", "role", "variation"],
  useShorthandColors: false,
  useShorthandRoles: false,
  useShorthandVariations: false,
  scaleLength: 25,
  scaleAlgorithm: "Natural",
  scaleStepNames: [],
  pluginMode: "tonalScalesBased", // "tonalScalesBased" or "adaptiveEngine"
  baseSelection: "By Contrast",
  spreadUnit: "steps",
  perRoleControls: false,
  useGlobalAlgo: true,
  perColorAlgoScope: "color",
  solverMode: "natural",
  includeTonalCollection: true,
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
    { name: "Light", bg: "FFFFFF" },
    { name: "Dark", bg: "000000" },
  ],
  includeDescriptions: false,
};

ensureIds(demoConfig);

// ── APP STATE ──
let appState = JSON.parse(JSON.stringify(demoConfig));
ensureVariations();

const UI_DIMS = {
  defaultWidth: 400,
  defaultHeight: 720,
  minWidth: 400,
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
    const defaults = [
      { name: "Subtle",   shorthand: "1" },
      { name: "Soft",     shorthand: "2" },
      { name: "Default",  shorthand: "3" },
      { name: "Strong",   shorthand: "4" },
      { name: "Bold",     shorthand: "5" },
    ];
    appState.variations = defaults.map((d) => ({ _id: generateId(), name: d.name, shorthand: d.shorthand }));
  }
  for (const role of appState.roles) {
    const roleVars = role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : appState.variations;
    const vLen = roleVars.length;
    if (!role.variationTargets || role.variationTargets.length !== vLen) {
      const oldVals = role.variations ? Object.values(role.variations) : Array.isArray(role.variationTargets) ? role.variationTargets : [];
      role.variationTargets = roleVars.map((_, i) => oldVals[i] || (appState.pluginMode === "adaptiveEngine" ? DEFAULT_VARIATION_TARGETS[i] || 4.5 : Math.floor(((appState.scaleLength || 25) / Math.max(1, vLen - 1)) * i)));
      delete role.variations;
    }
  }
}

// ── PERSISTENCE SNAPSHOT ──
// Tracks the last appState snapshot that was successfully synced to Figma.
// Used by config.js to build variable rename maps (old name → new name).
let savedState = null;

/**
 * Deep-clones snapshot as the new savedState baseline.
 * Pass null to clear (e.g. after a full reset).
 * @param {object|null} snapshot
 */
function setSavedState(snapshot) {
  savedState = snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
}

/** @returns {object|null} Last persisted appState snapshot, or null if never synced */
function getSavedState() {
  return savedState;
}

/**
 * Merges incoming config into appState, re-syncs ids/variations,
 * and marks the result clean so isDirty() returns false until the next mutation.
 * Use for imports and load-config — not for partial field updates.
 * @param {object} incoming - Partial or full appState-shaped object
 */
function loadState(incoming) {
  // migrate legacy perColorAlgo flag
  if (incoming.perColorAlgo !== undefined && incoming.useGlobalAlgo === undefined) {
    incoming.useGlobalAlgo = !incoming.perColorAlgo;
    delete incoming.perColorAlgo;
  }
  // migrate legacy scaleStepNames CSV string → [{name, shorthand}] array
  if (typeof incoming.scaleStepNames === "string") {
    const csv = incoming.scaleStepNames.trim();
    incoming.scaleStepNames = csv
      ? csv.split(",").map((n) => { const s = n.trim(); return { _id: generateId(), name: s, shorthand: s }; })
      : [];
  }
  Object.assign(appState, incoming);
  ensureIds(appState);
  ensureVariations();
  markClean();
}

// ── HASH & DIRTY TRACKING ──
// Compares a hash of the config fields that affect engine output.
// isDirty() returns true whenever appState has changed since the last successful sync.
let _stateHash = null;

function _computeHash() {
  const s = appState;
  return JSON.stringify({
    colors: s.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: normalizeHex(c.value || ""), _id: c._id })),
    roles: s.roles,
    themes: s.themes,
    variations: s.variations,
    scaleLength: s.scaleLength,
    scaleAlgorithm: s.scaleAlgorithm,
    baseSelection: s.baseSelection,
    spreadUnit: s.spreadUnit,
    scaleStepNames: s.scaleStepNames,
    useShorthandColors: s.useShorthandColors,
    useShorthandRoles: s.useShorthandRoles,
    useShorthandVariations: s.useShorthandVariations,
    useShorthandSteps: s.useShorthandSteps,
    tokenNameOrder: s.tokenNameOrder,
    embedDirectly: s.embedDirectly,
  });
}

/**
 * Returns true if appState has changed since the last markClean() call.
 * @returns {boolean}
 */
function isDirty() {
  return _computeHash() !== _stateHash;
}

/** Records the current appState hash as the clean baseline. */
function markClean() {
  _stateHash = _computeHash();
}

// ── VALIDATION ──
/**
 * Checks appState for problems that would prevent a successful Figma sync.
 * @returns {string|null} Human-readable error message, or null if valid
 */
function validateState() {
  if (!appState.colors || appState.colors.length === 0) return "Add at least one color before running.";
  if (!appState.roles || appState.roles.length === 0) return "Add at least one color role before running.";

  const hasDup = (arr) => new Set(arr).size !== arr.length;
  const colorNames = appState.colors.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
  const colorShorts = appState.colors.map((c) => (c.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const roleNames = appState.roles.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
  const roleShorts = appState.roles.map((r) => (r.shorthand || "").trim().toLowerCase()).filter(Boolean);

  if (hasDup(colorNames)) return "Two or more colors share the same name. Each color name must be unique.";
  if (colorShorts.length && hasDup(colorShorts)) return "Two or more colors share the same shorthand. Each shorthand must be unique.";
  if (hasDup(roleNames)) return "Two or more roles share the same name. Each role name must be unique.";
  if (roleShorts.length && hasDup(roleShorts)) return "Two or more roles share the same shorthand. Each shorthand must be unique.";
  return null;
}

// ── MUTATIONS: COLORS ──
/**
 * Sets a field on appState.colors[idx]. Sanitizes hex when key === "value".
 * @param {number} idx
 * @param {string} key   - e.g. "name", "value", "shorthand", "description"
 * @param {string} value
 */
function setColor(idx, key, value) {
  if (key === "value") value = sanitizeHex(value);
  appState.colors[idx][key] = value;
}

// ── MUTATIONS: ROLES ──
/**
 * Sets a field on appState.roles[idx] with appropriate clamping/validation.
 * The composite key "variationTarget:N" sets roles[idx].variationTargets[N].
 * @param {number} idx
 * @param {string} key   - Field name or "variationTarget:N"
 * @param {*}      value
 */
function setRole(idx, key, value) {
  if (!appState.roles[idx]) return;
  if (key.startsWith("variationTarget:")) {
    const vi = parseInt(key.slice("variationTarget:".length));
    if (!appState.roles[idx].variationTargets) appState.roles[idx].variationTargets = defaultVariationTargets(appState.variations.length, "adaptiveEngine", appState.scaleLength);
    let v = parseFloat(value);
    if (isNaN(v) || v < 1) v = 1;
    appState.roles[idx].variationTargets[vi] = Math.min(21, v);
    return;
  }
  if (key === "minContrast") {
    let v = parseFloat(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].minContrast = Math.max(1, Math.min(21, v));
    return;
  }
  if (key === "spread") {
    let v = parseInt(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].spread = Math.max(1, Math.min(21, v));
    return;
  }
  if (key === "baseIndex" || key === "darkBaseIndex") {
    let v = parseInt(value);
    if (isNaN(v)) v = 0;
    appState.roles[idx][key] = Math.max(0, Math.min(appState.scaleLength - 1, v));
    return;
  }
  appState.roles[idx][key] = value;
}

/**
 * Sets a field on a per-role variation entry.
 * @param {number} roleIdx
 * @param {number} varIdx
 * @param {string} field
 * @param {*}      value
 */
function setRoleVariation(roleIdx, varIdx, field, value) {
  const role = appState.roles[roleIdx];
  if (!role || !role.roleVariations) return;
  if (varIdx < 0 || varIdx >= role.roleVariations.length) return;
  role.roleVariations[varIdx][field] = value;
}

// ── MUTATIONS: VARIATIONS ──
/**
 * Sets a field on appState.variations[idx].
 * @param {number} idx
 * @param {string} field
 * @param {*}      value
 */
function setVariation(idx, field, value) {
  if (!appState.variations[idx]) return;
  appState.variations[idx][field] = value;
}

