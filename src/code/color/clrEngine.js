/**
 * ============================================================================
 * CLR ENGINE  —  pure, stateless color token generation engine.
 * No DOM · No Figma API · No cache · No side effects.
 * Requires clrUtils.js to be loaded first (provides color math primitives).
 *
 * ┌─ CALLABLE INDEPENDENTLY ──────────────────────────────────────────────────┐
 * │  tonalScaleMaker(hex, length, algo)            → hex[]                    │
 * │  solveColorForContrast(src, target, bg, mode)  → result object            │
 * │  validateVariationContrasts(targets)           → { valid, errors }        │
 * │  hexToOklch(hex)                               → { L, C, H }             │
 * │  oklchToHex(L, C, H)                           → "#rrggbb"               │
 * │  hexToHct(hex)                                 → { h, c, t }             │
 * │  hctToHex(hue, ch, tone)                       → "#rrggbb"               │
 * │  variableMaker(config)                         → { tonalScales,           │
 * │                                                    colorTokens, errors }  │
 * └───────────────────────────────────────────────────────────────────────────┘
 * ============================================================================
 */

// ── SOLVER CONSTANTS ──────────────────────────────────────────────────────────

/** Valid mode strings for solveColorForContrast */
const SOLVER_MODES = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
const OVERSHOOT_WARN = 0.3; // attach warning when achieved contrast overshoots target by this much
const MAX_ITER = 60; // binary search iterations when solving for L
const L_EPS = 1e-5; // convergence threshold for L binary search

// ── TONAL SCALE ALGORITHMS ────────────────────────────────────────────────────
// Each strategy receives (hue, satu, N, stepLum, findL, extras) from tonalScaleMaker.
// Strategies that operate in their own color space (OKLCH, Material) ignore
// hue/satu/findL and use their own internal binary search instead.

const TONAL_SCALE_ALGO = {
  /** Even HSL lightness increments — fast, not perceptually uniform */
  Linear: (hue, satu, N) => {
    const inc = 100 / (N + 1);
    const out = [];
    for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
    return out.reverse();
  },

  /** Perceptually uniform relative-luminance steps in HSL */
  Uniform: (hue, satu, N, stepLum, findL) => {
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
  },

  /** Uniform + chroma tapering near white/black (mimics real pigment mixing) */
  Natural: (hue, satu, N, stepLum, findL) => {
    const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, () => hue);
      out.push(hslToHex(hue, tapS(L), L) || "#000000");
    }
    return out;
  },

  /** Natural + subtle hue rotation: warm at light end, cool at dark end */
  Expressive: (hue, satu, N, stepLum, findL) => {
    const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
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
  },

  /**
   * Log-luminance scale anchored to the source color.
   * Source luminance becomes the midpoint; steps spread geometrically above and below.
   * Uses findL for HSL binary search — stepLum is intentionally bypassed here.
   */
  Symmetric: (hue, satu, N, _stepLum, findL, { hexIn, uMax, uMin }) => {
    const srcLum = relLum(normalizeHex(hexIn)) || 0.18;
    const uSrc = Math.log(srcLum + 0.05); // log-luminance of source color
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
  },

  /**
   * Uniform luminance steps in OKLCH space.
   * Preserves source hue (H) and chroma (C) — only L changes per step.
   * hue/satu/findL from HSL world are not used here.
   */
  OKLCH: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
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
  },

  /**
   * Uniform luminance steps in HCT space (Material You tonal palette behaviour).
   * Preserves source HCT hue and chroma — searches tone (CIE L*) to match luminance.
   * hue/satu/findL from HSL world are not used here.
   */
  Material: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
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
  },
};

/**
 * Generate a tonal color scale from a seed hex color.
 * Steps are spaced geometrically in log-luminance so perceptual contrast between
 * adjacent steps is consistent across the full lightness range.
 *
 * @param {string} hexIn        - seed color e.g. "#3B82F6"
 * @param {number} scaleLength  - number of steps e.g. 11 or 25
 * @param {string} [scaleAlgo]  - algorithm: "Linear"|"Uniform"|"Natural"|"Expressive"|"Symmetric"|"OKLCH"|"Material" (default "Natural")
 * @returns {string[]} hex colors from light to dark
 */
