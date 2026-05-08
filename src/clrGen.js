// Hash cache: skip ramp regeneration when config hasn't changed.
let lastInputHash = null;
let cachedOutput = null;

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

  // Contrast-symmetric perceptual spacing in log(L+0.05) space.
  // C_max = 21·N/(N+1) — approaches 21:1 but never reaches pure black or white.
  // Symmetry: contrast vs black at lightest step = contrast vs white at darkest step.
  const C_max = (21 * N) / (N + 1);
  const uMax  = Math.log(0.05 * C_max);
  const uMin  = Math.log(1.05 / C_max);

  function stepLum(i) {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  }

  function findL(targetLum, getS, getH) {
    let lo = 0, hi = 100, L = 50;
    for (let j = 0; j < 30; j++) {
      const mid = (lo + hi) / 2;
      const lum = relLum(hslToHex(getH(mid), getS(mid), mid));
      L = mid;
      if (Math.abs(lum - targetLum) < 0.0001) break;
      if (lum < targetLum) lo = mid; else hi = mid;
    }
    return L;
  }

  const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);

  if (rampType === "Uniform") {
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), () => satu, () => hue);
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
    const uSrc   = Math.log(srcLum + 0.05);
    const mid    = Math.floor((N - 1) / 2);
    const out    = [];
    for (let i = 0; i < N; i++) {
      let u;
      if      (N === 1)       u = uSrc;
      else if (i === 0)       u = uMax;
      else if (i === N - 1)   u = uMin;
      else if (i <= mid && mid > 0) u = uMax - (uMax - uSrc) * i / mid;
      else                    u = uSrc - (uSrc - uMin) * (i - mid) / (N - 1 - mid);
      const targetLum = Math.max(0.0001, Math.exp(Math.min(uMax, Math.max(uMin, u))) - 0.05);
      const L = findL(targetLum, () => satu, () => hue);
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  }

  if (rampType === "OKLCH") {
    const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn));
    const out = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0, hi = 1, oL = 0.5;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(oklchToHex(mid, srcC, srcH));
        oL = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid; else hi = mid;
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
      let lo = 0, hi = 100, tone = 50;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(hctToHex(srcH, srcC, mid));
        tone = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid; else hi = mid;
      }
      out.push(hctToHex(srcH, srcC, tone) || "#000000");
    }
    return out;
  }

  return colorRampMaker(hexIn, rampLength, "Natural");
}

