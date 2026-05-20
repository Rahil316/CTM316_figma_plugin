---
name: Todo list
description: Prioritised actionable tasks for the CTM316 plugin — updated 2026-05-20
type: project
---
Last updated: 2026-05-20

---

## 🔴 High priority — blocks other work or visible to user

- [ ] **Wire `includeTonalCollection` to engine**
  Toggle exists in UI and appState but `translateConfig()` never passes it. Intended purpose: suppress the `_scale` ramp collection from Figma output. Add to `translateConfig` and gate the ramp-write in `figmaVars.js`.

- [ ] **Decide fate of `addSeedValues`**
  Toggle in Figma tab settings. In appState and snapshot but not in `translateConfig`. Either remove the toggle + state key, or define and implement the feature. Currently a dead UI control.

- [ ] **Role variation rename detection**
  `buildVariableRenameMap` handles shared variations. Per-role variation renames silently create new variables instead of renaming. Fix or document the limitation explicitly.

- [ ] **Alpha tints in preview panel**
  `includeAlphaTints` flag works in Figma output. Preview panel doesn't show alpha tokens visually. Add a section to `renderPreviewPanel`.

---

## 🟡 Medium priority — polish and correctness

- [ ] **Role card — full end-to-end test in both modes**
  Manual test matrix: Tonal Scale × Adaptive Engine × each Find Base By × each Spread Unit × Auto/Manual mapping. Verify Figma variable output is correct in all 12 combinations.

- [ ] **Inline validation feedback**
  Duplicate names and invalid hex currently show in full error overlay. Add inline red border / helper text directly on the offending input field.

- [ ] **`output.js` preview rendering — migrate to `el()`**
  Preview panel HTML generation still uses some innerHTML string concatenation. Migrate to `el()`.

- [ ] **Settings — Role Labels CSV field**
  Add a "Role Labels (CSV)" text input to the Roles tab. On change: parse comma-separated names, write each into `appState.variations[i].name`, re-render the variation list.

- [ ] **Settings — Project Name actually saving**
  `appState.name` is read in `updateSettingsFromInputs()`. Verify it's used in: export filenames and success messages.

- [ ] **Plan `useGlobalAlgo` / `perColorAlgoScope`**
  These are in appState and settings snapshot. `config.js` stopped passing them to the engine. Decide: implement per-color algorithm scoping in the engine, or remove the state keys and UI toggles entirely.

---

## 🟢 Low priority — new features, future work

- [ ] **Saved States (version history)**
  Store snapshot array in `figma.root.setPluginData("ctm316_snapshots")`.
  UI: list in Project tab with timestamp, name, View / Restore / Delete buttons.

- [ ] **Pro mode definition**
  Before any implementation: define which features are gated, what upgrade UX looks like, and how flags are stored.
  Current branch: `ProModeBeta_updated`.

- [ ] **Plugin tab — Language, Beta Features, About CTM**
  Placeholder UI exists. Implement when content is defined. Language needs i18n infrastructure.

- [ ] **Design Lab**
  Button in more-sheet via `temp.js` shows an alert. Replace with actual overlay when implemented.

- [ ] **Offline / inlined font support**
  Google Fonts loaded at runtime (`fonts.googleapis.com`). Low priority unless offline use case arises.

---

## ✅ Recently completed

- [x] Full file restructure: `color/`, `ui/` folders, dissolved `utils.js`
- [x] Settings migrated from bottom sheet to full-screen 5-tab panel
- [x] `inputsUI.btn()` — universal button primitive with 5 variants + 3 sizes
- [x] `RoleGroupCard` fixed — was returning single element, `.forEach` expected array
- [x] `DEFAULT_VARIATION_TARGETS` duplicate `const` removed from `config.js`
- [x] `setRole()` and `setRoleVariation()` — bounds checks added
- [x] `syncInputsFromState()` — now calls `syncUiSettingsInputs()` (Plugin tab values)
- [x] `uiPrefs` load — validated against allowed scales/themes before applying
- [x] Role card control logic spec — permanently documented in README
- [x] Dead code cleanup (2026-05-20): removed `_demoConfigStr`, removed `variationTargetL/D` dead mutation branches in `setRole()`, fixed `run-creater` typo → `run-creator`, fixed Burgundy shorthand `"bg"` → `"bu"` collision, removed stale `"3."` numbering from config.js header, stopped forwarding `useGlobalAlgo`/`perColorAlgoScope` as live config values (now commented)
- [x] `manifest.json` — only Google Fonts in `allowedDomains` (cdn.tailwindcss.com was never present; Tailwind is inlined at build)
- [x] `scaleStepNames` verified wired end-to-end: config.js parses → clrEngine.js line 346 uses for variable naming
- [x] `alphaValues` verified wired end-to-end: config.js parses → figmaVars.js line 214 uses for alpha tint generation