function tonalScaleMaker(hexIn, scaleLength, scaleAlgo) {
  scaleAlgo = scaleAlgo || "Natural";
  const hue = hexToHue(hexIn);
  const satu = hexToSat(hexIn);
  const N = scaleLength;

  // Geometric luminance range — C_max is the contrast ratio of the lightest vs darkest step.
  // uMax/uMin are the log-luminance bounds of the scale.
  const C_max = (21 * N) / (N + 1);
  const uMax = Math.log(0.05 * C_max);
  const uMin = Math.log(1.05 / C_max);

  /** Target relative luminance for step i — evenly spaced in log-luminance */
  const stepLum = (i) => {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  };

  /** Binary search: find HSL L (0–100) that produces the target relative luminance */
  const findL = (targetLum, getS, getH) => {
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
  };

  const strategy = TONAL_SCALE_ALGO[scaleAlgo] || TONAL_SCALE_ALGO.Natural;
  return strategy(hue, satu, N, stepLum, findL, { hexIn, uMax, uMin });
}

// ── TOKEN PIPELINE ────────────────────────────────────────────────────────────
// variableMaker is the single entry point for full token generation.
// It delegates to either tonal or direct sub-pipelines per pluginMode.
// All _prefixed functions below are private to this section.

/**
 * Run the full color token generation pipeline.
 * Pure — no cache, no state. Same config always returns the same output.
 * Cache lives in main.js (_runEngine wraps this with a hash check).
 *
 * @param {object}   config
 * @param {object[]} config.colors           - [{ name, value, shorthand, description, solverMode }]
 * @param {object[]} config.themes           - [lightTheme, darkTheme], each { name, bg }
 * @param {number}   config.scaleLength      - Tonal scale step count
 * @param {string[]} [config.scaleStepNames] - custom step labels; defaults to [1…N]
 * @param {string}   config.scaleAlgorithm  - tonal algorithm name
 * @param {string}   config.pluginMode       - "tonal" | "adaptiveEngine"
 * @param {object[]} config.roles            - semantic role definitions
 * @param {string}   config.roleMapping      - "By Contrast" | "By Index"
 * @param {any[]}    config.variations       - variation slot definitions
 * @param {string}   config.spreadUnit       - "contrast" | "step"
 * @param {string}   config.baseSelectionMode - "Manual" | "Auto"
 * @returns {{ tonalScales: object, colorTokens: object, errors: object }}
 */
function variableMaker(config) {
  const { colors, themes, scaleLength } = config;
  const errors = { critical: [], warnings: [], notices: [] };

  const tonalScales = config.pluginMode !== "adaptiveEngine" ? _generateTonalScales(colors, scaleLength, config.scaleAlgorithm, config.scaleStepNames, themes) : Object.create(null);

  const tokensCollection = {};
  for (const mode of themes) tokensCollection[mode.name.toLowerCase()] = {};
  for (const mode of themes) {
    const modeName = mode.name.toLowerCase();
    const themeTokens = tokensCollection[modeName];
    for (const color of colors) {
      themeTokens[color.name] = {};
      if (config.pluginMode === "adaptiveEngine") {
        _solveDirectMode(color, mode, config, themeTokens[color.name], errors);
      } else {
        _processTonalMode(color, mode, config, tonalScales, themeTokens[color.name], errors);
      }
    }
  }
  return { tonalScales: tonalScales, colorTokens: tokensCollection, errors };
}

/**
 * Build tonal scales for all colors. Each step stores value, naming, and contrast ratios against both light and dark backgrounds.
 * @returns {object} { [colorName]: { [stepName]: { value, stepName, shorthand, description, contrast } } }
 */
function _generateTonalScales(colors, scaleLength, scaleAlgo, stepNames, themes) {
  const collection = Object.create(null);
  const names = stepNames || seriesMaker(scaleLength);
  const themeBgs = themes.map((t) => ({ key: t.name.toLowerCase(), bg: normalizeHex(t.bg) || "#FFFFFF" }));
  for (const color of colors) {
    const rampData = tonalScaleMaker(color.value, scaleLength, scaleAlgo);
    const ramp = Object.create(null);
    collection[color.name] = ramp;
    for (let i = 0; i < scaleLength; i++) {
      const value = normalizeHex(rampData[i]);
      const weight = names[i];
      const contrast = {};
      for (const { key, bg } of themeBgs) {
        contrast[key] = { ratio: contrastRatio(value, bg), rating: contrastRating(value, bg) };
      }
      ramp[weight] = {
        value,
        stepName: `${color.name}-${weight}`,
        shorthand: `${color.shorthand}-${weight}`,
        description: color.description || "",
        contrast,
      };
    }
  }
  return collection;
}

/**
 * Direct mode: solve a hex color per role × variation using the contrast solver.
 * Contrast targets come from role.variationTargets (Manual) or baseContrast ± contrastGap (Auto).
 */
