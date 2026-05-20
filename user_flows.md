# CTM316 — UI Logic, Conditions & User Flows

Every interaction a user can perform, the state it reads, the conditions that gate it, and the effect it has on appState and the DOM.

---

## 1. Plugin Boot

**Sequence:**

1. `renderColorGroups()` — draws color cards into `#sidebar-content-container` (debounced 50 ms)
2. `renderRoles()` — draws role cards (no-op until user switches to Roles tab)
3. `syncInputsFromState()` — writes all appState values into settings inputs, syncs all toggles and pills
4. `syncUiSettingsInputs()` — sets UI Scale and Theme selects from `uiPrefs`
5. `applyUiPrefs()` — applies `zoom` + `data-ui-theme` to the document

**Then the Figma backend sends messages:**

- `capabilities` → if `multiMode` is false, all `[data-requires-multimode]` elements are hidden
- `load-config` → merges saved state over demoConfig, migrates legacy fields, calls `renderColorGroups`, `renderRoles`, `syncInputsFromState`
- `load-ui-prefs-meta` → validates and applies scale + theme preferences

---

## 2. Main Navigation (Sidebar Tabs)

Three sidebar tabs: **Project**, **Colors** (`color-groups`), **Roles** (`roles-config`).  
A fourth button opens the **Preview** screen (not a tab — a separate fullscreen overlay).

| Tab     | `activeSidebarTab` value | Renderer called                                |
| ------- | ------------------------ | ---------------------------------------------- |
| Project | `"project"`              | `renderSidebarProject()`                       |
| Colors  | `"color-groups"`         | `renderColorGroups()`                          |
| Roles   | `"roles-config"`         | `renderRoles()`                                |
| Preview | n/a (screen swap)        | `renderPreviewTabs()` + `renderPreviewPanel()` |

**Keyboard shortcuts (Alt + digit, no input focused, settings closed):**

- `Alt+0` → Project tab
- `Alt+1` → Colors tab
- `Alt+2` → Roles tab
- `Alt+3` → Preview: Tonal Scale panel (hidden if `pluginMode === "adaptiveEngine"`)
- `Alt+4` → Preview: Theme 1 panel
- `Alt+N` → Preview: Theme N−3
- `Escape` → close Preview

**renderColorGroups conditions:**

- Skips render if `activeSidebarTab !== "color-groups"`
- If `appState.colors` is empty → shows empty state message
- Each card includes: `_ColorMainRow` always, `_ColorSolverRow` conditionally, `_ColorAlgoRow` conditionally, `_ColorDescriptionRow` conditionally

**renderRoles conditions:**

- Skips render if `activeSidebarTab !== "roles-config"`
- Each card is built by `RoleGroupCard`

---

## 3. Settings Screen

### Opening

`btn-settings` → `openSettings()`

