/**
 * ============================================================================
 * UI THREAD LOGIC
 * ============================================================================
 */

/**
 * 0. PLUGIN DIMENSION & UI CONSTANTS — single source of truth for all resize logic.
 */
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

// Persisted UI prefs (scale, theme). Separate from appState so they survive config resets.
let uiPrefs = { scale: 1.0, theme: "figma" };

function applyUiPrefs() {
  document.body.style.zoom = uiPrefs.scale;
  document.body.setAttribute("data-ui-theme", uiPrefs.theme);
}

function saveUiPrefs() {
  parent.postMessage({ pluginMessage: { type: "save-ui-prefs-meta", prefs: uiPrefs } }, "*");
}

/**
 * 0. STABLE IDENTITY HELPERS
 * Each color and role carries a `_id` that never changes, even when the item
 * is renamed or reordered.  The rename-detector in scripts.js relies on these
 * to distinguish "same item, new name" from "deleted + new item at same slot".
 */
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// Assigns a `_id` to any color or role that is missing one (migration for
// configs saved before this feature existed).  Mutates in place, returns state.
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
 * 1. CORE STATE & DEFAULTS
 * demoConfig serves as the template for factory resets and schema validation.
 * appState is the single source of truth for the session.
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
  useShortColorNames: false,
  useShortRoleNames: false,
  colorSteps: 25,
  scaleAlgorithm: "Natural",
  colorStepNames: "",
  pluginMode: "ramp",
  baseSelection: "By Contrast",
  spreadUnit: "steps",
  roleSteps: 5,
  variations: null,
  colors: [
    { name: "Primary", shortName: "pr", value: "0067DD", description: "" },
    { name: "Secondary", shortName: "sc", value: "EFEFF2", description: "" },
    { name: "Gray", shortName: "gr", value: "808080", description: "" },
  ],
  roles: [
    { name: "Text", shortName: "tx", spread: 2, minContrast: 4.5, baseIndex: 14, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Fill", shortName: "fi", spread: 1, minContrast: 3.0, baseIndex: 9, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Background", shortName: "bg", spread: 1, minContrast: 1.2, baseIndex: 4, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
    { name: "Border", shortName: "br", spread: 1, minContrast: 2.0, baseIndex: 11, variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0], description: "" },
  ],
  themes: [
    { name: "light", bg: "FFFFFF" },
    { name: "dark", bg: "000000" },
  ],
};

// Ensure demoConfig items have stable IDs from the very first run
ensureIds(demoConfig);

let appState = JSON.parse(JSON.stringify(demoConfig));
// Drag-and-drop state (separate per list to prevent cross-contamination)
let _colorDragSrcIdx = null;
let _roleDragSrcIdx = null;
const _demoConfigStr = JSON.stringify(demoConfig);
let activeSidebarTab = "color-groups";

/**
 * 2. UI UTILITIES & FOCUS MANAGEMENT
 * Helpers to ensure smooth DOM updates without losing input focus.
 */
const debounce = (fn, delay = 150) => {
  let timeout;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
};

function withPreservedFocus(fn) {
  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const start = activeEl ? activeEl.selectionStart : null;
  const end = activeEl ? activeEl.selectionEnd : null;

  fn();

  if (activeId) {
    const newEl = document.getElementById(activeId);
    if (newEl) {
      newEl.focus();
      if (start !== null && (newEl.type === "text" || newEl.type === "number")) {
        try {
          newEl.setSelectionRange(start, end);
        } catch (e) {}
      }
    }
  }
}

/**
 * 3. COLOR MATH UTILITIES
 * Ported verbatim from Web_App/JS/Utils.js — single source of truth for color math.
 * Keep in sync with Utils.js; never add DOM-aware logic here.
 */

function validHex(hex) {
  if (typeof hex !== "string") return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

function normalizeHex(hex) {
  if (!validHex(hex)) return null;
  hex = hex.trim().replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + hex.toUpperCase();
}

function hexToRgb(hex) {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  const bigint = parseInt(nhex.replace(/^#/, ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb[0], rgb[1], rgb[2]);
}

function hexToHue(hex) {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[0] : null;
}
function hexToSat(hex) {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[1] : null;
}
function hexToLum(hex) {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[2] : null;
}

function hslToRgb(h, s, l) {
  if (typeof h !== "number" || typeof s !== "number" || typeof l !== "number" || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  if (!rgb) return null;
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

function relLum(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const n1 = normalizeHex(hex1),
    n2 = normalizeHex(hex2);
  if (!n1 || !n2) return null;
  const l1 = relLum(n1),
    l2 = relLum(n2);
  if (l1 === null || l2 === null) return null;
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

function shortestHueDiff(current, target) {
  return ((((target - current + 180) % 360) + 360) % 360) - 180;
}

function contrastRating(hex1, hex2) {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio === null) return null;
  if (ratio < 3) return "Fail";
  if (ratio < 4.5) return "AA Large";
  if (ratio < 7) return "AA";
  return "AAA";
}

function seriesMaker(x) {
  const out = [];
  for (let i = 1; i <= x; i++) out.push(i);
  return out;
}

function slugify(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 4. COLOR ENGINE (UI THREAD)
 * Ported from Web_App/JS/ClrGen.js — runs in UI thread for live preview without postMessage.
 * Uses a separate cache (_previewLastHash/_previewCache) to avoid colliding with code.js cache.
 * Keep in sync with code.js sections 6 & 7 (backend engine).
 */

let _previewLastHash = null;
let _previewCache = null;

function translateConfigForPreview(state) {
  const count = Math.max(1, parseInt(state.colorSteps) || 23);
  const userWeightNames = state.colorStepNames && state.colorStepNames.trim() ? state.colorStepNames.split(",").map((n) => n.trim()) : null;
  let stepNames = null;
  if (userWeightNames && userWeightNames.length > 0) {
    const names = userWeightNames.slice();
    while (names.length < count) names.push(String(names.length + 1));
    stepNames = names.slice(0, count);
  }
  const variations = state.variations && state.variations.length > 0 ? state.variations : [1, 2, 3, 4, 5].map((n) => ({ _id: String(n), name: String(n), shortName: String(n), description: "" }));
  const themes = state.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
  return {
    name: state.name || "ctm316",
    colors: (state.colors || []).map((g) => ({ name: g.name, shortName: g.shortName, value: g.value, solverMode: g.solverMode || "natural" })),
    roles: (state.roles || []).map((role) => ({
      name: role.name,
      shortName: role.shortName || role.name.substring(0, 2).toLowerCase(),
      minContrast: String(role.minContrast !== undefined ? role.minContrast : "4.5"),
      spread: Math.max(1, parseInt(role.spread) || 1),
      baseIndex: role.baseIndex !== undefined ? parseInt(role.baseIndex) : Math.floor(count / 2),
      darkBaseIndex: role.darkBaseIndex !== undefined ? parseInt(role.darkBaseIndex) : undefined,
      baseContrast: parseFloat(role.baseContrast) || 4.5,
      contrastGap: parseFloat(role.contrastGap) || 1.5,
      variationTargets: role.variationTargets || (role.variations ? Object.values(role.variations) : variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5)),
      variationOverride: role.variationOverride || false,
      roleVariations: role.roleVariations || [],
    })),
    colorSteps: count,
    scaleAlgorithm: state.scaleAlgorithm || "Natural",
    pluginMode: state.pluginMode || "ramp",
    spreadUnit: state.spreadUnit || "steps",
    baseSelectionMode: state.baseSelection || "By Contrast",
    roleMapping: state.pluginMode === "direct" ? (state.baseSelection === "Manual" ? "Direct Manual" : "Direct Contrast") : state.baseSelection || "By Contrast",
    colorStepNames: stepNames,
    variations,
    themes: [
      { name: "light", bg: themes[0].bg || "FFFFFF" },
      { name: "dark", bg: themes[1].bg || "000000" },
    ],
  };
}

function colorRampMaker(hexIn, rampLength, rampType = "Natural") {
  const hue = hexToHue(hexIn);
  const satu = hexToSat(hexIn);
  const N = rampLength;

  if (rampType === "Linear") {
    const inc = 100 / (N + 1);
    const out = [];
    for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
    return out.reverse();
  }

  const C_max = (21 * N) / (N + 1);
  const uMax = Math.log(0.05 * C_max);
  const uMin = Math.log(1.05 / C_max);

  function stepLum(i) {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  }

  function findL(targetLum, getS, getH) {
    let lo = 0,
      hi = 100,
      L = 50;
    for (let j = 0; j < 30; j++) {
      const mid = (lo + hi) / 2;
      const lum = relLum(hslToHex(getH(mid), getS(mid), mid));
      L = mid;
      if (Math.abs(lum - targetLum) < 0.0001) break;
      if (lum < targetLum) lo = mid;
      else hi = mid;
    }
    return L;
  }

  const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);

  if (rampType === "Uniform") {
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(
        stepLum(i),
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  }

  if (rampType === "Natural") {
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, () => hue);
      out.push(hslToHex(hue, tapS(L), L) || "#000000");
    }
    return out;
  }

  if (rampType === "Expressive") {
    const shiftH = (L) => {
      const d = (L - 50) / 50;
      return (hue + shortestHueDiff(hue, d > 0 ? 60 : 240) * Math.abs(d) * 0.15 + 360) % 360;
    };
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, shiftH);
      out.push(hslToHex(shiftH(L), tapS(L), L) || "#000000");
    }
    return out;
  }

  if (rampType === "Symmetric") {
    const srcLum = relLum(normalizeHex(hexIn)) || 0.18;
    const uSrc = Math.log(srcLum + 0.05);
    const mid = Math.floor((N - 1) / 2);
    const out = [];
    for (let i = 0; i < N; i++) {
      let u;
      if (N === 1) u = uSrc;
      else if (i === 0) u = uMax;
      else if (i === N - 1) u = uMin;
      else if (i <= mid && mid > 0) u = uMax - ((uMax - uSrc) * i) / mid;
      else u = uSrc - ((uSrc - uMin) * (i - mid)) / (N - 1 - mid);
      const targetLum = Math.max(0.0001, Math.exp(Math.min(uMax, Math.max(uMin, u))) - 0.05);
      const L = findL(
        targetLum,
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  }

  if (rampType === "OKLCH") {
    const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn));
    const out = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 1,
        oL = 0.5;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(oklchToHex(mid, srcC, srcH));
        oL = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(oklchToHex(oL, srcC, srcH) || "#000000");
    }
    return out;
  }

  if (rampType === "Material") {
    const { h: srcH, c: srcC } = hexToHct(normalizeHex(hexIn));
    const out = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 100,
        tone = 50;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(hctToHex(srcH, srcC, mid));
        tone = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(hctToHex(srcH, srcC, tone) || "#000000");
    }
    return out;
  }

  return colorRampMaker(hexIn, rampLength, "Natural");
}