function _solveDirectMode(color, mode, config, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const bgHex = mode.bg;
  const solverMode = color.solverMode || "natural";

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});
    const variations = role.variationOverride && role.roleVariations && role.roleVariations.length ? role.roleVariations : config.variations;

    let targets;
    if (config.baseSelectionMode === "Manual") {
      targets = role.variationTargets || variations.map((_, i) => [1.5, 3, 4.5, 7, 12][i] || 1.5 + i * 1.5);
      const check = validateVariationContrasts(targets);
      if (!check.valid) {
        check.errors.forEach((err) => errors.critical.push({ color: color.name, role: role.name, theme: modeName, error: err }));
        continue;
      }
    } else {
      // Auto: spread contrast targets symmetrically around baseContrast
      const baseVarIdx = Math.floor(variations.length / 2);
      targets = variations.map((_, vi) => Math.max(1.01, role.baseContrast + (vi - baseVarIdx) * role.contrastGap));
    }

    targets.forEach((targetContrast, vi) => {
      const variation = String(vi);
      const solved = solveColorForContrast(color.value, targetContrast, bgHex, solverMode);
      if (solved.warning) errors.warnings.push({ color: color.name, role: role.name, variation, theme: modeName, warning: solved.warning });
      if (solved.chromaReduced) errors.notices.push({ color: color.name, role: role.name, variation, theme: modeName, notice: "Chroma reduced to fit gamut." });
      roleOutput[variation] = {
        tknName: `${color.name}-${role.name}-${variation}`,
        color: color.name,
        role: role.name,
        variation,
        roleDescription: role.description || "",
        value: solved.hex,
        contrast: { ratio: solved.achievedContrast, rating: contrastRating(solved.hex, bgHex) },
        contrastTarget: targetContrast,
        isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
      };
    });
  }
}

/**
 * Tonal mode: map ramp steps to role × variation tokens.
 * Delegates to one of three mapping strategies based on config.
 */
function _processTonalMode(color, mode, config, tonalScales, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const isDark = relLum(normalizeHex(mode.bg) || "#FFFFFF") < 0.4;
  const tonalScale = tonalScales[color.name];
  const stepNames = config.scaleStepNames || seriesMaker(config.scaleLength);

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});
    const variations = role.variationOverride && role.roleVariations && role.roleVariations.length ? role.roleVariations : config.variations;

    if (config.baseSelectionMode === "Manual") {
      _mapManualSteps(color, role, variations, tonalScale, stepNames, modeName, roleOutput);
    } else if (config.spreadUnit === "contrast") {
      _mapByContrastTarget(color, role, variations, tonalScale, stepNames, modeName, isDark, roleOutput, errors);
    } else {
      _mapByStepOffset(color, role, variations, tonalScale, stepNames, modeName, isDark, roleOutput, config.roleMapping, errors);
    }
  }
}

/** Manual: each variation is pinned to an explicit step index from role.variationTargets */
function _mapManualSteps(color, role, variations, ramp, stepNames, modeName, output) {
  const targets = role.variationTargets || variations.map((_, i) => Math.floor((stepNames.length * i) / Math.max(1, variations.length - 1)));
  variations.forEach((_, vi) => {
    const idx = Math.max(0, Math.min(stepNames.length - 1, parseInt(targets[vi]) || 0));
    const data = ramp[stepNames[idx]];
    output[vi] = { tknName: `${color.name}-${role.name}-${vi}`, color: color.name, role: role.name, variation: String(vi), roleDescription: role.description || "", tknRef: data.stepName, value: data.value, contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating } };
  });
}

/**
 * Contrast-target: find the ramp step whose contrast ratio is closest to
 * baseContrast ± (contrastGap × variation offset).
 */
function _mapByContrastTarget(color, role, variations, ramp, stepNames, modeName, isDark, output, errors) {
  const baseC = _findBaseContrast(role, ramp, stepNames, modeName, isDark);
  const baseVarIdx = Math.floor(variations.length / 2);
  variations.forEach((_, vi) => {
    const targetC = baseC + (vi - baseVarIdx) * role.contrastGap;
    let bestIdx = 0,
      bestDiff = Infinity;
    stepNames.forEach((name, si) => {
      const diff = Math.abs(ramp[name].contrast[modeName].ratio - targetC);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = si;
      }
    });
    const data = ramp[stepNames[bestIdx]];
    output[vi] = {
      tknName: `${color.name}-${role.name}-${vi}`,
      color: color.name,
      role: role.name,
      variation: String(vi),
      roleDescription: role.description || "",
      tknRef: data.stepName,
      value: data.value,
      contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
      contrastTarget: targetC,
      isAdjusted: bestDiff > 0.5,
    };
    if (bestDiff > 0.5) errors.warnings.push({ color: color.name, role: role.name, variation: String(vi), theme: modeName, warning: `Target contrast ${targetC.toFixed(2)} not available.` });
  });
}

