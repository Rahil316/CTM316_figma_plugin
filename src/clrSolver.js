// CLR SOLVER — Direct contrast solving for ProMode "Direct Contrast" method.
//
// solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode)
//   → { hex, achievedContrast, solverMode, chromaReduced, clipped, warning }
//
// Solver modes (set per color):
//   "natural"          — scale C proportionally as L deviates from source L.
//                        Mimics how real pigments desaturate near white/black.
//   "saturated"        — hold source C fixed, only move L. Vivid / brand-forward.
//   "luminance"        — reduce C toward 0 as L approaches 0 or 1. Converges to
//                        neutral gray at extremes. Best for backgrounds/surfaces.
//   "hue-locked"       — H is fixed absolutely; L and C co-adjusted via binary
//                        search. Useful when hue identity must be exact.
//   "chroma-maximized" — at the required L, maximise in-gamut C. Most vivid
//                        possible color at that contrast level.
//
// One-directional contract: achieved contrast is ALWAYS >= targetContrast.
// The solver overshoots by the minimum amount necessary and never undershoots.
// A warning is attached when the overshoot exceeds OVERSHOOT_WARN (0.3).

const SOLVER_MODES = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
const OVERSHOOT_WARN = 0.3;   // warn if achieved > target + this
const MAX_ITER       = 60;    // binary search iterations
const L_EPS          = 1e-5;  // lightness convergence threshold

