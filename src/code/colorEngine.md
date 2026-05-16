# Color Engine

Pure, stateless color token generation engine for CTM316.
Pass a config in, get `{ tonalScales, colorTokens, errors }` out. No side effects, no cache, no state.

---

## Files

```
code/
├── clrUtils.js     — pure color math primitives (no deps)
└── clrEngine.js    — complete engine (color spaces + solver + token generation)
```

---

## `clrUtils.js` — Pure Color Math

Foundation layer. No DOM, no Figma API, no external deps.

**Hex validation & normalization**

| Function       | Signature                      | Returns                                     |
| -------------- | ------------------------------ | ------------------------------------------- |
| `validHex`     | `(hex: string) → boolean`      | True if hex is a valid 3- or 6-digit string |
| `normalizeHex` | `(hex: string) → string\|null` | Canonical `#RRGGBB`, or null if invalid     |

**Channel conversions**

| Function   | Signature                 | Returns              |
| ---------- | ------------------------- | -------------------- |
| `hexToRgb` | `(hex) → [r,g,b]\|null`   | Integer 0–255        |
| `rgbToHex` | `(r,g,b) → string\|null`  | `#RRGGBB`            |
| `hexToHsl` | `(hex) → [h,s,l]\|null`   | H 0–360, S/L 0–100   |
| `hslToHex` | `(h,s,l) → string\|null`  | `#RRGGBB`            |
| `rgbToHsl` | `(r,g,b) → [h,s,l]\|null` | H 0–360, S/L 0–100   |
| `hslToRgb` | `(h,s,l) → [r,g,b]\|null` | Integer 0–255        |
| `hexToHue` | `(hex) → number\|null`    | HSL hue 0–360        |
| `hexToSat` | `(hex) → number\|null`    | HSL saturation 0–100 |

**Linear light**

| Function          | Signature             | Returns                     |
| ----------------- | --------------------- | --------------------------- |
| `srgbLinearize`   | `(v: 0–255) → float`  | Linear-light sRGB channel   |
| `srgbDelinearize` | `(v: float) → int`    | Gamma-encoded 0–255         |
| `relLum`          | `(hex) → float\|null` | WCAG relative luminance 0–1 |

**Contrast**

| Function         | Signature                     | Returns                                    |
| ---------------- | ----------------------------- | ------------------------------------------ |
| `contrastRatio`  | `(hex1, hex2) → number\|null` | WCAG ratio, 2 d.p.                         |
| `contrastRating` | `(hex1, hex2) → string\|null` | `"Fail"` / `"AA Large"` / `"AA"` / `"AAA"` |

**Hue & utilities**

| Function          | Signature                    | Returns                                     |
| ----------------- | ---------------------------- | ------------------------------------------- |
| `shortestHueDiff` | `(current, target) → number` | Signed hue delta −180 to +180               |
| `seriesMaker`     | `(x: int) → number[]`        | `[1, 2, …, x]` — default step name sequence |

---

## `clrEngine.js` — The Engine

Single file. Three internal layers, one public entry point.

### Layer 1 — Color Spaces

**OKLCH** (Björn Ottosson — perceptually uniform, direct linRGB↔LMS, no XYZ intermediate)

| Function     | Signature            | Returns               |
| ------------ | -------------------- | --------------------- |
| `hexToOklch` | `(hex) → {L, C, H}`  | L 0–1, C ≥ 0, H 0–360 |
| `oklchToHex` | `(L, C, H) → string` | Clamps out-of-gamut   |

**HCT** (CAM16 hue + chroma, CIE L\* tone — Material You)

| Function   | Signature                  | Returns                     |
| ---------- | -------------------------- | --------------------------- |
| `hexToHct` | `(hex) → {h, c, t}`        | h 0–360, c ≥ 0, t 0–100     |
| `hctToHex` | `(hue, ch, tone) → string` | Binary-search gamut mapping |

---

### Layer 2 — Contrast Solver

For Direct Contrast mode. Finds the OKLCH color closest to `sourceHex` that achieves `≥ targetContrast` against `bgHex`. Always meets or exceeds the target — never undershoots.