/**
 * Step-offset: walk `spread` steps around baseIdx per variation.
 * growthDir (+1 or -1) accounts for ramps that increase contrast toward either end.
 * baseIdx is clamped so no variation falls off the ramp.
 */
function _mapByStepOffset(color, role, variations, ramp, stepNames, modeName, isDark, output, mappingType, errors) {
  let baseIdx = mappingType === "By Contrast" ? _findBaseIndexByContrast(role, ramp, stepNames, modeName, isDark, color.name, role.name, errors) : _findBaseIndexExplicit(role, stepNames, isDark);

  const baseVarIdx = Math.floor(variations.length / 2);
  const spread = role.spread;
  const minAllowed = baseVarIdx * spread;
  const maxAllowed = stepNames.length - 1 - minAllowed;
  if (baseIdx < minAllowed || baseIdx > maxAllowed) {
    baseIdx = Math.max(minAllowed, Math.min(maxAllowed, baseIdx));
    errors.warnings.push({ color: color.name, role: role.name, theme: modeName, warning: "Base index clamped for spread." });
  }

  // +1 if contrast grows toward the end of the ramp (typical for light mode), -1 if reversed
  const growthDir = ramp[stepNames[stepNames.length - 1]].contrast[modeName].ratio > ramp[stepNames[0]].contrast[modeName].ratio ? 1 : -1;
  variations.forEach((_, vi) => {
    let idx = baseIdx + (vi - baseVarIdx) * spread * growthDir;
    const adjusted = idx < 0 || idx >= stepNames.length;
    idx = Math.max(0, Math.min(stepNames.length - 1, idx));
    const data = ramp[stepNames[idx]];
    output[vi] = {
      tknName: `${color.name}-${role.name}-${vi}`,
      color: color.name,
      role: role.name,
      variation: String(vi),
      roleDescription: role.description || "",
      tknRef: data.stepName,
      value: data.value,
      contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
      isAdjusted: adjusted,
    };
  });
}

/** Returns the contrast ratio of the base ramp step for a role (used by contrast-target mapping) */
function _findBaseContrast(role, ramp, stepNames, modeName, isDark) {
  if (role.baseIndex !== undefined) {
    const idxSource = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
    return ramp[stepNames[Math.max(0, Math.min(stepNames.length - 1, parseInt(idxSource) || 0))]].contrast[modeName].ratio;
  }
  const minC = parseFloat(role.minContrast) || 4.5;
  const step = stepNames.find((n) => ramp[n].contrast[modeName].ratio >= minC) || stepNames[stepNames.length >> 1];
  return ramp[step].contrast[modeName].ratio;
}

/**
 * Find the ramp index of the first step meeting role.minContrast.
 * Dark mode searches from the end (darkest = highest contrast on dark bg).
 * Falls back to best available and logs a critical error if minContrast is unachievable.
 */