function variableMakerUI(config) {
  const inputHash = JSON.stringify({ colors: config.colors, steps: config.colorSteps, scaleAlgorithm: config.scaleAlgorithm, themes: config.themes, roles: config.roles, roleMapping: config.roleMapping, colorStepNames: config.colorStepNames, variations: config.variations });
  if (inputHash === _previewLastHash && _previewCache) return _previewCache;

  const colors = config.colors;
  const roles = config.roles;
  const rampLength = config.colorSteps;
  const stepNames = config.colorStepNames || seriesMaker(rampLength);
  const lightBg = normalizeHex(config.themes[0].bg) || "#FFFFFF";
  const darkBg = normalizeHex(config.themes[1].bg) || "#000000";
  const isDirectContrast = config.pluginMode === "direct" || config.roleMapping === "Direct Contrast";
  const clrRamps = Object.create(null);
  const tokens = { light: Object.create(null), dark: Object.create(null) };
  const errors = { critical: [], warnings: [], notices: [] };

  // Build color ramps — skipped entirely for Direct Contrast
  if (!isDirectContrast) {
    for (const color of colors) {
      const colorRamp = colorRampMaker(color.value, rampLength, config.scaleAlgorithm);
      const ramp = Object.create(null);
      clrRamps[color.name] = ramp;
      for (let i = 0; i < rampLength; i++) {
        const weight = stepNames[i];
        const value = normalizeHex(colorRamp[i]) || "#000000";
        ramp[weight] = {
          value,
          stepName: `${color.name}-${weight}`,
          shortName: `${color.shortName}-${weight}`,
          contrast: {
            light: { ratio: contrastRatio(value, lightBg), rating: contrastRating(value, lightBg) },
            dark: { ratio: contrastRatio(value, darkBg), rating: contrastRating(value, darkBg) },
          },
        };
      }
    }
  }

  for (const mode of config.themes) {
    const modeName = mode.name.toLowerCase();
    const bgHex = modeName === "dark" ? darkBg : lightBg;
    for (const color of colors) {
      const clrName = color.name;
      const conGroup = Object.create(null);
      tokens[modeName][clrName] = conGroup;
      const roleNames = roles.map((_, i) => i);

      if (isDirectContrast) {
        for (const roleName of roleNames) {
          const role = roles[roleName];
          const conRole = Object.create(null);
          conGroup[roleName] = conRole;
          const variationTargets = role.variationTargets || config.variations.map(() => 4.5);
          for (let vi = 0; vi < config.variations.length; vi++) {
            const variation = String(vi);
            const targetContrast = parseFloat(variationTargets[vi]) || 4.5;
            const solved = solveColorForContrast(color.value, targetContrast, bgHex, color.solverMode || "natural");
            if (solved.warning) errors.warnings.push({ color: clrName, role: role.name, variation, theme: modeName, warning: solved.warning });
            conRole[variation] = {
              tknName: `${clrName}-${role.name}-${variation}`,
              color: clrName,
              role: role.name,
              variation,
              tknRef: null,
              value: solved.hex,
              contrast: { ratio: solved.achievedContrast, rating: contrastRating(solved.hex, bgHex) },
              contrastTarget: targetContrast,
              achievedContrast: solved.achievedContrast,
              isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
            };
          }
        }
      } else {
        for (const roleName of roleNames) {
          const role = roles[roleName];
          const spread = role.spread;
          const conRole = Object.create(null);
          conGroup[roleName] = conRole;
          const cEnd = clrRamps[clrName][stepNames[rampLength - 1]].contrast[modeName].ratio;
          const cStart = clrRamps[clrName][stepNames[0]].contrast[modeName].ratio;
          const growthDir = cEnd > cStart ? 1 : -1;
          const varCount = config.variations.length;
          const baseVarIdx = Math.floor(varCount / 2);
          const maxOffset = baseVarIdx * spread;
          const minAllowed = maxOffset;
          const maxAllowed = rampLength - 1 - maxOffset;

          let baseIdx;
          if (config.roleMapping === "By Index") {
            const isDarkMode = modeName === "dark";
            const baseIndexSource = isDarkMode && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
            baseIdx = baseIndexSource !== undefined ? parseInt(baseIndexSource) : rampLength >> 1;
          } else {
            baseIdx = -1;
            const isDark = modeName === "dark";
            const minC = parseFloat(role.minContrast);
            if (isDark) {
              for (let i = rampLength - 1; i >= 0; i--) {
                if ((clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0) >= minC) {
                  baseIdx = i;
                  break;
                }
              }
            } else {
              for (let i = 0; i < rampLength; i++) {
                if ((clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0) >= minC) {
                  baseIdx = i;
                  break;
                }
              }
            }
            if (baseIdx === -1) {
              let bestIdx = 0,
                maxC = -1;
              for (let i = 0; i < rampLength; i++) {
                const c = clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0;
                if (c > maxC) {
                  bestIdx = i;
                  maxC = c;
                }
              }
              baseIdx = bestIdx;
              errors.critical.push({ color: clrName, role: roleName, theme: modeName, error: `Cannot meet minimum contrast ${minC}.` });
            }
          }

          let adjustedBase = false;
          if (minAllowed > maxAllowed) {
            baseIdx = Math.floor((rampLength - 1) / 2);
            adjustedBase = true;
          } else {
            if (baseIdx < minAllowed) {
              baseIdx = minAllowed;
              adjustedBase = true;
            }
            if (baseIdx > maxAllowed) {
              baseIdx = maxAllowed;
              adjustedBase = true;
            }
          }
          if (adjustedBase) errors.warnings.push({ color: clrName, role: roleName, theme: modeName, warning: `Base index clamped to ${baseIdx} due to spread constraints.` });

          const offsets = config.variations.map((v, i) => ({
            key: String(i),
            offset: (i - baseVarIdx) * spread,
          }));
          for (const { key: variation, offset } of offsets) {
            let idx = baseIdx + offset * growthDir;
            let adjusted = false;
            if (idx < 0) {
              idx = 0;
              adjusted = true;
            } else if (idx >= rampLength) {
              idx = rampLength - 1;
              adjusted = true;
            }
            const data = clrRamps[clrName][stepNames[idx]];
            conRole[variation] = {
              tknName: `${clrName}-${role.name}-${variation}`,
              color: clrName,
              role: role.name,
              variation,
              tknRef: data.stepName,
              value: data.value,
              contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
              isAdjusted: adjusted,
            };
            if (adjusted) errors.warnings.push({ color: clrName, role: roleName, variation, theme: modeName, warning: `Variation '${variation}' clamped due to overflow.` });
          }
        }
      }
    }
  }

  const output = { colorRamps: clrRamps, colorTokens: tokens, errors };
  _previewLastHash = inputHash;
  _previewCache = output;
  return output;
}

/**
 * 5. DYNAMIC DOM GENERATORS
 * These functions convert appState into interactive UI cards.
 * Uses document fragments for performance.
 */