**Snapshot taken of:** `scaleLength`, `scaleAlgorithm`, `scaleStepNames`, `pluginMode`, `baseSelection`, `spreadUnit`, `tonalScaleCollectionName`, `tokenCollectionName`, `embedDirectly`, `includeGlobalColors`, `globalColorsCollectionName`, `includeAlphaTints`, `alphaValues`, `variableStructure`, `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `includeDescriptions`, `allowRoleVariations`, `perRoleControls`, `includeTonalCollection`, `useGlobalAlgo`, `perColorAlgoScope`, `tokenNameOrder`, `variations`

**Note — fields NOT in snapshot (so Cancel cannot revert them):** `themes`, `colors`, `roles`, `name`. Theme and role changes made during settings are permanent even on Cancel.

`syncInputsFromState()` is called → all inputs, toggles, pills, dropdowns are synced to current appState.  
Settings screen is opened to the **Tokens** tab by default.

### Tabs

Five tabs: **Project**, **Palettes**, **Roles**, **Figma**, **Plugin**

`switchSettingsTab(tab)` toggles `.active` on tab buttons and `.hidden` on panels.

### Done

`settings-done` → `closeSettings(false)` → `updateSettingsFromInputs()`

**Fields read from DOM inputs on Done:**

- `setting-tonalScaleCollectionName` → `appState.tonalScaleCollectionName` (default `"_scale"`)
- `setting-tokenCollectionName` → `appState.tokenCollectionName` (default `"contextual"`)
- `setting-scaleLength` → `appState.scaleLength` (clamped 1–100, default 25)
- `setting-scaleAlgorithm` → `appState.scaleAlgorithm`
- `setting-scaleStepNames` → `appState.scaleStepNames`
- `setting-globalColorsCollectionName` → `appState.globalColorsCollectionName` (default `"_constants"`)
- `setting-alphaValues` → `appState.alphaValues`

**Note — fields NOT read on Done (set live via toggles/buttons, already in appState):** `pluginMode`, `embedDirectly`, `includeGlobalColors`, `includeAlphaTints`, `variableStructure`, `tokenNameOrder`, `useShorthandColors/Roles/Variations`, `useGlobalAlgo`, `perColorAlgoScope`, `perRoleControls`, `allowRoleVariations`, `includeDescriptions`, `includeTonalCollection`, `baseSelection`, `spreadUnit`, `themes`, `variations`

After Done: `renderColorGroups()`, `renderRoles()`, `renderPreviewTabs()`, `schedulePreview()`

### Cancel

`settings-cancel` → `closeSettings(true)` → `Object.assign(appState, _settingsSnapshot)` → `syncOutputToggles()`, `syncAlgoSection()`, `renderColorGroups()`, `renderRoles()`, `renderPreviewTabs()`, `schedulePreview()`

---

## 4. Settings — Palettes Tab (Scale)

### Plugin Mode

Two buttons: **Tonal Scale** (`tonalScalesBased`) / **Adaptive Engine** (`adaptiveEngine`)  
`setPluginMode(idx)` → `appState.pluginMode` → `syncOutputToggles()`, `renderColorGroups()`, `renderRoles()`, `schedulePreview()`

**Cascading effects of mode change (via `_syncModeControls`):**

- `mode-btn-ramp` active when tonal; `mode-btn-direct` active when adaptive
- `settings-scale-section` hidden when adaptive
- `settings-tonal-collection-row` hidden when adaptive
- `settings-embed-directly-row` hidden when adaptive
- `base-selection-opt-byindex` hidden when adaptive; if `baseSelection === "By Index"`, forced to `"By Contrast"`
- Preview tab label: "Tonal Scale" (tonal) or "Solved Colors" (adaptive)
- Preview: Tonal Scale tab (`preview-tab-colors`) hidden when adaptive

### Base Selection

Three options: **By Contrast** / **By Index** / **Manual**  
`setBaseSelection(idx)` → `appState.baseSelection` → `syncUiSettingsInputs()`, `renderRoles()`, `syncOutputToggles()`, `schedulePreview()`

**By Index** option is hidden in adaptive engine mode.

**Effect on Spread Unit row:** `settings-spread-unit-row` is hidden when `pluginMode === "adaptiveEngine"` OR `baseSelection === "Manual"`.

**Effect on role card label:** When `perRoleControls` is on, global label reads "Default Base Selection"; when off, "Base Selection".

### Spread Unit

Two buttons: **Steps** / **Contrast**  
`setSpreadUnit(idx)` → `appState.spreadUnit` → `syncOutputToggles()`, `renderRoles()`, `schedulePreview()`

Spread Unit row is hidden when adaptive engine OR `baseSelection === "Manual"`.

### Global Algorithm / Solver

Toggle: `useGlobalAlgo` (true = single global algo for all; false = per-color or per-role)  
`toggleBoolSetting("useGlobalAlgo")` → `appState.useGlobalAlgo` → `syncOutputToggles()`, `renderColorGroups()`, `renderRoles()`, `schedulePreview()`

**Cascading effects (via `syncAlgoSection`):**

- Title text: "Global Algorithm" (tonal) / "Global Solver" (adaptive)
- Description: "Use a single algorithm for all colors" / "Use a single solver for all colors and roles"
- `setting-global-algo-row` (the algorithm select): hidden when `useGlobalAlgo` is false
- `setting-algo-scope-row` (Color vs Role scope): visible only when adaptive engine AND `useGlobalAlgo` is false

### Algo Scope (Color vs Role)

Only visible in adaptive engine mode with `useGlobalAlgo` off.  
Two buttons: **Color** / **Role**  
`setAlgoScope(scope)` → `appState.perColorAlgoScope` → syncs scope buttons, `schedulePreview()`

**Effect on color cards (`_ColorSolverRow`):**  
Shows per-color solver dropdown only when: `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo === false` AND `perColorAlgoScope !== "role"`

**Effect on color cards (`_ColorAlgoRow`):**  
Shows per-color scale algorithm only when: `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is false