function _findBaseIndexByContrast(role, ramp, stepNames, modeName, isDark, colorName, roleName, errors) {
  const minC = parseFloat(role.minContrast) || 4.5;
  let baseIdx = -1;
  if (isDark) {
    for (let i = stepNames.length - 1; i >= 0; i--) {
      if (ramp[stepNames[i]].contrast[modeName].ratio >= minC) {
        baseIdx = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < stepNames.length; i++) {
      if (ramp[stepNames[i]].contrast[modeName].ratio >= minC) {
        baseIdx = i;
        break;
      }
    }
  }
  if (baseIdx === -1) {
    let bestIdx = 0,
      maxC = -1;
    stepNames.forEach((name, i) => {
      const c = ramp[name].contrast[modeName].ratio;
      if (c > maxC) {
        maxC = c;
        bestIdx = i;
      }
    });
    baseIdx = bestIdx;
    errors.critical.push({ color: colorName, role: roleName, theme: modeName, error: `Cannot meet minimum contrast ${minC}. using closest available (${maxC.toFixed(2)}).` });
  }
  return baseIdx;
}

/** Use explicit baseIndex (or darkBaseIndex for dark mode) as the base ramp position */
function _findBaseIndexExplicit(role, stepNames, isDark) {
  const source = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
  return Math.max(0, Math.min(stepNames.length - 1, parseInt(source) || 0));
}

// ── COLOR SPACES ──────────────────────────────────────────────────────────────
// OKLCH and HCT conversions. Internal matrix helpers prefixed with _.
// These functions are independently callable — no dependency on the sections above.

// ── OKLCH ─────────────────────────────────────────────────────────────────────
// Perceptually uniform color space (Björn Ottosson).
// Works directly in linRGB ↔ LMS — no XYZ intermediate needed.

/** hex → [R_lin, G_lin, B_lin] via srgbLinearize */
function _h2lr(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [srgbLinearize((n >> 16) & 255), srgbLinearize((n >> 8) & 255), srgbLinearize(n & 255)];
}

/** [R_lin, G_lin, B_lin] → "#rrggbb" via srgbDelinearize */
function _lr2h(r, g, b) {
  const cl = (v) => srgbDelinearize(Math.max(0, v));
  return "#" + [cl(r), cl(g), cl(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** 3×3 matrix × 3-vector */
function _m3(m, v) {
  return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
}

// linRGB ↔ LMS  (M1 forward, M1i inverse)
const _M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const _M1i = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];
// LMS^(1/3) ↔ Lab  (M2 forward, M2i inverse)
const _M2 = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const _M2i = [
  [1.0, 0.3963377774, 0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.291485548],
];

/**
 * Convert a hex color to OKLCH.
 * @param {string} hex - "#RRGGBB"
 * @returns {{ L: number, C: number, H: number }} L 0–1 · C ≥ 0 · H 0–360
 */
function hexToOklch(hex) {
  const [r, g, b] = _h2lr(hex);
  const lms = _m3(_M1, [r, g, b]).map((v) => Math.cbrt(Math.max(0, v)));
  const [L, a, b2] = _m3(_M2, lms);
  return { L, C: Math.sqrt(a * a + b2 * b2), H: ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360 };
}

/**
 * Convert OKLCH to hex. Out-of-gamut values are clamped channel-by-channel.
 * @param {number} L - Lightness 0–1
 * @param {number} C - Chroma ≥ 0
 * @param {number} H - Hue 0–360
 * @returns {string} "#rrggbb"
 */
function oklchToHex(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const [r, g, bl] = _m3(
    _M1i,
    _m3(_M2i, [L, a, b]).map((v) => v * v * v),
  );
  return _lr2h(r, g, bl);
}

// ── HCT ───────────────────────────────────────────────────────────────────────
// CAM16 hue + chroma, CIE L* tone. Matches Material You tonal palettes.
// _VC holds precomputed CAM16 viewing conditions (D65, 200 lux) — computed once at load.

// linRGB ↔ XYZ-D65
const _LX = [
  [0.4123907993, 0.3575843394, 0.1804807884],
  [0.2126390059, 0.7151686788, 0.0721923154],
  [0.0193308187, 0.1191947798, 0.9505321522],
];
const _XL = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142],
];

const _VC = (() => {
  const W = [95.047, 100, 108.883]; // D65 white point (XYZ)
  const aL = (200 / Math.PI) * Math.pow(66 / 116, 3);
  const F = 1,
    c = 0.69,
    Nc = 1; // average surround
  const k = 1 / (5 * aL + 1);
  const FL = 0.2 * k ** 4 * (5 * aL) + 0.1 * (1 - k ** 4) ** 2 * (5 * aL) ** (1 / 3);
  const n = Math.pow(66 / 116, 3);
  const z = 1.48 + Math.sqrt(50 * n),
    Nbb = 0.725 / n ** 0.2,
    Ncb = Nbb;
  const hpe = [
    [0.38971, 0.68898, -0.07868],
    [-0.22981, 1.1834, 0.04641],
    [0, 0, 1],
  ];
  const cat = [
    [0.7328, 0.4296, -0.1624],
    [-0.7036, 1.6975, 0.0061],
    [0.003, 0.0136, 0.9834],
  ];
  const ci = [
    [1.0961238208, -0.2788690002, 0.1827452039],
    [0.4543690419, 0.4735331543, 0.0720978039],
    [-0.0096276087, -0.0056980312, 1.0153256399],
  ];
  const hpi = [
    [1.9101968341, -1.1121238928, 0.2019079568],
    [0.3709500882, 0.6290542574, -0.0000080551],
    [0, 0, 1],
  ];
  const m3 = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  const D = F * (1 - (1 / 3.6) * Math.exp((-aL - 42) / 92));
  const rW = m3(
    cat,
    W.map((v) => v / 100),
  );
  const Drgb = rW.map((v) => D / v + 1 - D);
  const ad = (c2) => {
    const f = (FL * Math.abs(c2)) ** 0.42;
    return (400 * Math.sign(c2) * f) / (f + 27.13);
  };
  const aW = m3(
    hpe,
    m3(
      ci,
      rW.map((v, i) => v * Drgb[i]),
    ),
  ).map(ad);
  return { F, c, Nc, Nbb, Ncb, FL, n, z, Aw: (2 * aW[0] + aW[1] + 0.05 * aW[2] - 0.305) * Nbb, D, Drgb, hpe, cat, ci, hpi, ad };
})();

/** XYZ → { h, c, t } (internal — call hexToHct instead) */
function _x2hct(X, Y, Z) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  const rgb = m3(v.cat, [X, Y, Z]).map((c2, i) => c2 * v.Drgb[i]);
  const rA = m3(v.hpe, m3(v.ci, rgb)).map(v.ad);
  const p2 = (2 * rA[0] + rA[1] + 0.05 * rA[2] - 0.305) * v.Nbb;
  const a = rA[0] - (12 * rA[1]) / 11 + rA[2] / 11;
  const b = (rA[0] + rA[1] - 2 * rA[2]) / 9;
  const hd = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const t = ((50000 / 13) * v.Nc * v.Ncb * Math.sqrt(a * a + b * b)) / (p2 + 0.305);
  const J = 100 * Math.pow(p2 / v.Aw, v.c * v.z);
  return { h: hd, c: Math.pow(t === 0 ? 0 : Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, v.n), 0.73), 1) * Math.sqrt(J / 100), t: Y <= 0 ? 0 : Y >= 1 ? 100 : 116 * Math.cbrt(Y) - 16 };
}