// ---------------------------------------------------------------------------
// WCAG relative luminance from linear-light RGB components (already linear).
function _relLumFromLinear(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio given two relative luminances.
function _wcagContrast(lum1, lum2) {
  const hi = Math.max(lum1, lum2);
  const lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

// Get relative luminance of a hex string using the already-available _h2lr helper.
function _lumOfHex(hex) {
  const [r, g, b] = _h2lr(hex);
  return _relLumFromLinear(r, g, b);
}

// ---------------------------------------------------------------------------
// Is an OKLCH (L, C, H) point in sRGB gamut?
// Uses oklchToHex round-trip: if any channel clips, it's out of gamut.
function _inGamutOklch(L, C, H) {
  if (L <= 0 || L >= 1) return false;
  const hex = oklchToHex(L, C, H);
  // Round-trip check: recompute and compare relative luminance
  const back = hexToOklch(hex);
  // Chroma after clip should equal or exceed C only if in gamut — check C loss
  return back.C >= C - 0.002;
}

// Clamp C downward until in-gamut at the given (L, H). Returns max in-gamut C.
function _maxChromaAtLH(L, H, startC) {
  if (startC <= 0.001) return 0;
  let lo = 0, hi = startC;
  for (let i = 0; i < 40; i++) {
    if (hi - lo < 0.0005) break;
    const mid = (lo + hi) / 2;
    if (_inGamutOklch(L, mid, H)) lo = mid; else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------------------
// Compute the target C for a given L, given source (srcL, srcC) and mode.
function _targetChroma(L, srcL, srcC, srcH, mode) {
  if (srcC < 0.001) return 0; // achromatic source → always achromatic

  switch (mode) {
    case "saturated":
      // Hold source C. Will be clamped to gamut later.
      return srcC;

    case "luminance": {
      // C scales with "distance from neutral" — falls to 0 at L=0 or L=1.
      // Shape: parabolic around 0.5 → C(L) = srcC * (1 - |2L-1|^1.5)
      const neutrality = Math.pow(Math.abs(2 * L - 1), 1.5);
      return srcC * (1 - neutrality);
    }

    case "natural": {
      // Linear scale from 0 at extremes through srcC at srcL.
      // Mirrors how pigments lose chroma near white/black.
      const srcSlope = srcC / Math.max(srcL, 1 - srcL);
      return srcSlope * Math.min(L, 1 - L);
    }

    case "hue-locked":
    case "chroma-maximized":
      // These modes compute C differently — handled at call site.
      return srcC;

    default:
      return srcC;
  }
}

// ---------------------------------------------------------------------------
// Core binary search: find L in OKLCH such that contrast(hex(L,C,H), bg) >= target.
// Returns the solved L, or null if the entire range can't reach target.
//
// direction: "light" = bg is light (we search dark colors, L decreasing)
//            "dark"  = bg is dark  (we search light colors, L increasing)
function _searchL(bgLum, targetContrast, lo, hi, getHexAtL) {
  // We want the L that gives contrast >= target with minimum overshoot.
  // Strategy: binary search — track the best L that satisfies the constraint.
  let bestL = null;

  for (let i = 0; i < MAX_ITER; i++) {
    if (hi - lo < L_EPS) break;
    const mid = (lo + hi) / 2;
    const hex = getHexAtL(mid);
    if (!hex) { lo = mid; continue; }
    const midLum = _lumOfHex(hex);
    const contrast = _wcagContrast(midLum, bgLum);

    if (contrast >= targetContrast) {
      bestL = mid;
      // Found a satisfying L. Try to find the minimum-overshoot candidate:
      // • bg light: want highest L (least dark) that still satisfies → search upper half
      // • bg dark:  want lowest L  (least bright) that still satisfies → search lower half
      if (bgLum > 0.5) lo = mid; // bg light → try lighter (higher L)
      else             hi = mid; // bg dark  → try darker  (lower L)
    } else {
      // Doesn't satisfy: move further from bg to increase contrast
      if (bgLum > 0.5) hi = mid; // bg light → need darker  (lower L)
      else             lo = mid; // bg dark  → need lighter (higher L)
    }
  }
  return bestL;
}

// ---------------------------------------------------------------------------
// Main solver entry point.
function solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode) {
  solverMode = SOLVER_MODES.includes(solverMode) ? solverMode : "natural";

  const src = hexToOklch(sourceHex);
  const bgLum = _lumOfHex(bgHex);
  const bgIsLight = bgLum > 0.18; // perceptual threshold

  // Analytical pre-check: can any color in [0,1] L reach targetContrast against bg?
  const maxTheoreticalContrast = _wcagContrast(bgLum, bgIsLight ? 0 : 1);
  if (targetContrast > maxTheoreticalContrast + 0.01) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return {
      hex: fallback,
      achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)),
      solverMode,
      chromaReduced: true,
      clipped: true,
      warning: `Target contrast ${targetContrast} is unreachable against this background (max ${maxTheoreticalContrast.toFixed(2)}). Black/white used.`,
    };
  }

  // For bg-light: we need a dark color (lower L) → search L in [0, ~src.L or 1]
  // For bg-dark:  we need a light color (higher L) → search L in [~src.L or 0, 1]
  // We search the full [0,1] range so the solver is not constrained by source L.
  const lLow  = 0.001;
  const lHigh = 0.999;

  let solvedL = null;
  let solvedC = null;
  let chromaReduced = false;

  if (solverMode === "chroma-maximized") {
    // Find L analytically, then maximize C at that L.
    const getHexForCmax = (L) => {
      const maxC = _maxChromaAtLH(L, src.H, Math.max(src.C, 0.2));
      if (maxC < 0.001) return oklchToHex(L, 0, src.H);
      return oklchToHex(L, maxC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHexForCmax);
    if (solvedL !== null) {
      solvedC = _maxChromaAtLH(solvedL, src.H, Math.max(src.C, 0.2));
    }
  } else if (solverMode === "hue-locked") {
    // Search L, recalculate C at each step via natural scaling, then clamp to gamut.
    const getHexForHL = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, "natural");
      const clampedC = _maxChromaAtLH(L, src.H, rawC);
      return oklchToHex(L, clampedC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHexForHL);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, "natural");
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (solvedC < src.C - 0.01) chromaReduced = true;
    }
  } else {
    // natural / saturated / luminance — C determined by mode, then gamut-clamped.
    const getHexForMode = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, solverMode);
      const clampedC = _maxChromaAtLH(L, src.H, rawC);
      return oklchToHex(L, clampedC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHexForMode);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, solverMode);
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
    }
  }

  if (solvedL === null) {
    // Shouldn't happen after the pre-check, but defensive fallback.
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return {
      hex: fallback,
      achievedContrast: parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2)),
      solverMode,
      chromaReduced: true,
      clipped: true,
      warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.`,
    };
  }

  const resultHex = oklchToHex(solvedL, solvedC ?? 0, src.H);
  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));

  let warning = null;
  if (achievedContrast < targetContrast) {
    // Should not happen — defensive guard.
    warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
  } else if (achievedContrast > targetContrast + OVERSHOOT_WARN) {
    warning = `Target ${targetContrast} not achievable precisely; nearest is ${achievedContrast} (overshoot ${(achievedContrast - targetContrast).toFixed(2)}).`;
  }

  return {
    hex: resultHex,
    achievedContrast,
    solverMode,
    chromaReduced,
    clipped: false,
    warning,
  };
}

// ---------------------------------------------------------------------------
// Validate variation cardinality for a Direct Contrast role.
// Enforces: weakest < weak < base < strong < stronger (all strictly ascending).
// Returns { valid: bool, errors: string[] }
function validateVariationContrasts(variations) {
  const keys = ["weakest", "weak", "base", "strong", "stronger"];
  const vals = keys.map((k) => parseFloat(variations[k]) || 0);
  const errors = [];

  for (let i = 1; i < keys.length; i++) {
    if (vals[i] <= vals[i - 1]) {
      errors.push(
        `"${keys[i]}" (${vals[i]}) must be greater than "${keys[i - 1]}" (${vals[i - 1]}).`
      );
    }
  }

  // Each value must be >= 1.0 (minimum possible WCAG contrast is 1:1)
  for (let i = 0; i < keys.length; i++) {
    if (vals[i] < 1.0) {
      errors.push(`"${keys[i]}" contrast must be ≥ 1.0.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
