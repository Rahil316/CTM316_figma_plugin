// Hash cache: skip ramp regeneration when config hasn't changed.
let lastInputHash = null;
let cachedOutput = null;

// ── Ramp Generation Strategies ──────────────────────────────────────────────
const RAMP_STRATEGIES = {
  Linear: (hue, satu, N) => {
    const inc = 100 / (N + 1);
    const out = [];
    for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
    return out.reverse();
  },

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

  Natural: (hue, satu, N, stepLum, findL) => {
    const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, () => hue);
      out.push(hslToHex(hue, tapS(L), L) || "#000000");
    }
    return out;
  },

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

  Symmetric: (hue, satu, N, stepLum, findL, { hexIn, uMax, uMin }) => {
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
  },

  OKLCH: (hue, satu, N, stepLum, findL, { hexIn }) => {
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

  Material: (hue, satu, N, stepLum, findL, { hexIn }) => {
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

function tonalScaleMaker(hexIn, rampLength, rampType = "Natural") {
  const hue = hexToHue(hexIn);
  const satu = hexToSat(hexIn);
  const N = rampLength;

  // Shared geometric scaling params
  const C_max = (21 * N) / (N + 1);
  const uMax = Math.log(0.05 * C_max);
  const uMin = Math.log(1.05 / C_max);

  const stepLum = (i) => {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  };

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

  const strategy = RAMP_STRATEGIES[rampType] || RAMP_STRATEGIES.Natural;
  return strategy(hue, satu, N, stepLum, findL, { hexIn, uMax, uMin });
}

// ── Variable Generation Orchestrator ────────────────────────────────────────
function variableMaker(config) {
  const inputHash = _computeInputHash(config);
  if (inputHash === lastInputHash && cachedOutput) return cachedOutput;

  const { colors, themes, colorSteps } = config;
  const errors = { critical: [], warnings: [], notices: [] };
  const lightBg = normalizeHex(themes[0].bg) || "#FFFFFF";
  const darkBg = normalizeHex(themes[1].bg) || "#000000";

  // 1. Generate base ramps (unless in direct mode where they aren't needed)
  const clrRamps = config.pluginMode !== "direct" ? _generateBaseRamps(colors, colorSteps, config.scaleAlgorithm, config.colorStepNames, lightBg, darkBg) : Object.create(null);

  const tokensCollection = { light: {}, dark: {} };

  // 2. Process each theme mode
  for (const mode of themes) {
    const modeName = mode.name.toLowerCase();
    const themeTokens = tokensCollection[modeName];

    for (const color of colors) {
      themeTokens[color.name] = {};

      if (config.pluginMode === "direct") {
        _solveDirectMode(color, mode, config, themeTokens[color.name], errors);
      } else {
        _processTonalMode(color, mode, config, clrRamps, themeTokens[color.name], errors);
      }
    }
  }

  const output = { colorRamps: clrRamps, colorTokens: tokensCollection, errors };
  lastInputHash = inputHash;
  cachedOutput = output;
  return output;
}

// ── Private Sub-Processors ──────────────────────────────────────────────────

function _computeInputHash(config) {
  return JSON.stringify({
    colors: config.colors.map(function (g) {
      return Object.assign({}, g, { value: normalizeHex(g.value) });
    }),
    rampLength: config.colorSteps,
    scaleAlgorithm: config.scaleAlgorithm,
    lightBg: normalizeHex(config.themes[0].bg),
    darkBg: normalizeHex(config.themes[1].bg),
    roles: config.roles,
    roleMapping: config.roleMapping,
    colorStepNames: config.colorStepNames,
    variations: config.variations,
    spreadUnit: config.spreadUnit,
    baseSelectionMode: config.baseSelectionMode,
  });
}

function _generateBaseRamps(colors, rampLength, algorithm, stepNames, lightBg, darkBg) {
  const collection = Object.create(null);
  const names = stepNames || seriesMaker(rampLength);

  for (const color of colors) {
    const rampData = tonalScaleMaker(color.value, rampLength, algorithm);
    const ramp = Object.create(null);
    collection[color.name] = ramp;

    for (let i = 0; i < rampLength; i++) {
      const value = normalizeHex(rampData[i]);
      const weight = names[i];
      ramp[weight] = {
        value,
        stepName: `${color.name}-${weight}`,
        shorthand: `${color.shorthand}-${weight}`,
        description: color.description || "",
        contrast: {
          light: { ratio: contrastRatio(value, lightBg), rating: contrastRating(value, lightBg) },
          dark: { ratio: contrastRatio(value, darkBg), rating: contrastRating(value, darkBg) },
        },
      };
    }
  }
  return collection;
}

function _solveDirectMode(color, mode, config, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const bgHex = mode.bg;
  const solverMode = color.solverMode || "natural";

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});

    const variations = role.variationOverride && role.roleVariations && role.roleVariations.length ? role.roleVariations : config.variations;

    // Determine target contrasts based on mode
    let targets;
    if (config.baseSelectionMode === "Manual") {
      targets = role.variationTargets || variations.map((_, i) => [1.5, 3, 4.5, 7, 12][i] || 1.5 + i * 1.5);

      const check = validateVariationContrasts(targets);
      if (!check.valid) {
        check.errors.forEach((err) => errors.critical.push({ color: color.name, role: role.name, theme: modeName, error: err }));
        continue;
      }
    } else {
      const baseVarIdx = Math.floor(variations.length / 2);
      targets = variations.map((_, vi) => Math.max(1.01, role.baseContrast + (vi - baseVarIdx) * role.contrastGap));
    }

    // Solve each variation
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

function _processTonalMode(color, mode, config, clrRamps, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const ramp = clrRamps[color.name];
  const stepNames = config.colorStepNames || seriesMaker(config.colorSteps);

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});
    const variations = role.variationOverride && role.roleVariations && role.roleVariations.length ? role.roleVariations : config.variations;

    if (config.baseSelectionMode === "Manual") {
      _mapManualSteps(color, role, variations, ramp, stepNames, modeName, roleOutput);
    } else if (config.spreadUnit === "contrast") {
      _mapByContrastTarget(color, role, variations, ramp, stepNames, modeName, roleOutput, errors);
    } else {
      _mapByStepOffset(color, role, variations, ramp, stepNames, modeName, roleOutput, config.roleMapping, errors);
    }
  }
}