/**
 * Convert hex to HCT.
 * @param {string} hex - "#RRGGBB"
 * @returns {{ h: number, c: number, t: number }} h 0–360 · c ≥ 0 · t 0–100 (CIE L*)
 */
function hexToHct(hex) {
  const [r, g, b] = _h2lr(hex);
  return _x2hct(..._m3(_LX, [r, g, b]));
}

/** CIE L* tone → CAM16 J. Used by hctToHex to convert a target tone to lightness. */
function _jFromTone(tone) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  if (tone <= 0) return 0;
  if (tone >= 100) return 100;
  const Y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3;
  const cat = m3(v.cat, [Y * 0.95047, Y, Y * 1.08883]).map((c2, i) => c2 * v.Drgb[i]);
  const hR = m3(v.hpe, m3(v.ci, cat)).map(v.ad);
  return 100 * Math.pow(Math.max(0, ((2 * hR[0] + hR[1] + 0.05 * hR[2] - 0.305) * v.Nbb) / v.Aw), v.c * v.z);
}

/**
 * Attempt HCT → linear RGB. Returns null when the color is outside sRGB gamut.
 * hctToHex binary-searches chroma downward until this returns non-null.
 */
function _hctRgbOrNull(hue, ch, J) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  if (J <= 0) return null;
  const ta = ch > 0 ? Math.pow(ch / Math.sqrt(J / 100), 1 / 0.9) / Math.pow(1.64 - Math.pow(0.29, v.n), 0.73) : 0;
  const hr = (hue * Math.PI) / 180;
  const p1 = (50000 / 13) * v.Nc * v.Ncb;
  const p2 = (Math.pow(J / 100, 1 / (v.c * v.z)) * v.Aw) / v.Nbb + 0.305;
  let a = 0,
    b = 0;
  if (ta > 0) {
    const g = (23 * (p2 + 0.305) * ta) / (23 * p1 + 11 * ta * Math.cos(hr) + 108 * ta * Math.sin(hr));
    a = g * Math.cos(hr);
    b = g * Math.sin(hr);
  }
  const iv = (c2) => {
    const s = Math.sign(c2);
    return (s * Math.pow(Math.max(0, (Math.abs(c2) * 27.13) / (400 - Math.abs(c2))), 1 / 0.42)) / v.FL;
  };
  const Ra = (460 * p2 + 451 * a + 288 * b) / 1403;
  const Ga = (460 * p2 - 891 * a - 261 * b) / 1403;
  const Ba = (460 * p2 - 220 * a - 6300 * b) / 1403;
  const lr = m3(
    _XL,
    m3(
      v.ci,
      m3(v.hpi, [Ra, Ga, Ba].map(iv)).map((c2, i) => c2 / v.Drgb[i]),
    ),
  );
  if (Math.max(lr[0], lr[1], lr[2]) > 1 + 1e-4 || Math.min(lr[0], lr[1], lr[2]) < -1e-4) return null;
  return lr.map((x) => Math.max(0, x));
}