// 7. COLOR SYSTEM GENERATOR
function variableMaker(config) {
  const colors = config.colors;
  const roles = config.roles;
  const rampLength = config.colorSteps;
  let stepNames = config.colorStepNames;
  if (!stepNames || stepNames.length !== rampLength) {
    stepNames = seriesMaker(rampLength);
  }

  const inputHash = JSON.stringify({
    colors: config.colors.map((g) => Object.assign({}, g, { value: normalizeHex(g.value) })),
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

  if (inputHash === lastInputHash && cachedOutput) {
    return cachedOutput;
  }

  const lightBg = normalizeHex(config.themes[0].bg) || "#FFFFFF";
  const darkBg = normalizeHex(config.themes[1].bg) || "#000000";
  const clrRampsCollection = Object.create(null);
  const tokensCollection = {
    light: Object.create(null),
    dark: Object.create(null),
  };
  const errors = { critical: [], warnings: [], notices: [] };

  if (config.pluginMode !== "direct") {
    for (const color of colors) {
      const colorRamp = colorRampMaker(color.value, rampLength, config.scaleAlgorithm);
      const ramp = Object.create(null);
      clrRampsCollection[color.name] = ramp;

      for (let wIdx = 0; wIdx < rampLength; wIdx++) {
        const weight = stepNames[wIdx];
        const value = normalizeHex(colorRamp[wIdx]);
        const lightContrast = contrastRatio(value, lightBg);
        const darkContrast = contrastRatio(value, darkBg);

        ramp[weight] = {
          value,
          stepName: `${color.name}-${weight}`,
          shortName: `${color.shortName}-${weight}`,
          contrast: {
            light: { ratio: lightContrast, rating: contrastRating(value, lightBg) },
            dark: { ratio: darkContrast, rating: contrastRating(value, darkBg) },
          },
        };
      }
    }
  }

  for (const mode of config.themes) {
    const modeName = mode.name.toLowerCase();
    const conTheme = tokensCollection[modeName];

    for (const color of colors) {
      const clrName = color.name;
      const conGroup = Object.create(null);
      conTheme[clrName] = conGroup;
      const roleNames = roles.map((_, i) => i);

      if (config.pluginMode === "direct") {
        // --- DIRECT CONTRAST MODE ---
        if (config.baseSelectionMode === "Manual") {
          // Manual: use role.variationTargets[i] as explicit contrast targets
          for (const roleName of roleNames) {
            const role = roles[roleName];
            const conRole = Object.create(null);
            conGroup[roleName] = conRole;

            // Determine which variations array applies to this role
            const roleVariations = (role.variationOverride && role.roleVariations?.length > 0)
              ? role.roleVariations
              : config.variations;
            const varCount = roleVariations.length;

            const bgHex = mode.bg;
            const solverMode = color.solverMode || "natural";
            const variationTargets = role.variationTargets || roleVariations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || (1.5 + i * 1.5));

            // Pre-validate cardinality; skip solving if invalid.
            const cardinalityCheck = validateVariationContrasts(variationTargets);
            if (!cardinalityCheck.valid) {
              for (const err of cardinalityCheck.errors) {
                errors.critical.push({ color: clrName, role: role.name, theme: modeName, error: err });
              }
              continue;
            }

            for (let vi = 0; vi < varCount; vi++) {
              const variation = String(vi);
              const targetContrast = parseFloat(variationTargets[vi]) || 4.5;

              const solved = solveColorForContrast(color.value, targetContrast, bgHex, solverMode);

              if (solved.warning) {
                errors.warnings.push({ color: clrName, role: role.name, variation, theme: modeName, warning: solved.warning });
              }
              if (solved.chromaReduced) {
                errors.notices.push({ color: clrName, role: role.name, variation, theme: modeName, notice: `Chroma reduced to fit gamut at target contrast ${targetContrast}.` });
              }

              conRole[variation] = {
                tknName:  `${clrName}-${role.name}-${variation}`,
                color:    clrName,
                role:     role.name,
                variation,
                tknRef:   null,
                value:    solved.hex,
                contrast: {
                  ratio:  solved.achievedContrast,
                  rating: contrastRating(solved.hex, bgHex),
                },
                contrastTarget:  targetContrast,
                achievedContrast: solved.achievedContrast,
                solverMode,
                chromaReduced: solved.chromaReduced,
                isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
              };
            }
          }
        } else {
          // Direct Contrast + By Contrast + Spread Contrast
          // Use role.baseContrast + (i - baseVarIdx) * role.contrastGap
          for (const roleName of roleNames) {
            const role = roles[roleName];
            const conRole = Object.create(null);
            conGroup[roleName] = conRole;
            const bgHex = mode.bg;
            const solverMode = color.solverMode || "natural";
            // Determine which variations array applies to this role
            const roleVariations = (role.variationOverride && role.roleVariations?.length > 0)
              ? role.roleVariations
              : config.variations;
            const varCount = roleVariations.length;
            const baseVarIdx = Math.floor(varCount / 2);

            for (let vi = 0; vi < varCount; vi++) {
              const variation = String(vi);
              const targetContrast = Math.max(1.01, role.baseContrast + (vi - baseVarIdx) * role.contrastGap);
              const solved = solveColorForContrast(color.value, targetContrast, bgHex, solverMode);
              if (solved.warning) errors.warnings.push({ color: clrName, role: role.name, variation, theme: modeName, warning: solved.warning });
              if (solved.chromaReduced) errors.notices.push({ color: clrName, role: role.name, variation, theme: modeName, notice: `Chroma reduced at contrast target ${targetContrast.toFixed(2)}.` });
              conRole[variation] = {
                tknName: `${clrName}-${role.name}-${variation}`,
                color: clrName, role: role.name, variation,
                tknRef: null,
                value: solved.hex,
                contrast: { ratio: solved.achievedContrast, rating: contrastRating(solved.hex, bgHex) },
                contrastTarget: targetContrast,
                achievedContrast: solved.achievedContrast,
                solverMode,
                isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
              };
            }
          }
        }
      } else {
        // --- TONAL SCALE MODE ---

        if (config.baseSelectionMode === "Manual") {
          // Manual step indices — role.variationTargets[i] is a 0-based step index
          for (const roleName of roleNames) {
            const role = roles[roleName];
            const conRole = Object.create(null);
            conGroup[roleName] = conRole;
            // Determine which variations array applies to this role
            const roleVariations = (role.variationOverride && role.roleVariations?.length > 0)
              ? role.roleVariations
              : config.variations;
            const varCount = roleVariations.length;
            const varTargets = role.variationTargets || roleVariations.map((_, i) => Math.floor(rampLength * i / Math.max(1, varCount - 1)));

            for (let vi = 0; vi < varCount; vi++) {
              const variation = String(vi);
              const rawIdx = parseInt(varTargets[vi]);
              const idx = Math.max(0, Math.min(rampLength - 1, isNaN(rawIdx) ? rampLength >> 1 : rawIdx));
              const weight = stepNames[idx];
              const data = clrRampsCollection[clrName][weight];
              conRole[variation] = {
                tknName: `${clrName}-${role.name}-${variation}`,
                color: clrName, role: role.name, variation,
                tknRef: data.stepName,
                value: data.value,
                contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
                manualStepIndex: idx,
                isAdjusted: false,
              };
            }
          }

        } else if (config.spreadUnit === "contrast") {
          // Spread Contrast — find steps closest to computed contrast targets
          for (const roleName of roleNames) {
            const role = roles[roleName];
            const conRole = Object.create(null);
            conGroup[roleName] = conRole;
            const isDark = modeName === "dark";

            // Find base contrast value
            let baseContrast;
            if (config.baseSelectionMode === "By Index") {
              const baseIndexSource = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
              const baseIdx = Math.max(0, Math.min(rampLength - 1, baseIndexSource !== undefined ? parseInt(baseIndexSource) : rampLength >> 1));
              baseContrast = clrRampsCollection[clrName][stepNames[baseIdx]].contrast[modeName].ratio;
            } else {
              // "By Contrast": find first step meeting minContrast
              const minC = parseFloat(role.minContrast);
              let baseIdx = -1;
              if (isDark) {
                for (let i = rampLength - 1; i >= 0; i--) {
                  if (clrRampsCollection[clrName][stepNames[i]].contrast[modeName].ratio >= minC) { baseIdx = i; break; }
                }
              } else {
                for (let i = 0; i < rampLength; i++) {
                  if (clrRampsCollection[clrName][stepNames[i]].contrast[modeName].ratio >= minC) { baseIdx = i; break; }
                }
              }
              if (baseIdx === -1) baseIdx = rampLength >> 1;
              baseContrast = clrRampsCollection[clrName][stepNames[baseIdx]].contrast[modeName].ratio;
            }

            // Determine which variations array applies to this role
            const roleVariations = (role.variationOverride && role.roleVariations?.length > 0)
              ? role.roleVariations
              : config.variations;
            const varCount = roleVariations.length;
            const baseVarIdx = Math.floor(varCount / 2);

            for (let vi = 0; vi < varCount; vi++) {
              const variation = String(vi);
              const targetContrast = baseContrast + (vi - baseVarIdx) * role.contrastGap;

              // Find step whose contrast is closest to targetContrast
              let bestIdx = 0;
              let bestDiff = Infinity;
              for (let si = 0; si < rampLength; si++) {
                const diff = Math.abs(clrRampsCollection[clrName][stepNames[si]].contrast[modeName].ratio - targetContrast);
                if (diff < bestDiff) { bestDiff = diff; bestIdx = si; }
              }

              const weight = stepNames[bestIdx];
              const data = clrRampsCollection[clrName][weight];
              const isAdjusted = bestDiff > 0.5;
              conRole[variation] = {
                tknName: `${clrName}-${role.name}-${variation}`,
                color: clrName, role: role.name, variation,
                tknRef: data.stepName,
                value: data.value,
                contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
                contrastTarget: targetContrast,
                isAdjusted,
              };
              if (isAdjusted) errors.warnings.push({ color: clrName, role: roleName, variation, theme: modeName, warning: `Target contrast ${targetContrast.toFixed(2)} not exactly available; closest step used (${data.contrast[modeName].ratio.toFixed(2)}).` });
            }
          }

        } else {
          // Spread Steps (existing "By Contrast" and "By Index" code paths)
          if (config.roleMapping === "By Contrast") {
            for (const roleName of roleNames) {
              const role = roles[roleName];
              const spread = role.spread;
              const minC = parseFloat(role.minContrast);
              const conRole = Object.create(null);
              conGroup[roleName] = conRole;

              let baseIdx = -1;
              const highestWeight = stepNames[rampLength - 1];
              const lowestWeight = stepNames[0];
              const cEnd = clrRampsCollection[clrName][highestWeight].contrast[modeName].ratio;
              const cStart = clrRampsCollection[clrName][lowestWeight].contrast[modeName].ratio;
              const contrastGrowthDir = cEnd > cStart ? 1 : -1;
              const isDarkTheme = modeName === "dark";

              if (isDarkTheme) {
                for (let i = rampLength - 1; i >= 0; i--) {
                  const weight = stepNames[i];
                  const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;
                  if (c >= minC) { baseIdx = i; break; }
                }
              } else {
                for (let i = 0; i < rampLength; i++) {
                  const weight = stepNames[i];
                  const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;
                  if (c >= minC) { baseIdx = i; break; }
                }
              }

              if (baseIdx === -1) {
                let bestIdx = -1;
                let maxContrast = -1;
                for (let i = 0; i < rampLength; i++) {
                  const weight = stepNames[i];
                  const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;
                  if (c > maxContrast) { bestIdx = i; maxContrast = c; }
                }
                if (bestIdx !== -1) {
                  baseIdx = bestIdx;
                  errors.critical.push({ color: clrName, role: roleName, theme: modeName, error: `Cannot meet minimum contrast ${minC}. using closest available (${maxContrast.toFixed(2)}).` });
                } else {
                  baseIdx = rampLength >> 1;
                  errors.critical.push({ color: clrName, role: roleName, theme: modeName, error: "Cannot evaluate contrast for any weight." });
                }
              }

              const varCount = config.variations.length;
              const baseVarIdx = Math.floor(varCount / 2);
              const maxOffset = baseVarIdx * spread;
              const minAllowed = maxOffset;
              const maxAllowed = rampLength - 1 - maxOffset;
              let adjustedBase = false;
              if (minAllowed > maxAllowed) {
                baseIdx = Math.floor((rampLength - 1) / 2);
                adjustedBase = true;
              } else {
                if (baseIdx < minAllowed) { baseIdx = minAllowed; adjustedBase = true; }
                if (baseIdx > maxAllowed) { baseIdx = maxAllowed; adjustedBase = true; }
              }
              if (adjustedBase) errors.warnings.push({ color: clrName, role: roleName, theme: modeName, warning: `Base index clamped to ${baseIdx} due to spread constraints.` });

              const offsetValues = roleVariations.map((v, i) => ({ key: String(i), offset: (i - baseVarIdx) * spread }));

              for (let vIdx = 0; vIdx < offsetValues.length; vIdx++) {
                const { key: variation, offset: pureOffset } = offsetValues[vIdx];
                let idx = baseIdx + pureOffset * contrastGrowthDir;
                let adjusted = false;
                if (idx < 0) { idx = 0; adjusted = true; }
                else if (idx >= rampLength) { idx = rampLength - 1; adjusted = true; }

                const weight = stepNames[idx];
                const data = clrRampsCollection[clrName][weight];

                conRole[variation] = {
                  tknName: `${clrName}-${role.name}-${variation}`,
                  color: clrName, role: role.name, variation,
                  tknRef: data.stepName,
                  value: data.value,
                  contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
                  variationOffset: pureOffset,
                  isAdjusted: adjusted,
                };
                if (adjusted) errors.warnings.push({ color: clrName, role: roleName, variation, theme: modeName, warning: `Variation '${variation}' clamped due to overflow` });
              }
            }
          } else if (config.roleMapping === "By Index") {
            for (const roleName of roleNames) {
              const role = roles[roleName];
              const spread = role.spread;
              const conRole = Object.create(null);
              conGroup[roleName] = conRole;

              const highestWeight = stepNames[rampLength - 1];
              const lowestWeight = stepNames[0];
              const cEnd = clrRampsCollection[clrName][highestWeight].contrast[modeName].ratio;
              const cStart = clrRampsCollection[clrName][lowestWeight].contrast[modeName].ratio;
              const contrastGrowthDir = cEnd > cStart ? 1 : -1;

              const isDark = modeName === "dark";
              const baseIndexSource = isDark && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
              let baseIdx = baseIndexSource !== undefined ? parseInt(baseIndexSource) : rampLength >> 1;

              // Determine which variations array applies to this role
              const roleVariations = (role.variationOverride && role.roleVariations?.length > 0)
                ? role.roleVariations
                : config.variations;
              const varCount = roleVariations.length;
              const baseVarIdx = Math.floor(varCount / 2);
              const maxOffset = baseVarIdx * spread;
              const minAllowed = maxOffset;
              const maxAllowed = rampLength - 1 - maxOffset;
              let adjustedBase = false;
              if (minAllowed > maxAllowed) {
                baseIdx = Math.floor((rampLength - 1) / 2);
                adjustedBase = true;
              } else {
                if (baseIdx < minAllowed) { baseIdx = minAllowed; adjustedBase = true; }
                if (baseIdx > maxAllowed) { baseIdx = maxAllowed; adjustedBase = true; }
              }
              if (adjustedBase) errors.warnings.push({ color: clrName, role: roleName, theme: modeName, warning: `Base index clamped to ${baseIdx} due to spread constraints.` });

              const offsetValues = roleVariations.map((v, i) => ({ key: String(i), offset: (i - baseVarIdx) * spread }));

              for (let vIdx = 0; vIdx < offsetValues.length; vIdx++) {
                const { key: variation, offset: pureOffset } = offsetValues[vIdx];
                let idx = baseIdx + pureOffset * contrastGrowthDir;
                let adjusted = false;
                if (idx < 0) { idx = 0; adjusted = true; }
                else if (idx >= rampLength) { idx = rampLength - 1; adjusted = true; }

                const weight = stepNames[idx];
                const data = clrRampsCollection[clrName][weight];

                conRole[variation] = {
                  tknName: `${clrName}-${role.name}-${variation}`,
                  color: clrName, role: role.name, variation,
                  tknRef: data.stepName,
                  value: data.value,
                  contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
                  variationOffset: pureOffset,
                  isAdjusted: adjusted,
                  manualBaseIndex: baseIdx,
                };
                if (adjusted) errors.warnings.push({ color: clrName, role: roleName, variation, theme: modeName, warning: `Variation '${variation}' clamped due to overflow` });
              }
            }
          }
        }
      }
    }
  }

  const output = { colorRamps: clrRampsCollection, colorTokens: tokensCollection, errors };
  lastInputHash = inputHash;
  cachedOutput = output;
  return output;
}