function _mapManualSteps(color, role, variations, ramp, stepNames, modeName, output) {
  const targets = role.variationTargets || variations.map((_, i) => Math.floor((stepNames.length * i) / Math.max(1, variations.length - 1)));
  variations.forEach((_, vi) => {
    const idx = Math.max(0, Math.min(stepNames.length - 1, parseInt(targets[vi]) || 0));
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
    };
  });
}

function _mapByContrastTarget(color, role, variations, ramp, stepNames, modeName, output, errors) {
  const isDark = modeName === "dark";
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

function _mapByStepOffset(color, role, variations, ramp, stepNames, modeName, output, mappingType, errors) {
  const isDark = modeName === "dark";
  let baseIdx = mappingType === "By Contrast" ? _findBaseIndexByContrast(role, ramp, stepNames, modeName, isDark, color.name, role.name, errors) : _findBaseIndexExplicit(role, stepNames, isDark);

  // Clamp baseIdx for spread
  const baseVarIdx = Math.floor(variations.length / 2);
  const spread = role.spread;
  const minAllowed = baseVarIdx * spread;
  const maxAllowed = stepNames.length - 1 - minAllowed;

  if (baseIdx < minAllowed || baseIdx > maxAllowed) {
    baseIdx = Math.max(minAllowed, Math.min(maxAllowed, baseIdx));
    errors.warnings.push({ color: color.name, role: role.name, theme: modeName, warning: "Base index clamped for spread." });
  }

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

function _findBaseContrast(role, ramp, stepNames, modeName, isDark) {
  if (role.baseIndex !== undefined) {
    const idxSource = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
    const idx = Math.max(0, Math.min(stepNames.length - 1, parseInt(idxSource) || 0));
    return ramp[stepNames[idx]].contrast[modeName].ratio;
  }
  const minC = parseFloat(role.minContrast) || 4.5;
  const step = stepNames.find((n) => ramp[n].contrast[modeName].ratio >= minC) || stepNames[stepNames.length >> 1];
  return ramp[step].contrast[modeName].ratio;
}

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
    // Fallback: find step with highest contrast
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

function _findBaseIndexExplicit(role, stepNames, isDark) {
  const source = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
  return Math.max(0, Math.min(stepNames.length - 1, parseInt(source) || 0));
}
