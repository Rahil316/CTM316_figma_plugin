# Terminology Rename Snapshot
Applied: 2026-05-08 · Branch: ProModeBeta

This table records every rename made so future contributors and export/import compatibility work can trace old → new.

---

## UI Labels (what users see)

| Old Label | New Label | Location |
|---|---|---|
| Color Groups (tab) | Palettes | Sidebar tab |
| Theme Roles (tab) | Color Roles | Sidebar tab |
| Plugin Mode (section heading) | Generation Mode | Settings sheet |
| Ramp (mode button) | Tonal Scale | Settings / mode toggle |
| Weights Count | Step Count | Settings · Color Settings |
| Weights Creation Method | Scale Algorithm | Settings · Color Settings |
| Color Group Weight Names (CSV) | Step Labels (CSV) | Settings · Color Settings |
| Roles Variations Count | Variation Levels | Settings · Role Settings |
| Role Mapping Method | Base Selection | Settings · Role Settings |
| Contrast Based (option) | By Contrast | Base Selection dropdown |
| Manual Base Index (option) | By Index | Base Selection dropdown |
| Role Variation Names (CSV) | Variation Labels (CSV) | Settings · Role Settings |
| Skip Color Ramps | Embed Colors Directly | Output Options toggle |
| Use hex values directly, no Color collection | Write hex values into tokens instead of referencing the Tonal Scale collection | Toggle description |
| Constants Collection | Global Colors | Output Options toggle |
| Write raw brand hex values — no themes, no processing | Store raw brand hex values — no themes, no processing | Toggle description |
| Opacity Variants | Alpha Tints | Output Options toggle |
| Opacity Values (CSV, 0–100) | Alpha Values (CSV, 0–100) | Input label |
| Add alpha versions under colorName/Opacities/ | Add alpha tint variables under colorName/Opacities/ | Description |
| Token Grouping | Variable Structure | Output Options |
| By Color (option) | Color-first | Variable Structure options |
| By Role (option) | Role-first | Variable Structure options |
| Variable Name Format | Variable Naming | Output Options section |
| Short names — Colors | Abbreviate Color Names | Variable Naming toggle |
| Short names — Roles | Abbreviate Role Names | Variable Naming toggle |
| System Name | Project Name | Settings · Basic |
| Light theme bg | Light Background | Settings · Basic |
| Dark theme bg | Dark Background | Settings · Basic |
| colors Collection Name | Tonal Scale Collection | Settings · Variable Collections |
| Tokens collection Name | Token Collection | Settings · Variable Collections |
| Figma Collections (section) | Variable Collections | Settings sheet |
| Solver Mode (color card) | Color Solver | Color card (Direct Contrast mode) |
| Natural — scales chroma with lightness | Balanced — adjusts hue and vibrancy naturally | Color Solver option |
| Saturated — holds source chroma, moves L only | Vivid — preserves saturation, adjusts brightness only | Color Solver option |
| Luminance — fades toward neutral gray at extremes | Muted — fades toward neutral at low/high lightness | Color Solver option |
| Hue Locked — fixes H absolutely, co-adjusts L+C | Hue Faithful — locks hue angle, adjusts brightness and vibrancy | Color Solver option |
| Chroma Max — most vivid possible at required contrast | Max Vibrancy — most saturated color that meets contrast | Color Solver option |
| Seed Hex (color card column) | Source Color | Color card header |
| Contrast- Light | Light Contrast | Color card column header |
| Contrast- Dark | Dark Contrast | Color card column header |
| Base ☀️ (role card) | Light Base | Role card label |
| Base 🌙 (role card) | Dark Base | Role card label |
| Color Preview (preview tab) | Token Preview | Preview panel |
| Color Ramps (preview tab, Tonal Scale mode) | Tonal Scale | Preview panel |
| Ramp Type / Scale Type (run dialog summary) | Scale Algorithm | Run dialog summary |
| Role Mapping (run dialog summary) | Base Selection | Run dialog summary |
| SCOPE (run dialog heading) | WHAT TO UPDATE | Run dialog |
| All (scope button) | Everything | Run dialog |
| Color Ramps Only / Tonal Scale Only (scope button) | Scale Only | Run dialog |
| SILENT RENAMES DETECTED | VARIABLES TO RENAME | Run dialog |
| Ramp Steps (rename type label) | Scale Steps | Run dialog rename list |
| Overwrite Data? (import dialog) | Replace Configuration? | Import confirmation |
| Import & Overwrite | Import & Replace | Import confirmation button |
| color groups and roles (in dialog body) | palettes and color roles | Import confirmation body |