**Effect on role cards (`_RoleAlgoRow`):**  
Shows per-role solver algorithm only when: `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope === "role"`

### Scale Length

`setting-scaleLength` input → read on Done → `appState.scaleLength` (integer, clamped 1–100)

### Scale Algorithm (Global)

`setting-scaleAlgorithm` select → read on Done → `appState.scaleAlgorithm`  
Options: Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear

*(Step Labels section moved to bottom of Token Settings — see "Scale Step Labels" below)*

---

## 5. Settings — Roles Tab (Variations)

### Per-Role Controls

Toggle: `perRoleControls`  
`toggleBoolSetting("perRoleControls")` → re-renders color groups and roles, syncs toggles  
Effect: label on global Base Selection / Spread Unit changes to "Default ..." to indicate it's a fallback.

### Allow Role Variations

Toggle: `allowRoleVariations`  
`toggleBoolSetting("allowRoleVariations")` → re-renders color groups and roles  
Effect: when off, the Global/Role scope badge on each role card is disabled (click has no effect).

### Shared Variations List

Rendered by `renderSettingsVariations()`. Each variation has:

- Name input → `updateSharedVariation(idx, "name", value)` → `setVariation()`, `renderRoles()`, `schedulePreview()`
- Shorthand input → `updateSharedVariation(idx, "shorthand", value)`
- ▲/▼ buttons → `moveSharedVariation(idx, dir)` → swaps array positions, `ensureVariations()`, re-renders
- Delete button (disabled if only 1 variation) → `removeSharedVariation(idx)` → splices array, `ensureVariations()`
- `+ Add Variation` button → `addSharedVariation()` → pushes new `{_id, name, shorthand}`, `ensureVariations()`

`ensureVariations()` runs after every variation mutation: ensures all roles have `variationTargets` arrays matching the current variation count.

---

## 6. Settings — Figma Tab (Output)

### Map Roles with Palettes (embed directly inverse)

Toggle: inverse of `embedDirectly`  
`toggleMapRolesWithPalettes()` → `appState.embedDirectly = !appState.embedDirectly`, button reflects `!embedDirectly`  
`schedulePreview()`

**Conditional visibility:** entire row (`settings-map-roles-row`) is hidden when `pluginMode === "adaptiveEngine"` — in adaptive mode there is no tonal collection to reference.

**Figma output effect:** when `embedDirectly` is true, contextual token variables contain raw hex values instead of Figma variable aliases.

### Include Tonal Collection

Toggle: `includeTonalCollection`  
`toggleBoolSetting("includeTonalCollection")` → `syncOutputToggles()`, `schedulePreview()`

**Conditional visibility:**  
- Entire `settings-palettes-collection-group` (toggle + name input) is hidden when `pluginMode === "adaptiveEngine"` — not applicable in adaptive mode.  
- `settings-tonal-collection-row` (name input only) is additionally hidden when `includeTonalCollection` is false.

**Figma output effect:** when false, the `_scale` ramp collection is not written at all. Contextual tokens fall back to hex values (same as `embedDirectly`).

### Tonal Scale Collection Name

`setting-tonalScaleCollectionName` input → read on Done → `appState.tonalScaleCollectionName` (default `"_scale"`)  
Visible only when `includeTonalCollection` is true AND `pluginMode !== "adaptiveEngine"`.

### Token Collection Name

`setting-tokenCollectionName` input → read on Done → `appState.tokenCollectionName` (default `"contextual"`)

### Shorthand Toggles

- `useShorthandColors` → color names in variable paths use `shorthand` instead of `name`
- `useShorthandRoles` → role names in variable paths use `shorthand`
- `useShorthandVariations` → variation names in variable paths use `shorthand`
- `useShorthandSteps` → scale step labels in variable paths use `shorthand` instead of `name`

All four: `toggleBoolSetting(key)` → `syncOutputToggles()`, `schedulePreview()`

### Token Name Format (Pills)

Rendered by `renderTokenOrderPills()`. Three coloured draggable pills: Color, Role, Variation.