/**
 * Convert HCT to hex.
 * Binary-searches for the highest in-gamut chroma at the target tone.
 * Achromatic colors (ch < 0.0001) or boundary tones (0 or 100) skip the search.
 * @param {number} hue  - 0–360
 * @param {number} ch   - chroma ≥ 0
 * @param {number} tone - 0–100 (CIE L*)
 * @returns {string} "#rrggbb"
 */
function hctToHex(hue, ch, tone) {
  if (ch < 0.0001 || tone <= 0 || tone >= 100) {
    if (tone <= 0) return "#000000";
    if (tone >= 100) return "#ffffff";
    const v = srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3);
    return "#" + v.toString(16).padStart(2, "0").repeat(3);
  }
  const J = _jFromTone(tone);
  if (J <= 0) return "#000000";
  let lo = 0,
    hi = ch,
    best = null;
  for (let it = 0; it < 50; it++) {
    if (hi - lo < 0.01) break;
    const mid = (lo + hi) / 2;
    const rgb = _hctRgbOrNull(hue, mid, J);
    if (rgb === null) {
      hi = mid;
    } else {
      best = _lr2h(rgb[0], rgb[1], rgb[2]);
      lo = mid;
    }
  }
  return (
    best ||
    "#" +
      srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3)
        .toString(16)
        .padStart(2, "0")
        .repeat(3)
  );
}

// ── CONTRAST SOLVER ───────────────────────────────────────────────────────────
// Finds the OKLCH color closest to a source that achieves >= targetContrast against bg.
// Works by binary-searching L while shaping C according to the chosen solver mode.
// Contract: achievedContrast is ALWAYS >= targetContrast (never undershoots).