---

## Default Values Changed

| Field | Old Default | New Default |
|---|---|---|
| Role variation names | weakest, weak, base, strong, stronger | decorative, subtle, default, emphasized, prominent |
| Tonal Scale collection name | _Colors | _scale |

---

## appState Key Renames (JavaScript / JSON / config persistence)

These affect the stored config (`__ctm316_config__` variable), JSON exports, and all internal reads/writes.

| Old Key | New Key | Files affected |
|---|---|---|
| `rampType` | `scaleAlgorithm` | uiGen.js, config.js, clrGen.js |
| `skipColorRamps` | `embedDirectly` | uiGen.js, config.js, figmaVars.js |
| `includeConstants` | `includeGlobalColors` | uiGen.js, config.js, figmaVars.js |
| `constantsCollectionName` | `globalColorsCollectionName` | uiGen.js, config.js, figmaVars.js |
| `includeConstantOpacities` | `includeAlphaTints` | uiGen.js, config.js, figmaVars.js |
| `constantOpacities` | `alphaValues` | uiGen.js, config.js, figmaVars.js |
| `colorsCollectionName` | `tonalScaleCollectionName` | uiGen.js, config.js, figmaVars.js |
| `contextualCollectionName` | `tokenCollectionName` | uiGen.js, config.js, figmaVars.js |
| `tokenGrouping` | `variableStructure` | uiGen.js, config.js, figmaVars.js |
| `roleMapping` (appState) | `baseSelection` | uiGen.js, config.js |

> **Note:** `config.roleMapping` (the derived output key inside `translateConfig`) is retained as an internal pipeline key — clrGen reads it as `config.roleMapping`. Only the appState source key was renamed.

---

## Method Renames

| Old | New | File |
|---|---|---|
| `VariableManager.syncConstants()` | `VariableManager.syncGlobalColors()` | figmaVars.js |

---

## HTML Element ID Renames

| Old ID | New ID | File |
|---|---|---|
| `toggle-skipColorRamps` | `toggle-embedDirectly` | ui.html |
| `rd-toggle-skipColorRamps` | `rd-toggle-embedDirectly` | ui.html |
| `toggle-includeConstants` | `toggle-includeGlobalColors` | ui.html |
| `toggle-includeConstantOpacities` | `toggle-includeAlphaTints` | ui.html |
| `setting-rampType` | `setting-scaleAlgorithm` | ui.html |
| `setting-colorsCollectionName` | `setting-tonalScaleCollectionName` | ui.html |
| `setting-tokensCollectionName` | `setting-tokenCollectionName` | ui.html |
| `setting-constantsCollectionName` | `setting-globalColorsCollectionName` | ui.html |
| `setting-constantOpacities` | `setting-alphaValues` | ui.html |
| `setting-roleMapping` | `setting-baseSelection` | ui.html |

---

## Compatibility Note

Existing users with a `__ctm316_config__` variable saved under old key names will load defaults for the renamed keys on first run. Their visual settings (colors, roles, themes) are unaffected — only Output Options and collection names reset. A migration shim can be added to `main.js` if backward compatibility becomes a requirement.

The default variation names change (`weakest → decorative` etc.) is a **breaking change** for users who have already published tokens using the old names. Figma variables with paths like `Primary/Text/base` remain untouched — the rename only affects the default suggestions in a new project or when variation labels are cleared.