// Ensures appState.variations exists and all roles have matching variationTargets arrays.
function ensureVariations() {
  if (!appState.variations || appState.variations.length === 0) {
    appState.variations = [1, 2, 3, 4, 5].map((n) => ({
      _id: generateId(),
      name: String(n),
      shortName: String(n),
    }));
  }
  for (const role of appState.roles) {
    const roleVars = role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : appState.variations;
    const vLen = roleVars.length;
    if (!role.variationTargets || role.variationTargets.length !== vLen) {
      const oldVals = role.variations ? Object.values(role.variations) : Array.isArray(role.variationTargets) ? role.variationTargets : [];
      role.variationTargets = roleVars.map((_, i) => oldVals[i] || (appState.pluginMode === "direct" ? [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5 : Math.floor(((appState.colorSteps || 25) / Math.max(1, vLen - 1)) * i)));
      delete role.variations;
    }
  }
}

const renderColorGroups = debounce(() => {
  if (activeSidebarTab !== "color-groups") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();

    const addButton = document.createElement("button");
    addButton.className = "w-full h-10 px-4 mb-2 bg-transparent text-[var(--accent)] border-2 border-dashed border-[var(--accent)] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2";
    addButton.innerHTML = `<span>+ Add Color</span>`;
    addButton.onclick = addGroup;
    fragment.appendChild(addButton);

    appState.colors.forEach((group, idx) => {
      const hexValue = normalizeHex(group.value) || "#8E8E93";
      const lightBgHex = normalizeHex(appState.themes[0].bg) || "#FFFFFF";
      const darkBgHex = normalizeHex(appState.themes[1].bg) || "#000000";
      const lightC = contrastRatio(hexValue, lightBgHex) || 0;
      const darkC = contrastRatio(hexValue, darkBgHex) || 0;
      const gId = `group-${idx}`;

      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2";
      card.draggable = true;

      // ── Color group drag-and-drop ────────────────────────────────────
      card.addEventListener("dragstart", (e) => {
        _colorDragSrcIdx = idx;
        e.dataTransfer.effectAllowed = "move";
        card.style.opacity = "0.5";
      });
      card.addEventListener("dragend", () => {
        _colorDragSrcIdx = null;
        card.style.opacity = "";
        document.querySelectorAll(".color-group-card-plugin").forEach((c) => {
          c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        });
      });
      card.addEventListener("dragover", (e) => {
        if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".color-group-card-plugin").forEach((c) => {
          c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        });
        card.classList.add("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        }
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
        const from = _colorDragSrcIdx;
        const to = idx;
        const [moved] = appState.colors.splice(from, 1);
        appState.colors.splice(to, 0, moved);
        renderColorGroups();
      });
      card.classList.add("color-group-card-plugin");

      card.innerHTML = `
                <div class="grid grid-cols-[20px_1fr_1fr_40px] gap-2">
                  <div class="flex flex-col gap-0.5 self-center">
                    <button onclick="moveGroup(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
                    <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
                    <button onclick="moveGroup(${idx}, 1)" ${idx === appState.colors.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
                  </div>
                  <div class="flex-[3] space-y-1">
                    <label for="${gId}-name" class="text-[var(--text-muted)] text-[12px] font-medium">Color Name</label>
                    <input type="text" id="${gId}-name" value="${group.name}" oninput="updateGroup(${idx}, 'name', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
                  </div>
                  <div class="flex-[4] space-y-1">
                    <label for="${gId}-hex" class="text-[var(--text-muted)] text-[12px] font-medium">Source Color</label>
                    <div class="flex items-center gap-2 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 pl-1 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px]">
                        <input type="color" value="${hexValue}" onchange="updateGroup(${idx}, 'value', this.value)" class="cursor-pointer size- bg-transparent border-none rounded-[8px]">
                        <input type="text" id="${gId}-hex" value="${group.value}" oninput="updateGroup(${idx}, 'value', this.value, this)" class="w-full bg-transparent text-[13px] uppercase outline-none text-[var(--text-primary)]">
                    </div>
                  </div>
                  <button onclick="removeGroup(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 self-end size-[40px] flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">
                    <svg width="16" height="16" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>
                  </button>
                </div>
                <div class="grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
                  <div class="flex-[3] space-y-1">
                    <label for="${gId}-short" class="text-[var(--text-muted)] text-[12px] font-medium">Short Name</label>
                    <input type="text" id="${gId}-short" value="${group.shortName}" oninput="updateGroup(${idx}, 'shortName', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
                  </div>
                  <div class="flex-[3.5] space-y-1">
                    <span class="text-[var(--text-muted)] text-[12px] font-medium">Light Contrast</span>
                    <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
                      <span>${lightC.toFixed(2)}:1</span>
                      <span class="font-bold ${lightC >= 4.5 ? "text-[var(--success)]" : lightC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, lightBgHex)}</span>
                    </div>
                  </div>
                  <div class="flex-[3.5] space-y-1">
                    <span class="text-[var(--text-muted)] text-[12px] font-medium">Dark Contrast</span>
                    <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
                      <span>${darkC.toFixed(2)}:1</span>
                      <span class="font-bold ${darkC >= 4.5 ? "text-[var(--success)]" : darkC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, darkBgHex)}</span>
                    </div>
                  </div>
                </div>
                ${
                  appState.pluginMode === "direct"
                    ? `
                <div class="space-y-1">
                  <label class="text-[var(--text-muted)] text-[12px] font-medium">Color Solver</label>
                  <select onchange="updateGroup(${idx}, 'solverMode', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] appearance-none cursor-pointer">
                    <option value="natural"          ${(group.solverMode || "natural") === "natural" ? "selected" : ""}>Balanced — adjusts hue and vibrancy naturally</option>
                    <option value="saturated"        ${(group.solverMode || "natural") === "saturated" ? "selected" : ""}>Vivid — preserves saturation, adjusts brightness only</option>
                    <option value="luminance"        ${(group.solverMode || "natural") === "luminance" ? "selected" : ""}>Muted — fades toward neutral at low/high lightness</option>
                    <option value="hue-locked"       ${(group.solverMode || "natural") === "hue-locked" ? "selected" : ""}>Hue Faithful — locks hue angle, adjusts brightness and vibrancy</option>
                    <option value="chroma-maximized" ${(group.solverMode || "natural") === "chroma-maximized" ? "selected" : ""}>Max Vibrancy — most saturated color that meets contrast</option>
                  </select>
                </div>`
                    : ""
                }
                <div class="space-y-1">
                  <label for="${gId}-desc" class="text-[var(--text-muted)] text-[12px] font-medium">Description</label>
                  <input type="text" id="${gId}-desc" value="${(group.description || "").replace(/"/g, "&quot;")}" oninput="updateGroup(${idx}, 'description', this.value)" placeholder="Color description (optional)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
                </div>
              `;
      // Prevent accidental drags from interactive children
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

    const addButton = document.createElement("button");
    addButton.className = "w-full h-10 px-4 mb-2 bg-transparent text-[var(--accent)] border-2 border-dashed border-[var(--accent)] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2";
    addButton.innerHTML = `<span>+ Add Color Role</span>`;
    addButton.onclick = addRole;
    fragment.appendChild(addButton);

    const trashSvg = `<svg width="14" height="14" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>`;

    appState.roles.forEach((role, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2";
      card.draggable = true;
      card.classList.add("role-card-plugin");

      // ── Role drag-and-drop ───────────────────────────────────────────
      card.addEventListener("dragstart", (e) => {
        _roleDragSrcIdx = idx;
        e.dataTransfer.effectAllowed = "move";
        card.style.opacity = "0.5";
      });
      card.addEventListener("dragend", () => {
        _roleDragSrcIdx = null;
        card.style.opacity = "";
        document.querySelectorAll(".role-card-plugin").forEach((c) => {
          c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        });
      });
      card.addEventListener("dragover", (e) => {
        if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".role-card-plugin").forEach((c) => {
          c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        });
        card.classList.add("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
        }
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
        const from = _roleDragSrcIdx;
        const to = idx;
        const [moved] = appState.roles.splice(from, 1);
        appState.roles.splice(to, 0, moved);
        renderRoles();
      });

      const isDirectMode = appState.pluginMode === "direct";
      const bSel = appState.baseSelection || "By Contrast";
      const sUnit = appState.spreadUnit || "steps";
      const mid = Math.floor(appState.colorSteps / 2);

      let secondRowHtml = "";
      if (role.variationOverride && role.variationManual) {
        // Manual targets are set per-variation inline — hide all rule inputs
      } else if (isDirectMode && bSel === "By Contrast") {
        // Direct Contrast + By Contrast: base contrast + contrast gap
        const varCount = appState.variations.length;
        const baseVarIdx = Math.floor(varCount / 2);
        const baseC = role.baseContrast || 4.5;
        const gap = role.contrastGap || 1.5;
        const previewTargets = appState.variations.map((_, vi) => Math.max(1.01, baseC + (vi - baseVarIdx) * gap).toFixed(2));
        secondRowHtml = `
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-baseContrast" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Base Contrast</label>
                    <input type="number" id="role-${idx}-baseContrast" step="0.1" min="1" max="21" value="${baseC}" onchange="updateRole(${idx}, 'baseContrast', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-contrastGap" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Contrast Gap</label>
                    <input type="number" id="role-${idx}-contrastGap" step="0.1" value="${gap}" onchange="updateRole(${idx}, 'contrastGap', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>
                <p class="text-[10px] text-[var(--text-muted)] px-1">Targets: ${previewTargets.join(" · ")}</p>`;
      } else if (isDirectMode && bSel === "Manual") {
        const varTargets = role.variationTargets || appState.variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5);
        const cardErrors = [];
        for (let vi = 1; vi < varTargets.length; vi++) {
          if (varTargets[vi] <= varTargets[vi - 1]) cardErrors.push(vi);
        }
        const inputRow = appState.variations
          .map((varDef, vi) => {
            const isErr = cardErrors.includes(vi) || cardErrors.includes(vi + 1);
            return `
                  <div class="space-y-1">
                    <label class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">${varDef.name}</label>
                    <div class="relative">
                      <input type="number" step="0.1" min="1" max="21" value="${varTargets[vi] || ""}"
                        onchange="updateRoleVariationTarget(${idx}, ${vi}, parseFloat(this.value))"
                        class="w-full h-[40px] bg-[var(--bg-input)] border ${isErr ? "border-[var(--danger)]" : "border-[var(--border)]"} rounded-[8px] p-2 pr-6 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                      <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-dim)] pointer-events-none">:1</span>
                    </div>
                  </div>`;
          })
          .join("");
        secondRowHtml = `
                <div class="grid gap-1.5" style="grid-template-columns: repeat(${appState.variations.length}, 1fr)">${inputRow}</div>
                ${cardErrors.length ? `<p class="text-[10px] text-[var(--danger)] px-1">Contrast values must strictly increase across all variations.</p>` : ""}`;
      } else if (!isDirectMode && bSel === "Manual") {
        const varTargets = role.variationTargets || appState.variations.map(() => Math.floor((appState.colorSteps || 25) / 2));
        const maxStep = (appState.colorSteps || 25) - 1;
        const inputRow = appState.variations
          .map((varDef, vi) => {
            return `
                  <div class="space-y-1">
                    <label class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">${varDef.name}</label>
                    <input type="number" min="0" max="${maxStep}" value="${varTargets[vi] !== undefined ? varTargets[vi] : Math.floor((appState.colorSteps || 25) / 2)}"
                      oninput="updateRoleVariationTarget(${idx}, ${vi}, this.value)"
                      class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>`;
          })
          .join("");
        secondRowHtml = `
                <div class="grid gap-1.5" style="grid-template-columns: repeat(${appState.variations.length}, 1fr)">${inputRow}</div>
                <p class="text-[10px] text-[var(--text-muted)] px-1">Step indices (0–${maxStep})</p>`;
      } else if (!isDirectMode && bSel === "By Contrast" && sUnit === "contrast") {
        secondRowHtml = `
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-contrast" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Min Contrast</label>
                    <input type="number" id="role-${idx}-contrast" step="0.1" value="${role.minContrast || "4.5"}" onchange="updateRole(${idx}, 'minContrast', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-contrastGap" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Contrast Gap</label>
                    <input type="number" id="role-${idx}-contrastGap" step="0.1" value="${role.contrastGap || 1.5}" onchange="updateRole(${idx}, 'contrastGap', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
      } else if (!isDirectMode && bSel === "By Contrast" && sUnit === "steps") {
        secondRowHtml = `
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-contrast" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Min Contrast</label>
                    <input type="number" id="role-${idx}-contrast" step="0.1" value="${role.minContrast || "4.5"}" onchange="updateRole(${idx}, 'minContrast', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-spread" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Spread</label>
                    <input type="number" id="role-${idx}-spread" value="${role.spread || 1}" onchange="updateRole(${idx}, 'spread', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
      } else if (!isDirectMode && bSel === "By Index" && sUnit === "contrast") {
        const lightBase = (role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
        const darkBase = (role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
        secondRowHtml = `
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-base" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Light Base</label>
                    <input type="number" id="role-${idx}-base" value="${lightBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'baseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-darkbase" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Dark Base</label>
                    <input type="number" id="role-${idx}-darkbase" value="${darkBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'darkBaseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-contrastGap" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Contrast Gap</label>
                    <input type="number" id="role-${idx}-contrastGap" step="0.1" value="${role.contrastGap || 1.5}" onchange="updateRole(${idx}, 'contrastGap', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
      } else {
        // By Index + Steps (default fallback)
        const lightBase = (role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
        const darkBase = (role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
        secondRowHtml = `
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-base" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Light Base</label>
                    <input type="number" id="role-${idx}-base" value="${lightBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'baseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-darkbase" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Dark Base</label>
                    <input type="number" id="role-${idx}-darkbase" value="${darkBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'darkBaseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-spread" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Spread</label>
                    <input type="number" id="role-${idx}-spread" value="${role.spread || 1}" onchange="updateRole(${idx}, 'spread', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
      }

      const roleVars = getRoleVariations(role);
      const isManualInline = !!(role.variationOverride && role.variationManual);
      const overrideSection = appState.allowRoleVariations
        ? `
              <div class="border-t border-[var(--border)] mt-2 pt-2">
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-medium text-[var(--text-primary)]">Custom Variations</span>
                  <button onclick="toggleRoleVariationOverride(${idx})" class="toggle-pill ${role.variationOverride ? "on" : ""}"></button>
                </div>
                ${
                  role.variationOverride
                    ? `
                <div class="mt-2 space-y-1.5">
                  <div class="flex items-center justify-between py-1">
                    <span class="text-[11px] text-[var(--text-muted)]">Variation targets</span>
                    <div class="flex gap-0.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-[6px] p-0.5">
                      <button onclick="if(${role.variationManual ? 1 : 0}){toggleRoleVariationManual(${idx})}" class="text-[11px] px-2 py-0.5 rounded-[4px] transition-all ${!role.variationManual ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}">Rule</button>
                      <button onclick="if(!${role.variationManual ? 1 : 0}){toggleRoleVariationManual(${idx})}" class="text-[11px] px-2 py-0.5 rounded-[4px] transition-all ${role.variationManual ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}">Manual</button>
                    </div>
                  </div>
                  ${roleVars
                    .map((v, vi) => {
                      const varCount = roleVars.length;
                      const baseVarIdx = Math.floor(varCount / 2);
                      const manualVal = (role.variationTargets || [])[vi];
                      // Compute rule-derived value for display
                      var ruleVal;
                      if (isDirectMode) {
                        if (bSel === "Manual") {
                          ruleVal = manualVal !== undefined ? manualVal : ([1.5, 3.0, 4.5, 7.0, 12.0][vi] || 4.5);
                        } else {
                          ruleVal = Math.max(1.01, (role.baseContrast || 4.5) + (vi - baseVarIdx) * (role.contrastGap || 1.5));
                        }
                      } else {
                        if (bSel === "Manual") {
                          ruleVal = manualVal !== undefined ? manualVal : Math.floor((appState.colorSteps || 25) / 2);
                        } else if (bSel === "By Index") {
                          ruleVal = (role.baseIndex !== undefined ? role.baseIndex : mid) + (vi - baseVarIdx) * (sUnit === "contrast" ? (role.contrastGap || 1.5) : (role.spread || 1));
                        } else {
                          ruleVal = (role.minContrast || 4.5) + (vi - baseVarIdx) * (sUnit === "contrast" ? (role.contrastGap || 1.5) : (role.spread || 1));
                        }
                      }
                      const displayVal = isManualInline
                        ? (manualVal !== undefined ? manualVal : ruleVal)
                        : ruleVal;
                      const tInput = `<input type="number" step="0.1"
                        min="${isDirectMode ? 1 : 0}" max="${isDirectMode ? 21 : (appState.colorSteps || 25) - 1}"
                        value="${typeof displayVal === "number" ? parseFloat(displayVal.toFixed(2)) : displayVal}"
                        ${isManualInline ? `oninput="updateRoleVariationTargetInline(${idx},${vi},this.value)"` : "disabled"}
                        class="w-[60px] h-[32px] border rounded-[8px] px-2 text-[12px] outline-none text-[var(--text-primary)]
                          ${isManualInline
                            ? "bg-[var(--bg-input)] border-[var(--border)] focus:border-[var(--border-focus)]"
                            : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-60"}">`;
                      return `
                    <div class="flex items-center gap-1.5">
                      <div class="flex flex-col gap-0.5 shrink-0">
                        <button onclick="moveRoleVariation(${idx},${vi},-1)" ${vi === 0 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▲</button>
                        <button onclick="moveRoleVariation(${idx},${vi},1)" ${vi === roleVars.length - 1 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▼</button>
                      </div>
                      <input type="text" value="${(v.name || "").replace(/"/g, "&quot;")}" placeholder="Name"
                        oninput="updateRoleVariation(${idx},${vi},'name',this.value)"
                        class="flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                      <input type="text" value="${(v.shortName || "").replace(/"/g, "&quot;")}" placeholder="Short"
                        oninput="updateRoleVariation(${idx},${vi},'shortName',this.value)"
                        class="w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                      ${tInput}
                      <button onclick="removeRoleVariation(${idx},${vi})" ${roleVars.length <= 1 ? "disabled" : ""} class="w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[13px]">✕</button>
                    </div>`;
                    })
                    .join("")}
                  <button onclick="addRoleVariation(${idx})" class="w-full h-[28px] text-[11px] text-[var(--accent)] border border-[var(--border)] rounded-[8px] hover:bg-[var(--bg-hover)] transition-all">+ Add variation</button>
                </div>
                `
                    : ""
                }
              </div>
            `
        : "";

      card.innerHTML = `
              <div class="flex items-end gap-2">
                <div class="flex flex-col gap-0.5 self-center flex-shrink-0">
                  <button onclick="moveRole(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
                  <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
                  <button onclick="moveRole(${idx}, 1)" ${idx === appState.roles.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
                </div>
                <div class="flex-1 space-y-1">
                  <label for="role-${idx}-name" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Role Name</label>
                  <div class="flex items-center gap-1">
                    <input type="text" id="role-${idx}-name" value="${role.name || ""}" oninput="updateRole(${idx}, 'name', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>
                <div class="w-[72px] space-y-1">
                  <label for="role-${idx}-short" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Short</label>
                  <input type="text" id="role-${idx}-short" value="${role.shortName || ""}" oninput="updateRole(${idx}, 'shortName', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                </div>
                <button onclick="removeRole(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 size-[40px] shrink-0 flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">${trashSvg}</button>
              </div>
              <div class="space-y-1">
                <label for="role-${idx}-desc" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Description</label>
                <input type="text" id="role-${idx}-desc" value="${(role.description || "").replace(/"/g, "&quot;")}" oninput="updateRole(${idx}, 'description', this.value)" placeholder="Role description (optional)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
              </div>
              ${secondRowHtml}
              ${overrideSection}`;
      // Prevent accidental drags from interactive children
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);

// 5. EVENT HANDLERS
function toggleSection(id, event) {
  if (event && event.target.closest("button")) return;
  const section = document.getElementById(id);
  const isCollapsed = section.classList.toggle("collapsed");
  const trigger = section.querySelector('[role="button"]');
  if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
}

function showSheet(id) {
  document.getElementById(id).classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => s.classList.remove("open"));
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function showOverlay(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideOverlay(id) {
  document.getElementById(id).classList.add("hidden");
  if (id === "success-overlay" || id === "error-overlay") hideSheets();
  if (id === "preview-overlay") {
    document.getElementById("preview-errors-body").classList.remove("open");
  }
}

function updateGroup(idx, key, value, el) {
  if (key === "value") {
    const clean = value
      .replace(/[^0-9A-Fa-f]/g, "")
      .toUpperCase()
      .substring(0, 6);
    if (el && el.value !== clean) {
      const start = el.selectionStart;
      el.value = clean;
      el.setSelectionRange(start, start);
    }
    appState.colors[idx].value = clean;
    renderColorGroups();
  } else {
    appState.colors[idx][key] = value;
    if (key === "name") renderColorGroups();
  }
}

function removeGroup(idx) {
  appState.colors.splice(idx, 1);
  renderColorGroups();
}

function moveGroup(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.colors.length) return;
  const [item] = appState.colors.splice(idx, 1);
  appState.colors.splice(target, 0, item);
  renderColorGroups();
}

function addGroup() {
  const n = appState.colors.length + 1;
  appState.colors.unshift({ _id: generateId(), name: `color${n}`, shortName: `C${n}`, value: "888888" });
  renderColorGroups();
}

function updateRole(idx, key, value) {
  if (key.startsWith("variationTarget:")) {
    const vi = parseInt(key.slice("variationTarget:".length));
    if (!appState.roles[idx].variationTargets) {
      appState.roles[idx].variationTargets = appState.variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5);
    }
    let v = parseFloat(value);
    if (isNaN(v) || v < 1) v = 1;
    appState.roles[idx].variationTargets[vi] = Math.min(21, v);
  } else if (key === "minContrast") {
    let v = parseFloat(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].minContrast = Math.max(1, Math.min(21, v)).toString();
  } else if (key === "spread") {
    let v = parseInt(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].spread = Math.max(1, Math.min(21, v));
  } else if (key === "baseIndex" || key === "darkBaseIndex") {
    let v = parseInt(value);
    if (isNaN(v)) v = 0;
    appState.roles[idx][key] = Math.max(0, Math.min(appState.colorSteps - 1, v));
  } else {
    appState.roles[idx][key] = value;
  }
  renderRoles();
}

function removeRole(idx) {
  appState.roles.splice(idx, 1);
  renderRoles();
}

function moveRole(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.roles.length) return;
  const [item] = appState.roles.splice(idx, 1);
  appState.roles.splice(target, 0, item);
  renderRoles();
}

function addRole() {
  const n = appState.roles.length + 1;
  const mid = Math.floor(appState.colorSteps / 2);
  appState.roles.unshift({
    _id: generateId(),
    name: "Role " + n,
    shortName: `r-${n}`,
    spread: 2,
    minContrast: 4.5,
    baseIndex: mid,
    darkBaseIndex: mid,
    variationTargets: appState.variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5),
    description: "",
    variationOverride: false,
    roleVariations: [],
  });
  renderRoles();
}

// --- SETTINGS-BASED SHARED VARIATION CRUD ---
function renderSettingsVariations() {
  const container = document.getElementById("settings-variations-list");
  if (!container) return;
  const vars = appState.variations || [];
  const canDelete = vars.length > 1;
  container.innerHTML = vars
    .map(
      (v, idx) => `
          <div class="flex items-center gap-1.5">
            <div class="flex flex-col gap-0.5 shrink-0">
              <button onclick="moveSharedVariation(${idx},-1)" ${idx === 0 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▲</button>
              <button onclick="moveSharedVariation(${idx},1)" ${idx === vars.length - 1 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▼</button>
            </div>
            <input type="text" value="${(v.name || "").replace(/"/g, "&quot;")}" placeholder="Name"
              oninput="updateSharedVariation(${idx},'name',this.value)"
              class="flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
            <input type="text" value="${(v.shortName || "").replace(/"/g, "&quot;")}" placeholder="Short"
              oninput="updateSharedVariation(${idx},'shortName',this.value)"
              class="w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
            <button onclick="removeSharedVariation(${idx})" ${!canDelete ? "disabled" : ""} class="w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[13px]">✕</button>
          </div>
        `,
    )
    .join("");
}

function addSharedVariation() {
  ensureVariations();
  const n = appState.variations.length + 1;
  appState.variations.push({ _id: generateId(), name: String(n), shortName: String(n) });
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function removeSharedVariation(idx) {
  if (appState.variations.length <= 1) return;
  appState.variations.splice(idx, 1);
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function moveSharedVariation(idx, dir) {
  const arr = appState.variations;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function updateSharedVariation(idx, field, value) {
  if (!appState.variations[idx]) return;
  appState.variations[idx][field] = value;
  renderRoles();
  schedulePreview();
}

// --- PER-ROLE VARIATION OVERRIDE HELPERS ---
function getRoleVariations(role) {
  return role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : appState.variations;
}

function toggleRoleVariationOverride(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = !role.variationOverride;
  if (role.variationOverride) {
    if (!role.roleVariations || role.roleVariations.length === 0) {
      role.roleVariations = appState.variations.map((v) => ({ ...v, _id: generateId() }));
    }
  } else {
    role.variationManual = false;
  }
  renderRoles();
  schedulePreview();
}

function toggleRoleVariationManual(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationManual = !role.variationManual;
  renderRoles();
  schedulePreview();
}

function updateRoleVariationTargetInline(roleIdx, varIdx, value) {
  if (!appState.roles[roleIdx].variationTargets) {
    const vLen = getRoleVariations(appState.roles[roleIdx]).length;
    appState.roles[roleIdx].variationTargets = Array.from({ length: vLen }, (_, i) => (appState.pluginMode === "direct" ? [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5 : Math.floor((appState.colorSteps || 25) / 2)));
  }
  appState.roles[roleIdx].variationTargets[varIdx] = parseFloat(value) || 0;
  schedulePreview();
}

function addRoleVariation(roleIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations) role.roleVariations = [];
  const n = role.roleVariations.length + 1;
  role.roleVariations.push({ _id: generateId(), name: String(n), shortName: String(n) });
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function removeRoleVariation(roleIdx, varIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || role.roleVariations.length <= 1) return;
  role.roleVariations.splice(varIdx, 1);
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function moveRoleVariation(roleIdx, varIdx, dir) {
  const arr = appState.roles[roleIdx].roleVariations;
  if (!arr) return;
  const newIdx = varIdx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[varIdx], arr[newIdx]] = [arr[newIdx], arr[varIdx]];
  renderRoles();
  schedulePreview();
}

function updateRoleVariation(roleIdx, varIdx, field, value) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || !role.roleVariations[varIdx]) return;
  role.roleVariations[varIdx][field] = value;
  schedulePreview();
}

function resetRoleVariationsToShared(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = false;
  role.roleVariations = [];
  renderRoles();
  schedulePreview();
}

function toggleBoolSetting(key) {
  appState[key] = !appState[key];
  syncOutputToggles();
  if (key === "allowRoleVariations") renderRoles();
}

function setTokenGrouping(val) {
  appState.variableStructure = val;
  syncOutputToggles();
}

function syncOutputToggles() {
  const tg = appState.variableStructure || "color";
  // Sync all toggle pills (settings sheet + run dialog)
  ["embedDirectly", "useShortColorNames", "useShortRoleNames", "includeGlobalColors", "includeAlphaTints", "allowRoleVariations"].forEach((key) => {
    ["toggle-" + key, "rd-toggle-" + key].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle("on", !!appState[key]);
    });
  });
  // Show/hide constants sub-options
  const constOpts = document.getElementById("constants-options");
  if (constOpts) constOpts.classList.toggle("hidden", !appState.includeGlobalColors);
  const opacRow = document.getElementById("opacity-values-row");
  if (opacRow) opacRow.classList.toggle("hidden", !appState.includeAlphaTints);
  // Sync grouping segment buttons
  [
    ["seg-group-color", "rd-seg-group-color"],
    ["seg-group-role", "rd-seg-group-role"],
  ].forEach(([settingsId, rdId]) => {
    const isColor = tg === "color";
    const isRole = tg === "role";
    const s = document.getElementById(settingsId);
    const r = document.getElementById(rdId);
    if (settingsId.includes("color")) {
      if (s) s.classList.toggle("active", isColor);
      if (r) r.classList.toggle("active", isColor);
    } else {
      if (s) s.classList.toggle("active", isRole);
      if (r) r.classList.toggle("active", isRole);
    }
  });
  // Sync mode toggle buttons
  const isDirect = appState.pluginMode === "direct";
  const mbRamp = document.getElementById("mode-btn-ramp");
  const mbDirect = document.getElementById("mode-btn-direct");
  if (mbRamp) mbRamp.classList.toggle("active", !isDirect);
  if (mbDirect) mbDirect.classList.toggle("active", isDirect);

  // Hide ramp-specific settings in Direct Contrast mode
  const rampSection = document.getElementById("settings-ramp-section");
  if (rampSection) rampSection.classList.toggle("hidden", isDirect);

  // Hide Tonal Scale Collection and Embed Colors Directly in Direct Contrast mode
  const tonalCollRow = document.getElementById("settings-tonal-collection-row");
  if (tonalCollRow) tonalCollRow.classList.toggle("hidden", isDirect);
  const embedDirectlyRow = document.getElementById("settings-embed-directly-row");
  if (embedDirectlyRow) embedDirectlyRow.classList.toggle("hidden", isDirect);

  // Spread Unit visibility: hidden in Direct mode or when Manual is selected
  const spreadUnitRow = document.getElementById("settings-spread-unit-row");
  if (spreadUnitRow) spreadUnitRow.classList.toggle("hidden", isDirect || appState.baseSelection === "Manual");

  // Sync spread unit buttons
  const suSteps = document.getElementById("su-btn-steps");
  const suContrast = document.getElementById("su-btn-contrast");
  if (suSteps) suSteps.classList.toggle("active", (appState.spreadUnit || "steps") === "steps");
  if (suContrast) suContrast.classList.toggle("active", appState.spreadUnit === "contrast");

  // In Direct mode, force Base Selection away from incompatible options
  if (isDirect && appState.baseSelection === "By Index") {
    appState.baseSelection = "By Contrast";
    const bsEl = document.getElementById("setting-baseSelection");
    if (bsEl) bsEl.value = "By Contrast";
  }
  // Hide "By Index" option in Base Selection select when in Direct mode
  const byIndexOpt = document.getElementById("base-selection-opt-byindex");
  if (byIndexOpt) byIndexOpt.hidden = isDirect;

  // Update preview tab label contextually
  const previewTabColors = document.getElementById("preview-tab-colors");
  if (previewTabColors) previewTabColors.textContent = isDirect ? "Solved Colors" : "Tonal Scale";

  renderSettingsVariations();

  // Update settings-sheet name format preview
  const sampleColor = appState.colors && appState.colors[0];
  const sampleRole = appState.roles && appState.roles[0];
  if (sampleColor && sampleRole) {
    const cLabel = appState.useShortColorNames ? sampleColor.shortName || sampleColor.name : sampleColor.name;
    const rLabel = appState.useShortRoleNames ? sampleRole.shortName || sampleRole.name : sampleRole.name;
    const stepLabel = appState.variations && appState.variations[2] ? appState.variations[2].shortName || appState.variations[2].name : "3";
    const preview = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
    const el = document.getElementById("name-format-preview");
    if (el) el.textContent = preview;
  }
}

function setPluginMode(mode) {
  if (mode !== "ramp" && mode !== "direct") return;
  appState.pluginMode = mode;
  syncOutputToggles();
  renderColorGroups();
  renderRoles();
}

// schedulePreview: no-op placeholder (preview is rendered on demand via btn-preview)
function schedulePreview() {}

function setSpreadUnit(unit) {
  appState.spreadUnit = unit;
  syncOutputToggles();
  renderRoles();
}

function updateRoleVariationTarget(roleIdx, varIdx, value) {
  if (!appState.roles[roleIdx].variationTargets) {
    const vLen = getRoleVariations(appState.roles[roleIdx]).length;
    appState.roles[roleIdx].variationTargets = Array.from({ length: vLen }, (_, i) => (appState.pluginMode === "direct" ? [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5 : Math.floor((appState.colorSteps || 25) / 2)));
  }
  appState.roles[roleIdx].variationTargets[varIdx] = parseFloat(value) || 0;
  schedulePreview();
}

function updateSettingsFromInputs() {
  appState.name = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";
  const sanitizeHex = (id) => {
    const el = document.getElementById(id);
    const clean = el.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .toUpperCase()
      .substring(0, 6);
    if (el.value !== clean) el.value = clean;
    return clean;
  };
  if (!appState.themes)
    appState.themes = [
      { name: "light", bg: "FFFFFF" },
      { name: "dark", bg: "000000" },
    ];
  appState.themes[0].bg = sanitizeHex("setting-light-bg");
  appState.themes[1].bg = sanitizeHex("setting-dark-bg");

  // Color Settings
  let wCount = parseInt(document.getElementById("setting-colorSteps").value);
  appState.colorSteps = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  appState.colorStepNames = document.getElementById("setting-colorStepNames").value;

  // Role Settings
  appState.baseSelection = document.getElementById("setting-baseSelection").value;

  // Constants
  appState.globalColorsCollectionName = document.getElementById("setting-globalColorsCollectionName").value.trim() || "_constants";
  appState.alphaValues = document.getElementById("setting-alphaValues").value;

  renderColorGroups();
  renderRoles();
}

function syncUiSettingsInputs() {
  const scaleEl = document.getElementById("setting-ui-scale");
  const themeEl = document.getElementById("setting-ui-theme");
  if (scaleEl) scaleEl.value = String(uiPrefs.scale);
  if (themeEl) themeEl.value = uiPrefs.theme;
}

function syncInputsFromState() {
  document.getElementById("setting-name").value = appState.name || "";
  document.getElementById("setting-tonalScaleCollectionName").value = appState.tonalScaleCollectionName || "_scale";
  document.getElementById("setting-tokenCollectionName").value = appState.tokenCollectionName || "contextual";
  syncOutputToggles();
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
  document.getElementById("setting-light-bg").value = themes[0].bg;
  document.getElementById("setting-dark-bg").value = themes[1].bg;

  // Color Settings
  document.getElementById("setting-colorSteps").value = appState.colorSteps;
  document.getElementById("setting-scaleAlgorithm").value = appState.scaleAlgorithm || "Natural";
  document.getElementById("setting-colorStepNames").value = appState.colorStepNames || "";

  // Role Settings
  document.getElementById("setting-baseSelection").value = appState.baseSelection || "By Contrast";

  // Constants
  document.getElementById("setting-globalColorsCollectionName").value = appState.globalColorsCollectionName || "_constants";
  document.getElementById("setting-alphaValues").value = appState.alphaValues || "10, 25, 50, 75, 90";

  renderSettingsVariations();
}

/**
 * 6. DATA PERSISTENCE & ASYNC BRIDGE
 * Handlers for Figma API syncing, file imports, and data exports.
 */
function validateUniqueness() {
  const colorNames = appState.colors.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
  const colorShorts = appState.colors.map((c) => (c.shortName || "").trim().toLowerCase()).filter(Boolean);
  const roleNames = appState.roles.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
  const roleShorts = appState.roles.map((r) => (r.shortName || "").trim().toLowerCase()).filter(Boolean);
  const hasDup = (arr) => new Set(arr).size !== arr.length;
  if (hasDup(colorNames)) return "Two or more color groups share the same name. Each color name must be unique.";
  if (colorShorts.length && hasDup(colorShorts)) return "Two or more color groups share the same short name. Each color short name must be unique.";
  if (hasDup(roleNames)) return "Two or more roles share the same name. Each role name must be unique.";
  if (roleShorts.length && hasDup(roleShorts)) return "Two or more roles share the same short name. Each role short name must be unique.";
  return null;
}

let pendingScope = "all";
// savedState: the snapshot loaded from Figma on startup — used for rename detection.
// Stays frozen at the originally loaded state; does NOT update as the user edits appState.
let savedState = null;

function handleSubmit(scope = "all") {
  const dupError = validateUniqueness();
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
        savedState: savedState,
      },
    },
    "*",
  );
}