/** WCAG relative luminance from pre-linearized RGB channels */
function _relLumFromLinear(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio from two relative luminances */
function _wcagContrast(lum1, lum2) {
  const hi = Math.max(lum1, lum2),
    lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Relative luminance of a hex string (skips double-linearization by reusing _h2lr) */
function _lumOfHex(hex) {
  const [r, g, b] = _h2lr(hex);
  return _relLumFromLinear(r, g, b);
}

/**
 * Is the OKLCH point (L, C, H) inside the sRGB gamut?
 * Round-trips through oklchToHex and checks chroma loss.
 */
function _inGamutOklch(L, C, H) {
  if (L <= 0 || L >= 1) return false;
  return hexToOklch(oklchToHex(L, C, H)).C >= C - 0.002;
}

/**
 * Binary search: highest in-gamut chroma at a given (L, H).
 * @param {number} L      - OKLCH lightness
 * @param {number} H      - OKLCH hue
 * @param {number} startC - chroma ceiling to search from
 * @returns {number} max in-gamut C
 */
function _maxChromaAtLH(L, H, startC) {
  if (startC <= 0.001) return 0;
  let lo = 0,
    hi = startC;
  for (let i = 0; i < 40; i++) {
    if (hi - lo < 0.0005) break;
    const mid = (lo + hi) / 2;
    if (_inGamutOklch(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Compute target chroma for a given L based on solver mode.
 * hue-locked and chroma-maximized compute C differently at the call site.
 * @param {number} L     - target OKLCH lightness
 * @param {number} srcL  - source lightness
 * @param {number} srcC  - source chroma
 * @param {number} _srcH - source hue (reserved for future hue-aware chroma modes)
 * @param {string} mode  - solver mode
 * @returns {number} raw target chroma (before gamut clamping)
 */
function _targetChroma(L, srcL, srcC, _srcH, mode) {
  if (srcC < 0.001) return 0; // achromatic source always stays achromatic
  switch (mode) {
    case "saturated":
      return srcC; // hold source C, only move L
    case "luminance":
      return srcC * (1 - Math.pow(Math.abs(2 * L - 1), 1.5)); // parabolic drop at extremes
    case "natural":
      return (srcC / Math.max(srcL, 1 - srcL)) * Math.min(L, 1 - L); // linear through srcC at srcL
    default:
      return srcC;
  }
}

/**
 * Binary search for the L value that achieves >= targetContrast against bgLum.
 * Tracks the minimum-overshoot L that still satisfies the constraint.
 * @param {number}   bgLum          - background relative luminance
 * @param {number}   targetContrast - required WCAG ratio
 * @param {number}   lo             - L search lower bound
 * @param {number}   hi             - L search upper bound
 * @param {function} getHexAtL      - (L: number) → hex string
 * @returns {number|null} solved L, or null if unreachable
 */
function _searchL(bgLum, targetContrast, lo, hi, getHexAtL) {
  let bestL = null;
  for (let i = 0; i < MAX_ITER; i++) {
    if (hi - lo < L_EPS) break;
    const mid = (lo + hi) / 2;
    const hex = getHexAtL(mid);
    if (!hex) {
      lo = mid;
      continue;
    }
    const contrast = _wcagContrast(_lumOfHex(hex), bgLum);
    if (contrast >= targetContrast) {
      bestL = mid;
      // Minimise overshoot: light bg → prefer higher L (less dark); dark bg → prefer lower L (less bright)
      if (bgLum > 0.5) lo = mid;
      else hi = mid;
    } else {
      if (bgLum > 0.5) hi = mid;
      else lo = mid;
    }
  }
  return bestL;
}

/**
 * Find the OKLCH color closest to sourceHex that achieves >= targetContrast against bgHex.
 * Never undershoots. Attaches a warning when overshoot exceeds OVERSHOOT_WARN (0.3).
 *
 * @param {string} sourceHex      - input color "#RRGGBB"
 * @param {number} targetContrast - required WCAG ratio e.g. 4.5
 * @param {string} bgHex          - background color "#RRGGBB"
 * @param {string} solverMode     - "natural"|"saturated"|"luminance"|"hue-locked"|"chroma-maximized"
 * @returns {{ hex: string, achievedContrast: number, solverMode: string, chromaReduced: boolean, clipped: boolean, warning: string|null }}
 */
function solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode) {
  solverMode = SOLVER_MODES.includes(solverMode) ? solverMode : "natural";
  const src = hexToOklch(sourceHex);
  const bgLum = _lumOfHex(bgHex);
  const bgIsLight = bgLum > 0.18; // perceptual threshold — not 0.5, dark bg needs much less L shift

  // Pre-check: black/white is the theoretical max contrast against any bg
  const maxTheoreticalContrast = _wcagContrast(bgLum, bgIsLight ? 0 : 1);
  if (targetContrast > maxTheoreticalContrast + 0.01) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return { hex: fallback, achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)), solverMode, chromaReduced: true, clipped: true, warning: `Target contrast ${targetContrast} is unreachable against this background (max ${maxTheoreticalContrast.toFixed(2)}). Black/white used.` };
  }

  const lLow = 0.001,
    lHigh = 0.999;
  let solvedL = null,
    solvedC = null,
    chromaReduced = false;

  if (solverMode === "chroma-maximized") {
    // Solve L for contrast, then push C as high as gamut allows at that L
    const getHex = (L) => {
      const maxC = _maxChromaAtLH(L, src.H, Math.max(src.C, 0.2));
      return oklchToHex(L, maxC < 0.001 ? 0 : maxC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) solvedC = _maxChromaAtLH(solvedL, src.H, Math.max(src.C, 0.2));
  } else if (solverMode === "hue-locked") {
    // H fixed; C follows natural scaling then is gamut-clamped
    const getHex = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, "natural");
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, "natural");
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (solvedC < src.C - 0.01) chromaReduced = true;
    }
  } else {
    // natural / saturated / luminance
    const getHex = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, solverMode);
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, solverMode);
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
    }
  }

  if (solvedL === null) {
    // defensive — pre-check above should prevent this
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return { hex: fallback, achievedContrast: parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2)), solverMode, chromaReduced: true, clipped: true, warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.` };
  }

  const resultHex = oklchToHex(solvedL, solvedC || 0, src.H);
  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));
  let warning = null;
  if (achievedContrast < targetContrast) warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
  else if (achievedContrast > targetContrast + OVERSHOOT_WARN) warning = `Target ${targetContrast} not achievable precisely; nearest is ${achievedContrast} (overshoot ${(achievedContrast - targetContrast).toFixed(2)}).`;

  return { hex: resultHex, achievedContrast, solverMode, chromaReduced, clipped: false, warning };
}

/**
 * Validate that a Direct Contrast variation targets array is strictly ascending.
 * @param {number[]} targets - e.g. [1.5, 3.0, 4.5, 7.0, 12.0]
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateVariationContrasts(targets) {
  const errors = [];
  for (let i = 1; i < targets.length; i++) {
    if (targets[i] <= targets[i - 1]) errors.push(`Variation ${i + 1} (${targets[i]}) must be greater than variation ${i} (${targets[i - 1]}).`);
  }
  return { valid: errors.length === 0, errors };
}
