# CTM316 Figma Plugin — Full Code Review

> Reviewed all 12 source files (~2,800 lines of JS + 1,000 lines of HTML).
> Issues sorted: 🔴 **Crash/Data Loss** → 🟠 **Major Bug** → 🟡 **Moderate** → 🔵 **Minor** → ⚪ **Cosmetic/Inconsistency**

---

## 🔴 CRASH / DATA LOSS (3 issues)

### C1. `allRampVars` is never declared — **Stage 1 ramp sync will crash**
**File:** [figmaVars.js:95](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L85-L98)
```js
// Line 85-98: allRampVars is USED but never declared
if (rampsCol && (scope === "all" || scope === "groups")) {
  const modeId = rampsCol.modes[0].modeId;
  // ...
  for (const [colorName, ramp] of Object.entries(result.colorRamps)) {
    // ...
    allRampVars.push([...]); // ← ReferenceError: allRampVars is not defined
  }
  await this.upsertVariables(rampsCol, modeId, allRampVars);
}
```
**Impact:** Every "Run" that touches tonal scale collections will throw `ReferenceError` and abort. **The user's colors never sync to Figma.**

**Fix:** Add `const allRampVars = [];` before the for-loop on line 89.

---

### C2. `pluginMode` type mismatch — default `0` vs checks for `"direct"`
**File:** [state.js:46](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/state.js#L46) vs [config.js:21](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/config.js#L21) + many others

```js
// state.js — default is a NUMBER
pluginMode: 0, // 0: ramp, 1: direct

// config.js — compared as STRING
pluginMode: appState.pluginMode || "ramp",  // 0 || "ramp" → "ramp" ✓ (by accident)

// uiGen.js L225, ui-components.js L71 — compared as STRING
const isDirectMode = appState.pluginMode === "direct"; // 0 === "direct" → ALWAYS false on fresh load
```

**Impact:** On **fresh load** (before user clicks any mode button), `pluginMode` is `0`. The `setPluginMode(1)` sets it to `"direct"` (the string). This works _after_ user interaction, but on first load from demo config, **Direct mode can never be the default**. If a saved config stores `pluginMode: 1` (old format), the string comparison `=== "direct"` silently fails — **Direct-mode UI never activates on restore**.

**Fix:** Change `demoConfig.pluginMode` to `"ramp"` (string), and ensure `applyImport` / `load-config` coerces numeric `0/1` to `"ramp"/"direct"`.

---

### C3. `watch.js` uses `recursive: false` — won't detect changes in subdirectories
**File:** [watch.js:22](file:///Users/mac/Documents/Git/CTM316_figma_plugin/watch.js#L22)

```js
fs.watch(SRC_DIR, { recursive: false }, (_, filename) => { ... });
```

**Impact:** All source files live in `src/color/`, `src/figma/`, `src/ui/` subdirectories. With `recursive: false`, **only changes to files directly in `src/` (like `utils.js` and `ui.html`) trigger rebuilds**. Changes to `clrGen.js`, `figmaVars.js`, `uiGen.js`, etc. are silently ignored — the developer sees stale builds until they manually `npm run build`.

**You are running 3 stale watch processes right now**, presumably because you noticed the watch wasn't working.

**Fix:** Change to `{ recursive: true }`.

---

## 🟠 MAJOR BUG (5 issues)

### M1. `colorName` variable shadowed — ramp variable map uses wrong value
**File:** [figmaVars.js:46+66+89](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L46-L89)

```js
const colorName = (appState && appState.tonalScaleCollectionName) || "_scale"; // L46 — COLLECTION name

for (const [colorName, ramp] of Object.entries(result.colorRamps)) {  // L66 — shadows with COLOR name
  // ...
  this.rampVarNameMap[entry.stepName] = `${colorLabel(colorName)}/${weightName}`; // uses correct inner
}

// L89 — shadows AGAIN
for (const [colorName, ramp] of Object.entries(result.colorRamps)) { // ...
```

The `const colorName` on L46 (collection name like `"_scale"`) is silently shadowed by the loop variable `colorName` (color names like `"Primary"`). This currently works by accident because the for-loop declares its own `const`, but it is fragile and confusing. If the loop is ever refactored, L77 and L169 (which use the outer `colorName` for the collection) could read the wrong value.

**Fix:** Rename the outer variable to `colorCollectionName` or `rampCollectionName`.

---

### M2. Duplicate `relLum` logic — drift risk between `utils.js` and `clrSpaces.js`
**File:** [utils.js:113-121](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/utils.js#L113-L121) + [clrSpaces.js:2-3](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/color/clrSpaces.js#L2-L3) + [clrSolver.js:28-43](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/color/clrSolver.js#L28-L43)

Three separate implementations of sRGB linearisation and relative luminance:
| File | Function | Used by |
|------|----------|---------|
| `utils.js` | `relLum(hex)` with sRGB threshold `0.03928` | UI preview, contrast calc |
| `clrSpaces.js` | `_lin()` with threshold `0.04045` | OKLCH/HCT color spaces |
| `clrSolver.js` | `_relLumFromLinear()` | Contrast solver |

The thresholds **differ** (`0.03928` vs `0.04045`). While both are technically valid IEC standards, this means contrast ratios computed by the solver can differ slightly from those shown in the preview.

**Fix:** Consolidate to a single `srgbLinearize()` function using the modern `0.04045` threshold and have all three files reference it.

---

### M3. `translateConfigForPreview()` duplicates `translateConfig()` — already diverging
**File:** [uiGen.js:33-85](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L33-L85) vs [config.js:2-46](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/config.js#L2-L46)

These two functions do the same job (translate raw appState to engine format) but have drifted:

| Difference | `translateConfig` (backend) | `translateConfigForPreview` (UI) |
|---|---|---|
| `minContrast` | `String(role.minContrast)` | `parseFloat(role.minContrast)` |
| `description` | Included | **Missing** |
| `variableStructure`, `useShorthand*` | Included | **Missing** |
| `includeDescriptions` | Included | **Missing** |
| `alphaValues` parsing | Full parser | **Missing** |
| `roleStepNames` | Computed | **Missing** |

**Impact:** Preview in UI will behave differently from actual Figma sync for edge cases (e.g., description-based logic, contrast as string vs number).

**Fix:** Import and reuse `translateConfig` in the UI thread (it's already available — the build inlines all files). Delete `translateConfigForPreview`.

---

### M4. Tailwind version conflict — v3 config + v4 CLI
**File:** [package.json](file:///Users/mac/Documents/Git/CTM316_figma_plugin/package.json#L18-L20)

```json
"@tailwindcss/cli": "^4.3.0",    // v4 CLI
"tailwindcss": "^3.4.19"          // v3 core
```

The `tailwind.config.js` uses v3 format (`module.exports`), but `@tailwindcss/cli` is v4 which doesn't read `tailwind.config.js` by default. Meanwhile, `build.js` calls `npx tailwindcss` (the v3 binary). This creates an ambiguous toolchain where the wrong version might be invoked depending on `PATH` resolution.

**Fix:** Either upgrade fully to Tailwind v4 or remove `@tailwindcss/cli` and pin to v3.

---

### M5. `Store.update()` mutates with `Object.assign` but nobody calls `Store.notify()`
**File:** [state.js:99-117](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/state.js#L99-L117)

The `Store` has a proper subscription system, but **no code ever calls `Store.update()` or `Store.subscribe()`**. All state mutations happen via direct `appState.colors[idx].value = ...` assignments. The Store is dead code.

**Impact:** No reactivity — every mutation must manually call `renderColorGroups()`, `renderRoles()`, etc. This is error-prone and many update paths miss re-renders (e.g., `updateRole()` doesn't trigger preview refresh).

**Fix:** Either wire up the Store pattern or remove it to avoid confusion. Long-term, adopt it properly.

---

## 🟡 MODERATE (8 issues)

### D1. `withPreservedFocus()` and `applyUiPrefs()` defined inside `if (typeof document !== "undefined")` — **invisible to strict-mode / bundlers**
**File:** [utils.js:171-200](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/utils.js#L171-L200)

Functions declared inside an `if` block are technically block-scoped in strict mode. They currently work because the concatenated output runs in sloppy mode, but this is fragile.

**Fix:** Move the guard inside the function body: `function withPreservedFocus(fn) { if (typeof document === "undefined") return; ... }`.

---

### D2. `debounce` uses `var args` and `.apply(null)` — loses `this` context
**File:** [utils.js:162-169](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/utils.js#L162-L169)

```js
const debounce = (fn, delay = 150) => {
  let timeout;
  return function () {
    var args = Array.prototype.slice.call(arguments);      // ← old-style
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay); // ← loses 'this'
  };
};
```

Uses `var` and `Array.prototype.slice.call(arguments)` while rest of codebase uses ES6. Also, `fn.apply(null, ...)` discards `this` binding.

**Fix:** `return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, args), delay); };`

---

### D3. `schedulePreview()` is a no-op — preview is never live
**File:** [uiGen.js:813](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L813)

```js
function schedulePreview() {} // no-op placeholder
```

This is called from 15+ places (variation changes, role changes) but does nothing. The preview only updates when the user manually clicks the Preview button. This means variation target edits give zero visual feedback until the user clicks Preview.

**Fix:** Either implement debounced preview or document the intentional no-op with a clearer name.

---

### D4. `setBaseSelection()` accepts index but `UI_MODES.selection` changed to strings
**File:** [uiGen.js:821-824](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L821-L824)

```js
function setBaseSelection(idx) {
  appState.baseSelection = UI_MODES.selection[idx] || "By Contrast";
  syncUiSettingsInputs();  // ← only syncs scale/theme dropdowns, NOT settings inputs
}
```

This calls `syncUiSettingsInputs()` which only syncs `ui-scale` and `ui-theme`. It should call `updateSettingsFromInputs()` or at minimum re-render the roles panel.

**Fix:** Call `renderRoles()` and `syncOutputToggles()` after changing `baseSelection`.

---

### D5. CSS theme duplication — `body[data-ui-theme="dark"]` = `:root` = `body.app-light-mode`
**File:** [ui.html:24-90](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui.html#L24-L90)

Three separate blocks define the same dark-mode variables:
1. `:root` (L24-49) — default
2. `body[data-ui-theme="dark"]` (L51-63) — explicit dark
3. `:root` again (identical values)

And two blocks for light mode:
1. `body[data-ui-theme="light"]` (L64-76)
2. `body.app-light-mode` (L77-90) — identical values, different selector

**Fix:** Remove the `body.app-light-mode` block (unused) and collapse the duplicate dark-mode declarations.

---

### D6. SVG icons hardcoded with `fill="white"` — broken in light theme
**File:** [ui.html:377-401](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui.html#L377-L401)

```html
<svg ... fill="white">  <!-- More options -->
<svg ... fill="white">  <!-- Import -->
<svg ... stroke="white">  <!-- Preview -->
```

These header icons are hardcoded to `white`, which disappears on the light theme.

**Fix:** Use `fill="currentColor"` and control via the text color CSS variable.

---

### D7. Empty `catch` blocks swallow real errors silently
**Across multiple files:**

| File | Line | Context |
|------|------|---------|
| [utils.js:185](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/utils.js#L185) | `catch (e) {}` | `setSelectionRange` failure |
| [figmaVars.js:27](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L27) | `catch (_) {}` | Rename failure |
| [figmaVars.js:189](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L189) | `catch (_) {}` | Config cleanup failure |
| [figmaVars.js:202](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L202) | `catch (_) {}` | `saveConfig` failure |
| [main.js:24+46+59](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/main.js#L24) | `catch (_) {}` ×3 | UI init failures |

**Fix:** Add at minimum `console.warn(...)` to avoid silent data loss.

---

### D8. `demoConfig` has `minContrast` as number but `updateRole()` stores as string
**File:** [state.js:58](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/state.js#L58) vs [uiGen.js:508-510](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L508-L510)

```js
// state.js — number
{ name: "Text", minContrast: 4.5, ... }

// uiGen.js — stores as string
appState.roles[idx].minContrast = Math.max(1, Math.min(21, v)).toString();

// config.js — converts back with String()
minContrast: String(role.minContrast !== undefined ? role.minContrast : "4.5"),
```

The type oscillates: `4.5` (number) → `"4.5"` (string via toString) → `"4.5"` (String()). While `parseFloat` handles this, it's confusing and error-prone.

**Fix:** Pick one type (number) and use it consistently.

---

## 🔵 MINOR (6 issues)

### N1. Duplicate SVG trash icon — defined twice in `ui-components.js`
**File:** [ui-components.js:10+48](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/ui-components.js#L10)

The `Icons.Trash` SVG (300+ chars) is defined as a constant at line 10, but then an identical inline SVG is hardcoded in `ColorGroupCard` at line 47-49. The `RoleGroupCard` correctly uses `${Icons.Trash}`.

**Fix:** Use `${Icons.Trash}` in `ColorGroupCard` too.

---

### N2. `input.css` is trivial — only 59 bytes
**File:** [input.css](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/input.css)

This file likely just has `@tailwind` directives. Given you're using the Tailwind CDN in development, this file is only used by the build step. It works but adds unnecessary build complexity.

---

### N3. `_previewLastHash` / `_previewCache` never reset
**File:** [uiGen.js:30-31](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L30-L31)

When a user imports a config or clears data, the preview cache should be invalidated but isn't.

**Fix:** Set `_previewLastHash = null; _previewCache = null;` in `applyImport()` and `opt-clear`.

---

### N4. `lastInputHash` global cache leaks across Figma sessions
**File:** [clrGen.js:2-3](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/color/clrGen.js#L2-L3)

The backend `variableMaker` cache persists for the plugin's lifetime. If the user changes the Figma file (which reloads the config), the cache may serve stale results since the hash doesn't include the file context.

---

### N5. `renderColorGroups()` called twice on boot
**File:** [uiGen.js:1247+1667](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L1247)

```js
// Line 1247 (after ensureVariations)
renderColorGroups();

// Line 1667 (boot block)
renderColorGroups();
renderRoles();
```

**Fix:** Remove the first call on line 1247.

---

### N6. `baseSelection` default is `"By Contrast"` but `groupingMode` is numeric
**File:** [state.js:47-48](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/state.js#L46-L48)

```js
pluginMode: 0,           // numeric
groupingMode: 0,         // numeric
baseSelection: "By Contrast", // string
spreadUnit: "steps",     // string
```

Mixed use of numeric indices and string identifiers for mode settings. Only `pluginMode` and `groupingMode` are numeric; the rest are strings.

---

## ⚪ COSMETIC / INCONSISTENCY (8 issues)

### I1. Inconsistent function declaration styles
Some functions use `function foo()`, others `const foo = () =>`, others `const foo = debounce(() => ...)`. No clear pattern for when to use which.

### I2. Mixed use of `var` and `const/let`
[uiGen.js:376](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/uiGen.js#L376) uses `var ruleVal;` — the only `var` in the entire UI codebase. Everything else uses `const`/`let`.

### I3. Section numbering in comments is inconsistent
- `utils.js`: No section numbers
- `main.js`: Sections 1-8 listed in header, file only contains 1-2
- `clrSpaces.js`: "6. COLOR SPACES" but it's file #3 in the build
- `figmaVars.js`: "5. FIGMA VARIABLE API" 
- `docGen.js`: "4. EXPORT FORMATTERS"

The section numbers refer to the old monolithic script and no longer match the split-file structure.

### I4. Comment header says "Keep in sync with Utils.js" but no sync mechanism exists
[utils.js:5](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/utils.js#L5): `Keep in sync with Utils.js; never add DOM-aware logic here.` — references a Web_App file with no automated check.

### I5. `size-` typo in class name
[ui-components.js:43](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/ui/ui-components.js#L43):
```html
class="cursor-pointer size- bg-transparent ..."
```
`size-` is an incomplete Tailwind class (should be `size-8` or similar). Produces no styling.

### I6. Inconsistent hex handling — some with `#`, some without
- `demoConfig` stores values as `"0067DD"` (no hash)
- `normalizeHex()` adds `#`
- Some places pass raw values, others normalized — works but messy

### I7. `cssSlug()` and `slugify()` are near-identical with slight differences
Both convert strings to kebab-case identifiers but differ in edge cases (e.g., `slugify` preserves `\w` chars, `cssSlug` only allows `a-z0-9-`).

### I8. Duplicate comment on `hexToFigmaRgb`
[figmaVars.js:299-300](file:///Users/mac/Documents/Git/CTM316_figma_plugin/src/figma/figmaVars.js#L299-L300):
```js
// Converts hex to Figma's { r, g, b } (0–1 range). Lives here because it bridges color math and Figma API.
// Converts a hex string to Figma's { r, g, b } format (0–1 range).
```

---

## Fix-Up Plan

### Phase 1: Critical Fixes (Do Now) ⏱️ ~30 min

| # | Issue | File | Action |
|---|-------|------|--------|
| 1 | **C1** | `figmaVars.js` | Add `const allRampVars = [];` before L89 |
| 2 | **C2** | `state.js` | Change `pluginMode: 0` → `pluginMode: "ramp"` |
| 3 | **C2** | `uiGen.js` | Add migration in `load-config` and `applyImport`: `if (state.pluginMode === 0) state.pluginMode = "ramp"; if (state.pluginMode === 1) state.pluginMode = "direct";` |
| 4 | **C3** | `watch.js` | Change `recursive: false` → `recursive: true` |
| 5 | **M1** | `figmaVars.js` | Rename outer `colorName` to `rampCollectionName` |

### Phase 2: Major Bug Fixes ⏱️ ~1-2 hours

| # | Issue | File | Action |
|---|-------|------|--------|
| 6 | **M3** | `uiGen.js` | Delete `translateConfigForPreview()`, use `translateConfig()` directly |
| 7 | **M2** | `utils.js`, `clrSpaces.js` | Consolidate sRGB linearisation; pick `0.04045` threshold |
| 8 | **M4** | `package.json` | Remove `@tailwindcss/cli` or upgrade all to v4 |
| 9 | **M5** | `state.js` | Remove dead `Store` code or wire it up |
| 10 | **D4** | `uiGen.js` | Add `renderRoles()` + `syncOutputToggles()` to `setBaseSelection()` |

### Phase 3: Moderate Fixes ⏱️ ~1-2 hours

| # | Issue | File | Action |
|---|-------|------|--------|
| 11 | **D1** | `utils.js` | Move env guards inside function bodies |
| 12 | **D2** | `utils.js` | Modernise `debounce` to use rest params |
| 13 | **D5** | `ui.html` | Remove duplicate CSS theme blocks |
| 14 | **D6** | `ui.html` | Replace `fill="white"` with `fill="currentColor"` on header SVGs |
| 15 | **D7** | Multiple | Add `console.warn` to empty catch blocks |
| 16 | **D8** | `uiGen.js` | Store `minContrast` as number, not string |
| 17 | **D3** | `uiGen.js` | Either implement `schedulePreview` or rename to clarify intent |

### Phase 4: Cleanup & Consistency ⏱️ ~1 hour

| # | Issue | File | Action |
|---|-------|------|--------|
| 18 | **N1** | `ui-components.js` | Use `Icons.Trash` in `ColorGroupCard` |
| 19 | **N3** | `uiGen.js` | Reset preview cache on import/clear |
| 20 | **N5** | `uiGen.js` | Remove duplicate `renderColorGroups()` call |
| 21 | **I2** | `uiGen.js` | Change `var ruleVal` → `let ruleVal` |
| 22 | **I3** | All files | Remove/update stale section numbers |
| 23 | **I5** | `ui-components.js` | Fix `size-` → `size-8` (or appropriate value) |
| 24 | **I6** | `state.js` | Decide on hex format convention, document it |
| 25 | **I8** | `figmaVars.js` | Remove duplicate comment |
| 26 | **N6/C2** | `state.js` | Change `groupingMode: 0` → remove (unused, `variableStructure` is the real one) |

> [!IMPORTANT]
> **Phase 1 items (especially C1 and C3) should be fixed immediately** — C1 means the Figma sync is currently broken for tonal scales, and C3 means your watch process isn't detecting most file changes.