**Drag-to-reorder:**

- `dragstart` → records source index, dims pill opacity to 0.4
- `dragover` target → highlights pill with white glow (`0 0 0 2px #fff8`)
- `dragleave` → restores shadow
- `drop` → `setTokenNameOrder(newOrder)` → `appState.tokenNameOrder = order`, also sets `appState.variableStructure` (`"role"` if order starts with role, else `"color"`), `renderTokenOrderPills()`, `_syncNameFormatPreview()`, `schedulePreview()`
- `dragend` → clears source index, restores opacity

**Name Format Preview** (`name-format-preview`):  
Shows a live example: `Color/Role/Variation` using the first color, first role, third variation as samples. Each segment is coloured to match its pill. Respects shorthand toggles.

### Include Global Colors

Toggle: `includeGlobalColors`  
`toggleBoolSetting("includeGlobalColors")` → shows/hides `constants-options` sub-section  
Sub-section contains: Global Collection Name input, Alpha Tints toggle, Alpha Values input.

### Global Colors Collection Name

`setting-globalColorsCollectionName` → read on Done → `appState.globalColorsCollectionName` (default `"_constants"`)

### Include Alpha Tints

Toggle: `includeAlphaTints`  
`toggleBoolSetting("includeAlphaTints")` → shows/hides `opacity-values-row`  
Only has Figma output effect when `includeGlobalColors` is also true.

### Alpha Values (CSV)

`setting-alphaValues` → read on Done → `appState.alphaValues` (e.g. `"5, 10, 25, 50, 75, 90"`)  
Parsed as integers 0–100. Values outside range are clamped.

### Include Descriptions

Toggle: `includeDescriptions`  
`toggleBoolSetting("includeDescriptions")` → re-renders color groups and roles (shows/hides description inputs), `schedulePreview()`  
**Figma output effect:** when true, contrast metadata is written into Figma variable descriptions.

### Scale Step Labels

Rendered by `renderSettingsStepLabels()` into `#settings-step-labels-list`. Each entry is `{_id, name, shorthand}` in `appState.scaleStepNames` (array).

**Card is hidden** when `pluginMode === "adaptiveEngine"` (handled by `_syncModeControls` on `#settings-step-labels-section`).

- Name input → `updateStepLabelRow(idx, "name", value)` → `updateStepLabel()`, `schedulePreview()`
- Shorthand input → `updateStepLabelRow(idx, "shorthand", value)`
- ▲/▼ buttons → `moveStepLabelRow(idx, dir)` → swaps array positions, re-renders
- Delete button → `removeStepLabelRow(idx)` → splices array
- `+ Add` button → `addStepLabelRow()` → pushes `{_id, name:"N00", shorthand:"N00"}`, re-renders

**Data shape:** `appState.scaleStepNames` is `Array<{_id, name, shorthand}>`. Legacy CSV strings are migrated to this format on `loadConfig()`.

**Engine use:** `_parseStepNames()` in config.js extracts `.name` values to produce the step name array. `_parseStepShorthands()` builds a `{name → shorthand}` map, passed to figmaVars as `config.scaleStepShorthands`.

**Token naming:** when `useShorthandSteps` is true, `figmaVars.js` replaces each step label in Figma variable paths with its shorthand (e.g. `brand/100` → `brand/1` if shorthand is `"1"`).

**If empty:** steps are numbered `1 … N` automatically by the engine.

---

## 7. Colors (Sidebar Tab)

### Add Color

`+ Add Color` button → `addGroup()` → picks a random unused preset from 50-color list (avoids name + shorthand collisions); falls back to `Color N` / `cN`. Unshifts to front of `appState.colors`, `renderColorGroups()`, `schedulePreview()`

### Color Card — Main Row

Each card always shows:

- **▲ / ▼ buttons** → `moveGroup(idx, dir)` → splices and re-inserts in `appState.colors`, `renderColorGroups()` (no preview, name order doesn't change values)
- **⠿ drag handle** → `bindDragDrop` → on drop: splices and re-inserts, `renderColorGroups()`, `schedulePreview()`
- **Color Name input** → `updateGroup(idx, "name", value)` → `setColor()`, `schedulePreview()`
- **Shorthand input** → `updateGroup(idx, "shorthand", value)` → `setColor()`, `schedulePreview()`
- **Color picker** (native `<input type="color">`) → `updateGroup(idx, "value", value, el)` → `setColor()` (sanitizes hex), syncs sibling hex text input, `schedulePreview()`
- **Hex text input** → same as picker; sanitizes on input, syncs picker
- **Delete button** → `removeGroup(idx)` → `appState.colors.splice(idx, 1)`, `renderColorGroups()`, `schedulePreview()`

### Color Card — Solver Row

**Condition:** `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo === false` AND `perColorAlgoScope !== "role"`  
Shows a **Color Solver** dropdown: Balanced / Vivid / Muted / Hue Locked / Max Chroma  
→ `updateGroup(idx, "solverMode", value)`, `schedulePreview()`

### Color Card — Scale Algorithm Row

**Condition:** `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is false  
Shows a **Scale Algorithm** dropdown per color: Natural / Uniform / Expressive / Symmetric / OKLCH / Material / Linear  
→ `updateGroup(idx, "scaleAlgorithm", value)`, `schedulePreview()`

### Color Card — Description Row

**Condition:** `includeDescriptions` is true  
Shows a **Description** text input → `updateGroup(idx, "description", value)`, `schedulePreview()`

---

## 8. Roles (Sidebar Tab)

### Add Role

`+ Add Color Role` → `addRole()` → picks next unused preset from 20-role list; falls back to `Role N` / `rN`. Unshifts to front. New role defaults: `spread: 2`, `minContrast: 4.5`, `baseIndex: mid`, `darkBaseIndex: mid`, `variationOverride: false`, `roleVariations: []`, `mappingMode: "auto"`. `renderRoles()`, `schedulePreview()`

### Role Card — Name Row

Always shown:

- **▲ / ▼ buttons** → `moveRole(idx, dir)` → `renderRoles()`
- **⠿ drag handle** → `bindDragDrop` → on drop: `renderRoles()`, `schedulePreview()`
- **Role Name input** → `updateRole(idx, "name", value)` → `setRole()`, `schedulePreview()` (name/shorthand changes only preview, no re-render — prevents focus loss)
- **Shorthand input** → same
- **Delete button** → `removeRole(idx)` → `appState.roles.splice(idx, 1)`, `renderRoles()`, `schedulePreview()`

### Role Card — Variations Section (Collapsible)

**Header** click → toggles `ui.open` in `_roleCardUIState[role._id]`, `renderRoles()`  
Shows: "Variations (N)" + a **Global / Role** scope badge

**Scope badge:**

- Reads `role.variationOverride`: false = "Global" (grey), true = "Role" (blue)
- Click → `toggleRoleVariationOverride(idx)` if `allowRoleVariations` is enabled
- When `allowRoleVariations` is false → badge is visually disabled (opacity 0.4, no click)

**`toggleRoleVariationOverride(idx)`:**

- If turning ON: if `role.roleVariations` is empty, copies global variations (new `_id` on each). Sets `role.variationOverride = true`
- If turning OFF: sets `role.variationManual = false`, `role.variationOverride = false`
- `renderRoles()`, `schedulePreview()`

**Variation table when open:**

_Global mode_ (`variationOverride` false): columns = `#`, `Variation`, `Min Contrast`

- `#` — row number
- `Variation` — read-only label (`name (shorthand)`)
- `Min Contrast` — number input → `updateRoleVariationTarget(roleIdx, vi, value)` → `setRole("variationTarget:N", value)` (clamped 1–21), `schedulePreview()`

_Role-override mode_ (`variationOverride` true): columns = `#`, `Name`, `Short`, `Min Contrast`, `−`

- `Name` input → `updateRoleVariation(idx, vi, "name", value)` → `setRoleVariation()`, `schedulePreview()`
- `Shorthand` input → same for `"shorthand"`
- `Min Contrast` → same as global mode
- `−` delete button (disabled if only 1) → `removeRoleVariation(idx, vi)` → splices `role.roleVariations`, `ensureVariations()`, `renderRoles()`, `schedulePreview()`
- `+ Add variation` row → `addRoleVariation(idx)` → pushes new variation, `ensureVariations()`, `renderRoles()`, `schedulePreview()`

### Role Card — Solver Algorithm Row

**Condition:** `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope === "role"`  
Shows a **Solver Algorithm** dropdown per role → `setRole(idx, "scaleAlgorithm", value)`

---

## 9. Run / Sync Flow

### Initiate

`btn-run` → `handleSubmit("all")`

**Validation:** `validateState()` checks:

- At least one color
- At least one role
- No duplicate color names
- No duplicate color shorthands
- No duplicate role names
- No duplicate role shorthands

If validation fails → `showOverlay("error-overlay")` with message. Stops.

If valid → posts `{ type: "check-collections", scope, collections: [...names] }` to Figma backend. Loading overlay shown.

### Run Dialog

On `collection-check-result` message:

- Stores `lastCollectionCheckResult` (existing collection names), `lastRenameData`
- `setRunScope(pendingScope)` → populates run dialog with scope options and rename summary
- `showOverlay("run-dialog-overlay")`

**Scope buttons:** All / Groups Only / Roles Only → `setRunScope()` → updates `pendingScope`, refreshes dialog

### Confirm

`btn-run-confirm` → `hideOverlay("run-dialog-overlay")` → `proceedWithSync()`  
Posts `{ type: "run-creator", state: appState, scope: pendingScope, savedState: getSavedState() }` to Figma backend (50 ms delay to allow loading overlay to render).

### Finish

On `finish` message:

- `setSavedState(appState)` — new baseline for rename detection
- `markClean()` — resets dirty hash
- `hideOverlay("loading-overlay")`, `showOverlay("success-overlay")`
- Shows tally: Created / Updated / Renamed / Failed counts
- `showSystemBanners()` — scans all theme token outputs for adjusted values (contrast fallbacks), posts warnings

---

## 10. Preview Screen

### Opening

Preview tab button OR `Alt+3/4/N` keyboard shortcut → `renderPreviewTabs()` + `renderPreviewPanel()` → hides main nav, shows preview screen

### renderPreviewTabs

- Removes old dynamic theme tabs
- Hides "Tonal Scale" tab when `pluginMode === "adaptiveEngine"`
- Creates one tab button per `appState.themes` entry → each targets `preview-theme-panel-{i}`

### renderPreviewPanel

Sections:

1. **Tonal Scales** — one color spectrum strip per `appState.colors` entry. Hover shows hex + weight + contrast ratios. Click copies hex. Inline color picker (click swatch) calls `updateGroup()` directly.
2. **Alpha Tints** — shown only when `includeAlphaTints` AND `includeGlobalColors` are both true. One row per color, one swatch per alpha value. Click copies `rgba()` string.
3. **Theme panels** — one panel per theme. Each panel shows token swatches grouped by color → role → variation. Hover shows contrast ratio; click copies hex; `Alt+click` copies token name.

### Live preview

`schedulePreview()` is a debounced (500 ms) function that re-runs `variableMaker(translateConfig(appState))` and `renderPreviewPanel()`. Only fires when preview screen is visible.

### Tab switching inside Preview

Click any preview tab button → deactivates all tabs + panels, activates clicked tab + its target panel.  
When a theme is removed via settings while its panel is the active tab → falls back to first visible tab.

### Closing

`preview-back` button or `Escape` key → hides preview screen, restores main nav, restores active sidebar tab button state

---

## 11. Export (More Sheet)

`btn-more` → `showSheet("more-sheet")` → slides up bottom sheet, shows overlay

Available actions (all call `hideSheets()` after):

- **Save Config (JSON)** → `exportConfig()` → `{ type: "export-config" }` to backend → `processed-data-response` → downloads `.json`
- **Export CSS** → `exportToCSS()` → downloads `.css`
- **Export CSV** → `exportToCSV()` → downloads `.csv`
- **Export SCSS** → `exportToSCSS()` → downloads `.scss`
- **Reset to Defaults** → `confirm()` dialog → if confirmed: resets `appState` to `demoConfig`, clears `savedState`, re-renders everything

Shortcut buttons on main view (`btn-export-css/csv/scss/json`) call the same export functions directly.

**Import:** `btn-import` → triggers `file-input` click (hidden `<input type="file" accept=".json">`)  
Or drag a `.json` file anywhere onto the plugin window → `drop-overlay` appears → on drop: `handleImportJSON()`

`handleImportJSON` parses JSON, calls `loadState()` (merges, re-ids, re-variations), `setSavedState(null)`, `renderColorGroups()`, `renderRoles()`, `syncInputsFromState()`, `schedulePreview()`

---

## 12. Overlays & Sheets

| ID                   | Shown by                          | Hidden by                                               |
| -------------------- | --------------------------------- | ------------------------------------------------------- |
| `loading-overlay`    | `proceedWithSync()`               | `finish` or `error` message                             |
| `success-overlay`    | `finish` message                  | `hideOverlay()` click on overlay                        |
| `error-overlay`      | validation fail, `error` message  | `hideOverlay()` click                                   |
| `run-dialog-overlay` | `collection-check-result` message | confirm or cancel button                                |
| `drop-overlay`       | file drag enters window           | drag leave or drop                                      |
| `more-sheet`         | `btn-more`                        | `overlay` click, `close-more` button, any export action |

---

## 13. Theme & Scale Preferences (Plugin Tab)

### UI Scale

`setting-ui-scale` select → `updateUiPref("scale", value)` → `uiPrefs.scale = value`, `applyUiPrefs()`, posts `save-ui-prefs-meta` to backend  
Options: 0.7 / 0.8 / 0.9 / 1.0 / 1.1 / 1.25 / 1.5  
Applied as `document.body.style.zoom` and CSS var `--ui-scale`.

### UI Theme

`setting-ui-theme` select → `updateUiPref("theme", value)` → same flow as scale  
Options: `"figma"` (follows Figma's own theme), `"dark"`, `"light"`  
Applied as `data-ui-theme` attribute on `<body>`.

**Auto-follow Figma theme:** A `MutationObserver` watches `html` and `body` class changes. When `uiPrefs.theme === "figma"`, any Figma theme class change re-calls `applyUiPrefs()`. Also listens to OS `prefers-color-scheme` changes as a fallback.

---

## 14. Resize

`resize-handle` mousedown → records `resizeOriginX/Y` and `resizeStartW/H` → `mousemove` posts `{ type: "resize", width, height }` to Figma backend on every move.  
Clamped: width 400–1400, height 560–1400.  
`mouseup` removes listeners, clears `isResizing`.

---

## 15. Tooltips

Any element with `data-tooltip` attribute → global `mouseenter` listener (capture phase) → shows `#tooltip` element near the target, clamped to viewport.  
`mouseleave` → hides tooltip.

---

## 16. Field Visibility Summary Table

| Field / Control                                     | Visible when                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tonal Scale section in Palettes settings            | `pluginMode !== "adaptiveEngine"`                                                                 |
| Scale Step Labels section                           | `pluginMode !== "adaptiveEngine"`                                                                 |
| Palettes collection toggle + name group             | `pluginMode !== "adaptiveEngine"`                                                                 |
| Map Roles with Palettes row                         | `pluginMode !== "adaptiveEngine"`                                                                 |
| Embed Directly row                                  | `pluginMode !== "adaptiveEngine"`                                                                 |
| Tonal Collection name input                         | `pluginMode !== "adaptiveEngine"` AND `includeTonalCollection` is true                            |
| By Index base selection option                      | `pluginMode !== "adaptiveEngine"`                                                                 |
| Spread Unit row                                     | `pluginMode !== "adaptiveEngine"` AND `baseSelection !== "Manual"`                                |
| Global Algo select row                              | `useGlobalAlgo` is true                                                                           |
| Algo Scope (Color/Role) row                         | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false                                    |
| Color card Solver dropdown                          | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope !== "role"` |
| Color card Scale Algorithm dropdown                 | `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is false                                    |
| Role card Solver Algorithm dropdown                 | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope === "role"` |
| Color card Description input                        | `includeDescriptions` is true                                                                     |
| Constants sub-options (alpha tints etc.)            | `includeGlobalColors` is true                                                                     |
| Alpha Values input row                              | `includeAlphaTints` is true                                                                       |
| Scope badge clickable on role card                  | `allowRoleVariations` is true                                                                     |
| Preview: Tonal Scale tab                            | `pluginMode !== "adaptiveEngine"`                                                                 |
| Preview: Alpha Tints section                        | `includeAlphaTints` AND `includeGlobalColors` both true                                           |
| Role-override variation columns (Name/Short/Delete) | `role.variationOverride` is true                                                                  |