function proceedWithSync() {
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creater", state: appState, scope: pendingScope, savedState: savedState } }, "*");
  }, 50);
}

function renderPreviewPanel(result) {
  const lightBgHex = normalizeHex(appState.themes[0].bg) || "#FFFFFF";
  const darkBgHex = normalizeHex(appState.themes[1].bg) || "#000000";

  // Color Ramps Tab
  const colorEl = document.getElementById("preview-colors");
  colorEl.innerHTML = "";
  if (Object.keys(result.colorRamps).length === 0) {
    colorEl.innerHTML = `<p class="text-[12px] text-[var(--text-muted)] px-1 py-4 text-center">No tonal scale in Direct Contrast mode. Colors are solved directly per variation target.</p>`;
  } else {
    for (const [colorName, ramp] of Object.entries(result.colorRamps)) {
      const baseColor = ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value;
      const section = document.createElement("div");
      section.className = "grid grid-cols-[28px_auto_1fr] grid-rows-[28px_auto] items-center gap-2 mb-2";
      section.innerHTML = `
                <div class="size-6 rounded-md bg-[${baseColor}]"></div>
                <div class="text-[12px] font-bold">${colorName}</div>
                <div class="flex items-center gap-2 text-[12px] font-mono">
                  <span id="spec-num-${colorName}"></span>
                  <span id="spec-hex-${colorName}" class="font-bold"></span>
                  <span id="spec-info-${colorName}" class="ml-auto"></span>
                </div>
                <div id="preview-spectrum" class="col-span-3 flex w-full h-20 rounded-[10px] overflow-hidden [box-shadow:0_10px_30px_#0000001f] border border-[#8888881A] cursor-crosshair"></div>
                `;
      const spectrum = section.querySelector("#preview-spectrum");
      const hexDisplay = section.querySelector(`#spec-hex-${colorName}`);
      const infoDisplay = section.querySelector(`#spec-info-${colorName}`);
      const numDisplay = section.querySelector(`#spec-num-${colorName}`);
      for (const [weight, data] of Object.entries(ramp)) {
        const step = document.createElement("div");
        step.className = `preview-swatch bg-[${data.value}] flex-1 h-full hover:flex-[4] hover:z-10 hover:[transform:scaleY(1.15)] hover:rounded-[8px] hover:[box-shadow:0_15px_40px_#00000044]`;
        step.setAttribute("data-copy", data.value);
        step.onmouseenter = () => {
          hexDisplay.textContent = data.value;
          numDisplay.textContent = weight;
          infoDisplay.textContent = `☀️ ${data.contrast.light.ratio} | ${data.contrast.dark.ratio} 🌙`;
          hexDisplay.style.color = data.value;
        };
        spectrum.appendChild(step);
      }
      colorEl.appendChild(section);
    }
  }

  // Theme tabs helper — varKey is now a numeric string index "0","1",…
  const varLabel = (varKey) => {
    const i = parseInt(varKey);
    if (!isNaN(i) && appState.variations && appState.variations[i]) {
      return appState.variations[i].shortName || appState.variations[i].name;
    }
    return varKey;
  };

  function renderThemePanel(panelId, themeTokens, bgHex) {
    const el = document.getElementById(panelId);
    el.innerHTML = "";

    for (const [colorName, roles] of Object.entries(themeTokens)) {
      const ramp = result.colorRamps[colorName];
      const srcColor = (appState.colors.find((c) => c.name === colorName) || {}).value || "888888";
      const baseColor = ramp ? ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value : `#${srcColor.replace(/^#/, "")}`;

      const section = document.createElement("div");
      section.innerHTML = `
              <div class="grid grid-cols-[32px_1fr_auto]">
                <div class="size-6 rounded-md bg-[${baseColor}]"></div>
                <div class="text-[12px] font-bold">${colorName}</div>
              </div>
              <div class="preview-section-content"></div>`;

      const content = section.querySelector(".preview-section-content");
      for (const [roleName, variations] of Object.entries(roles)) {
        const roleGroup = document.createElement("div");
        roleGroup.className = "mb-2";
        const rName = (appState.roles[roleName] && appState.roles[roleName].name) || roleName;
        roleGroup.innerHTML = `
                <div class="flex items-center gap-1 mb-2">
                  <div class="text-[11px] font-extrabold opacity-40 tracking-[0.15em]">${rName}</div>
                  <div class="flex-1 h-px bg-current opacity-10"></div>
                </div>
                <div class="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]"></div>`;

        const grid = roleGroup.querySelector(".grid");
        for (const [varKey, token] of Object.entries(variations)) {
          if (!token) continue;
          const card = document.createElement("div");
          card.className = "preview-swatch bg-[#8888880d] border border-[#8888881a] rounded-[20px] p-1.5 flex flex-col gap-1.5 transition-all duration-140 ease-in-out cursor-pointer hover:bg-[#8888881a] hover:-translate-y-1 hover:shadow-[0_12px_30px_#0000001f]";
          card.setAttribute("data-copy", token.value);
          card.setAttribute("data-copy-name", token.tknName);

          const contrastColor = (contrastRatio(token.value, "#FFFFFF") || 0) > (contrastRatio(token.value, "#000000") || 0) ? "#FFFFFF" : "#000000";

          card.innerHTML = `
                  <div class="h-20 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center" style="background:${token.value};color:${contrastColor}">
                    <div class="text-2xl font-black tracking-[-0.05em] opacity-90">${token.contrast.ratio}</div>
                    <div class="text-[9px] font-black px-1.5 py-0.5 bg-black/20 backdrop-blur-sm rounded-[6px] border border-white/10 text-white">${token.contrast.rating}</div>
                    ${token.isAdjusted ? `<div class="absolute bottom-2 right-2 bg-[var(--warning)] text-black w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-black">!</div>` : ""}
                  </div>
                  <div class="px-2 pt-1 pb-2">
                    <div class="text-[11px] font-extrabold uppercase tracking-[0.05em] mb-0.5">${varLabel(varKey)}</div>
                    <div class="text-[10px] font-mono opacity-50 font-semibold">${token.value}</div>
                  </div>`;
          grid.appendChild(card);
        }
        content.appendChild(roleGroup);
      }
      el.appendChild(section);
    }
  }

  renderThemePanel("preview-light", result.colorTokens.light, lightBgHex);
  renderThemePanel("preview-dark", result.colorTokens.dark, darkBgHex);

  // Error bar
  const allErrors = result.errors;
  const critCount = allErrors.critical.length;
  const warnCount = allErrors.warnings.length;
  const errBar = document.getElementById("preview-errors-bar");
  if (critCount + warnCount > 0) {
    errBar.classList.remove("hidden");
    document.getElementById("preview-errors-count").textContent = `${critCount} critical · ${warnCount} warnings`;
    const body = document.getElementById("preview-errors-body");
    body.innerHTML = "";
    for (const e of allErrors.critical) {
      const item = document.createElement("div");
      item.className = "py-1 px-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]";
      item.textContent = `⛔ ${e.color} · ${e.role} [${e.theme}]: ${e.error}`;
      body.appendChild(item);
    }
    for (const e of allErrors.warnings) {
      const item = document.createElement("div");
      item.className = "py-1 px-3 text-[10px] text-[var(--warning)] border-t border-[var(--border)]";
      item.textContent = `⚠️ ${e.color} · ${e.role} [${e.theme}]: ${e.warning}`;
      body.appendChild(item);
    }
  } else {
    errBar.classList.add("hidden");
  }
}