```
solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode)
  → { hex, achievedContrast, solverMode, chromaReduced, clipped, warning }
```

| Solver Mode          | Behaviour                                                                    |
| -------------------- | ---------------------------------------------------------------------------- |
| `"natural"`          | C scales proportionally as L deviates from source. Mimics real pigments.     |
| `"saturated"`        | Source C held fixed; only L moves. Vivid / brand-forward.                    |
| `"luminance"`        | C falls parabolically toward 0 at L=0 or L=1. Best for surfaces/backgrounds. |
| `"hue-locked"`       | H absolutely fixed; L and C co-adjusted. When hue identity must be exact.    |
| `"chroma-maximized"` | At the required L, maximises in-gamut C. Most vivid possible output.         |

```
validateVariationContrasts(targets: number[]) → { valid: boolean, errors: string[] }
```

Checks that a Direct Contrast variation array is strictly ascending.

---

### Layer 3 — Tonal Scale & Token Generation

**Tonal scale algorithms** (`tonalScaleMaker(hexIn, scaleLength, scaleAlgo) → string[]`)

| Algorithm    | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `Linear`     | Even lightness steps in HSL                                  |
| `Uniform`    | Perceptually uniform luminance steps via binary search       |
| `Natural`    | Uniform + chroma tapering near white/black                   |
| `Expressive` | Natural + subtle hue shift toward warm/cool at extremes      |
| `Symmetric`  | Log-luminance scale anchored to source color                 |
| `OKLCH`      | Uniform luminance steps preserving OKLCH hue + chroma        |
| `Material`   | Uniform luminance steps in HCT (Material You tonal palettes) |

---

## Public API

```
variableMaker(config) → { tonalScales, colorTokens, errors }
```

**`config` shape:**

| Key                 | Type                        | Description                                                 |
| ------------------- | --------------------------- | ----------------------------------------------------------- |
| `colors`            | `Color[]`                   | `{ name, value (hex), shorthand, description, solverMode }` |
| `themes`            | `Theme[]`                   | `[{ name, bg }, ...]` — index 0 = light, index 1 = dark     |
| `scaleLength`       | `number`                    | Number of steps in the tonal scale                          |
| `scaleStepNames`    | `any[]`                     | Labels per step; defaults to `[1…N]`                        |
| `scaleAlgorithm`    | `string`                    | One of the tonal algorithm names above                      |
| `pluginMode`        | `"tonal"\|"adaptiveEngine"` | Tonal builds ramps; direct uses the solver                  |
| `roles`             | `Role[]`                    | Semantic roles (primary, secondary, etc.)                   |
| `roleMapping`       | `"By Contrast"\|"By Index"` | How base step is found in tonal mode                        |
| `variations`        | `any[]`                     | Variation slots per role                                    |
| `spreadUnit`        | `"contrast"\|"step"`        | How variations spread around the base                       |
| `baseSelectionMode` | `"Manual"\|"Auto"`          | Manual picks exact steps; auto uses contrast targets        |

**Output:**

| Key           | Description                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| `tonalScales` | `{ [colorName]: { [stepName]: { value, stepName, shorthand, contrast } } }`   |
| `colorTokens` | `{ light: { [colorName]: { [roleIdx]: { [varIdx]: token } } }, dark: {...} }` |
| `errors`      | `{ critical: [], warnings: [], notices: [] }`                                 |

> `variableMaker` is **pure** — same config always produces the same output.
> Caching is the caller's responsibility. The plugin middleware in `main.js` owns the hash cache via `_runEngine()`.

---

## Dependency Graph

```
clrUtils.js      (no deps)
    └── clrEngine.js (uses clrUtils.js primitives)
```

---

## Standalone Usage

Concatenate in this order, then call `variableMaker(config)`:

```
clrUtils.js → clrEngine.js
```

No bundler required. Plain ES5-compatible JS.

---

## WCAG Contrast Reference

| Rating   | Ratio   |
| -------- | ------- |
| AAA      | ≥ 7:1   |
| AA       | ≥ 4.5:1 |
| AA Large | ≥ 3:1   |
| Fail     | < 3:1   |