function togglePreviewErrors() {
  document.getElementById("preview-errors-body").classList.toggle("open");
}

function toggleRunErrors() {
  document.getElementById("run-errors-body").classList.toggle("open");
}

function renderRunErrors(errors) {
  const bar = document.getElementById("run-errors-bar");
  const body = document.getElementById("run-errors-body");
  if (!errors) {
    bar.classList.add("hidden");
    return;
  }
  const critCount = errors.critical.length;
  const warnCount = errors.warnings.length;
  if (critCount + warnCount === 0) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  document.getElementById("run-errors-count").textContent = `${critCount} critical · ${warnCount} warnings`;
  body.innerHTML = "";
  for (const e of errors.critical) {
    const item = document.createElement("div");
    item.className = "py-1 px-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]";
    item.textContent = `⛔ ${e.color} · ${e.role} [${e.theme}]: ${e.error}`;
    body.appendChild(item);
  }
  for (const w of errors.warnings) {
    const item = document.createElement("div");
    item.className = "py-1 px-3 text-[10px] text-[var(--warning)] border-t border-[var(--border)]";
    item.textContent = `⚠ ${w.color} · ${w.role}${w.variation ? ` · ${w.variation}` : ""} [${w.theme}]: ${w.warning}`;
    body.appendChild(item);
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (t) {
    document.getElementById("toast-msg").textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
  }
}

// Copy-to-clipboard inside preview (delegated)
document.addEventListener("click", async (e) => {
  const swatch = e.target.closest(".preview-swatch[data-copy]");
  if (!swatch) return;

  const val = swatch.getAttribute("data-copy");
  const name = swatch.getAttribute("data-copy-name");

  try {
    // Alt+Click copies the name
    const text = e.altKey && name ? name : val;
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${text}`);
  } catch (_) {}
});

// Preview tab switching
document.getElementById("preview-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".preview-tab-btn");
  if (!btn) return;

  const target = btn.dataset.target;
  const overlay = document.getElementById("preview-overlay");

  // Remove old theme classes
  overlay.classList.remove("theme-light", "theme-dark", "theme-ramps");

  // Add new theme class
  if (target === "preview-light") overlay.classList.add("theme-light");
  else if (target === "preview-dark") overlay.classList.add("theme-dark");
  else overlay.classList.add("theme-ramps");

  document.querySelectorAll(".preview-tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".preview-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(target).classList.add("active");
});

// 6. INITIALIZATIONS & GLOBAL LISTENERS
document.getElementById("btn-settings").onclick = () => showSheet("settings-sheet");
document.getElementById("btn-more").onclick = () => showSheet("more-sheet");
document.getElementById("overlay").onclick = hideSheets;
document.getElementById("close-settings").onclick = () => {
  updateSettingsFromInputs();
  hideSheets();
};

document.getElementById("setting-ui-scale").addEventListener("change", (e) => {
  uiPrefs.scale = parseFloat(e.target.value) || 1.0;
  applyUiPrefs();
  saveUiPrefs();
});
document.getElementById("setting-ui-theme").addEventListener("change", (e) => {
  uiPrefs.theme = e.target.value;
  applyUiPrefs();
  saveUiPrefs();
});
document.getElementById("close-more").onclick = hideSheets;
document.getElementById("btn-run").onclick = () => handleSubmit("all");
document.getElementById("btn-import").onclick = () => document.getElementById("file-input").click();

document.getElementById("btn-preview").onclick = () => {
  const result = variableMakerUI(translateConfigForPreview(appState));
  // Reset to Color Ramps tab each time
  document.querySelectorAll(".preview-tab-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  document.querySelectorAll(".preview-panel").forEach((p, i) => p.classList.toggle("active", i === 0));
  renderPreviewPanel(result);
  showOverlay("preview-overlay");
};

document.getElementById("preview-close").onclick = () => {
  hideOverlay("preview-overlay");
  document.getElementById("preview-overlay").classList.remove("theme-light", "theme-dark", "theme-ramps");
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

// Initial Render
ensureVariations();
renderColorGroups();

// Export filename helper — systemName_type_YYYY-MM-DD_HH-MM.ext
function exportFileName(type, ext) {
  const name = (appState.name || "design_system").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  return `${name}_${type}_${date}_${time}.${ext}`;
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

// Export Options
document.getElementById("opt-save-config").onclick = () => {
  triggerDownload(JSON.stringify(appState, null, 2), exportFileName("config", "json"), "application/json");
  hideSheets();
};

document.getElementById("opt-export-css").onclick = () => {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "css" } }, "*");
  hideSheets();
};

document.getElementById("opt-export-csv").onclick = () => {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "csv" } }, "*");
  hideSheets();
};

document.getElementById("opt-export-scss").onclick = () => {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "scss" } }, "*");
  hideSheets();
};

// --- IMPORT & SAFETY LOGIC ---
function isStateDirty() {
  return JSON.stringify(appState) !== _demoConfigStr;
}

function validateImportData(json) {
  return json && typeof json === "object" && Array.isArray(json.colors) && Array.isArray(json.roles);
}

function handleFileSelection(file) {
  if (!file.name.toLowerCase().endsWith(".json")) {
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = "Please upload a valid .json file.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target.result);
      if (!validateImportData(json)) {
        throw new Error("JSON structure is incompatible with ctm316 system.");
      }

      if (isStateDirty()) {
        showConfirmationWorkflow(json);
      } else {
        applyImport(json);
      }
    } catch (err) {
      showOverlay("error-overlay");
      document.getElementById("error-message").textContent = err.message || "Failed to parse JSON.";
    }
  };
  reader.readAsText(file);
}

function showConfirmationWorkflow(pendingData) {
  showOverlay("confirm-import-overlay");

  // Save current and then import
  document.getElementById("btn-import-save").onclick = () => {
    document.getElementById("opt-save-config").click(); // Reuse existing save logic
    applyImport(pendingData);
    hideOverlay("confirm-import-overlay");
  };

  // Overwrite directly
  document.getElementById("btn-import-now").onclick = () => {
    applyImport(pendingData);
    hideOverlay("confirm-import-overlay");
  };
}

function applyImport(json) {
  // Merge with defaults to ensure missing settings (if any from older versions) are populated
  appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), json);
  // Normalize fields that web app exports as arrays but plugin expects as comma-strings
  if (Array.isArray(appState.colorStepNames)) appState.colorStepNames = appState.colorStepNames.join(", ");
  // Normalize theme names to lowercase so variableMaker keys always match
  if (Array.isArray(appState.themes)) appState.themes = appState.themes.map((t) => Object.assign({}, t, { name: t.name.toLowerCase() }));
  ensureIds(appState); // migrate imported configs that predate the _id field
  ensureVariations();
  savedState = null; // an import is a full replace — no snapshot to diff against
  renderColorGroups();
  renderRoles();
  syncInputsFromState();
  // Clear any stale run-error messages left from a previous sync before showing import result.
  const errBar = document.getElementById("run-errors-bar");
  if (errBar) errBar.innerHTML = "";
  showOverlay("success-overlay");
  document.getElementById("success-results").innerHTML = `<p class="text-sm font-medium">Successfully imported <span class="text-white">${appState.name || "config"}</span></p>`;
}

// Drag & Drop Listeners
// Only activate the file-import overlay for external file drags, not internal card reorders.
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer || !e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  document.getElementById("drop-overlay").classList.add("active");
});

window.addEventListener("dragover", (e) => {
  if (!e.dataTransfer || !e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
});

document.getElementById("drop-overlay").addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.getElementById("drop-overlay").addEventListener("dragleave", (e) => {
  document.getElementById("drop-overlay").classList.remove("active");
});

document.getElementById("drop-overlay").addEventListener("drop", (e) => {
  e.preventDefault();
  document.getElementById("drop-overlay").classList.remove("active");
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelection(file);
});

document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (file) handleFileSelection(file);
  e.target.value = ""; // Clear for next selection
};

document.getElementById("opt-clear").onclick = () => {
  if (confirm("Are you sure you want to clear all data? This will reset the system to defaults.")) {
    appState = JSON.parse(JSON.stringify(demoConfig));
    ensureIds(appState); // fresh IDs so a subsequent sync doesn't wrongly rename
    ensureVariations();
    savedState = null; // no snapshot to diff against after a full reset
    renderColorGroups();
    renderRoles();
    syncInputsFromState();
  }
};

/**
 * 7. BACKEND COMMUNICATION HUB (FIGMA BRIDGE)
 * Handles all incoming postMessage traffic from code.js.
 */
document.getElementById("btn-sync-confirm").onclick = () => {
  hideOverlay("confirm-sync-overlay");
  proceedWithSync();
};

document.getElementById("btn-run-confirm").onclick = () => {
  hideOverlay("run-dialog-overlay");
  proceedWithSync();
};

// Store last collection check result so refreshRunDialog can re-render without a round-trip
let lastCollectionCheckResult = [];
let lastRenameData = null; // rename summary from the last check-collections response

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
  const isDirect = appState.pluginMode === "direct";
  const skipRamps = appState.embedDirectly || isDirect;
  const tg = appState.variableStructure || "color";
  const shortC = appState.useShortColorNames;
  const shortR = appState.useShortRoleNames;
  const scope = pendingScope || "all";

  // Sync all toggle states (settings sheet + run dialog)
  syncOutputToggles();

  // Hide scope selector and skip-ramps toggle in Direct Contrast mode
  const scopeSection = document.getElementById("rd-scope-section");
  if (scopeSection) scopeSection.classList.toggle("hidden", isDirect);
  const skipRampsRow = document.getElementById("rd-skip-ramps-row");
  if (skipRampsRow) skipRampsRow.classList.toggle("hidden", isDirect);

  // Collections
  const colsEl = document.getElementById("rd-collections");
  if (colsEl) {
    const rows = [];
    if (!skipRamps && scope !== "roles") {
      const rampsExists = existing.includes(colorName);
      rows.push(collectionRow(colorName, rampsExists ? "UPDATE" : "CREATE", rampsExists));
    }
    if (scope !== "groups") {
      const ctxExists = existing.includes(ctxName);
      rows.push(collectionRow(ctxName, ctxExists ? "UPDATE" : "CREATE", ctxExists));
    }
    if (appState.includeGlobalColors) {
      const constName = appState.globalColorsCollectionName || "_constants";
      const constExists = existing.includes(constName);
      rows.push(collectionRow(constName, constExists ? "UPDATE" : "CREATE", constExists));
    }
    colsEl.innerHTML = rows.length ? rows.join("") : `<p class="text-[12px] text-[var(--text-muted)] px-1">No collections will be modified for this scope.</p>`;
  }

  // Name preview
  const sampleColor = appState.colors[0] || { name: "Primary", shortName: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shortName: "tx" };
  const cLabel = shortC ? sampleColor.shortName || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shortName || sampleRole.name : sampleRole.name;
  const stepLabel = appState.variations && appState.variations[2] ? appState.variations[2].shortName || appState.variations[2].name : "3";
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
    const totalRenames = rampCount + ctxCount;

    if (totalRenames > 0 && changes.length > 0) {
      renameEl.classList.remove("hidden");
      const typeLabels = { color: "Color", role: "Role", stepNames: "Scale Steps", roleStepNames: "Variation Levels", grouping: "Grouping" };
      let html = "";
      for (const ch of changes) {
        const label = typeLabels[ch.type] || ch.type;
        html += `<div class="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0">
                <span class="text-[11px] text-[var(--text-muted)] w-[68px] shrink-0">${label}</span>
                <span class="text-[11px] font-mono text-[var(--text-primary)] truncate flex-1">${ch.from}</span>
                <span class="text-[11px] text-[var(--accent)] shrink-0 px-0.5">→</span>
                <span class="text-[11px] font-mono text-[var(--accent)] truncate flex-1">${ch.to}</span>
              </div>`;
      }
      html += `<div class="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"></span>
              <span>${[rampCount > 0 ? `${rampCount} scale var${rampCount > 1 ? "s" : ""}` : "", ctxCount > 0 ? `${ctxCount} token var${ctxCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")} will be renamed</span>
            </div>`;
      renameListEl.innerHTML = html;
    } else {
      renameEl.classList.add("hidden");
    }
  }

  // Summary
  const sumEl = document.getElementById("rd-summary");
  if (sumEl) {
    const colorList = appState.colors.map((c) => `${c.name}${c.shortName ? ` (${c.shortName})` : ""}`).join(", ");
    const roleList = appState.roles.map((r) => `${r.name}${r.shortName ? ` (${r.shortName})` : ""}`).join(", ");
    sumEl.innerHTML = [
      summaryRow("System", appState.name || "—"),
      summaryRow("Colors", `${appState.colors.length}: ${colorList}`),
      summaryRow("Roles", `${appState.roles.length}: ${roleList}`),
      summaryRow("Mode", appState.pluginMode === "direct" ? "Direct Contrast" : "Tonal Scale"),
      ...(appState.pluginMode === "direct"
        ? []
        : [
            summaryRow("Base Selection", appState.baseSelection || "By Contrast"),
            ...(appState.baseSelection !== "Manual" ? [summaryRow("Spread Unit", (appState.spreadUnit || "steps") === "contrast" ? "Contrast Gap" : "Steps")] : []),
            summaryRow("Color Steps", String(appState.colorSteps || 25)),
            summaryRow("Scale Algorithm", appState.scaleAlgorithm || "Natural"),
          ]),
    ].join("");
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

  function collectionRow(name, label, isExisting) {
    return `<div class="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2">
            <span class="text-[13px] text-[var(--text-primary)] font-mono">${name}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}">${label}</span>
          </div>`;
  }

  function summaryRow(label, value) {
    return `<div class="flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0">
            <span class="text-[var(--text-muted)] shrink-0">${label}</span>
            <span class="text-[var(--text-primary)] text-right text-[11px]">${value}</span>
          </div>`;
  }
}

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;

  if (msg.type === "collection-check-result") {
    lastCollectionCheckResult = msg.existing || [];
    lastRenameData = msg.renames || null;
    setRunScope(pendingScope || "all"); // initialises scope buttons + calls refreshRunDialog
    showOverlay("run-dialog-overlay");
    return;
  }

  if (msg.type === "load-config") {
    // Silently restore saved state without showing any overlay.
    // ensureIds migrates older snapshots that predate the _id field.
    ensureIds(msg.state);
    savedState = JSON.parse(JSON.stringify(msg.state)); // deep-freeze for rename detection
    appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), msg.state);
    ensureIds(appState);
    ensureVariations();
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
  }

  if (msg.type === "finish") {
    hideOverlay("loading-overlay");
    document.getElementById("run-errors-body").classList.remove("open");
    showOverlay("success-overlay");
    document.getElementById("success-results").innerHTML = `
            <p class="text-sm">Created: <span class="text-white font-bold">${msg.tally.created}</span></p>
            <p class="text-sm">Updated: <span class="text-white font-bold">${msg.tally.updated}</span></p>
            ${msg.tally.renamed > 0 ? `<p class="text-sm">Renamed: <span class="text-blue-300 font-bold">${msg.tally.renamed}</span></p>` : ""}
            <p class="text-sm">Failed: <span class="text-red-400 font-bold">${msg.tally.failed}</span></p>
          `;
    renderRunErrors(msg.errors || null);
  }
  if (msg.type === "capabilities") {
    if (!msg.capabilities.multiMode) {
      BannerManager.warn("Multiple modes per collection require a paid Figma plan.", {
        id: "cap-multimode",
        title: "Figma Plan Restriction",
        detail: "Only the light theme will be written to the token collection. Dark theme variables will be skipped to avoid overwriting light values in the wrong mode. Upgrade to a paid Figma plan to unlock both themes.",
        dismissable: true,
      });
    }
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

/**
 * 8. RESIZE & BOOT
 */

// Resize Logic
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

// Main Boot
renderColorGroups();
renderRoles();
syncInputsFromState();
syncUiSettingsInputs();
applyUiPrefs();
