---
name: Todo list
description: Prioritised actionable tasks for the CTM316 plugin — updated 2026-05-17
type: project
originSessionId: 8d8bcbc1-572d-4c9f-b8bd-4a9ae7f56916
---
Last updated: 2026-05-17

---

## 🔴 High priority — blocks other work or visible to user

- [ ] **Verify `scaleStepNames` actually renames variables in Figma output**
  Field exists in UI and state. Confirm `config.js` / `clrEngine.js` uses it for variable naming, not just display.

- [ ] **Verify `alphaValues` CSV is read by engine for alpha tint generation**
  `appState.alphaValues` is persisted and shown in settings. Confirm `clrEngine.js` parses it correctly.

- [ ] **`manifest.json` — remove `cdn.tailwindcss.com` from `allowedDomains`**
  Tailwind is now inlined at build. CDN entry is dead weight and a potential security flag.

- [ ] **Role variation rename detection**
  `buildVariableRenameMap` in `figmaVars.js` handles shared variations. Per-role variation renames silently create new variables instead of renaming. Fix or document the limitation.

- [ ] **Alpha tints in preview panel**
  `includeAlphaTints` flag works in Figma output. Preview panel doesn't show alpha tokens visually. Add a section to `renderPreviewPanel` for alpha output.

---

## 🟡 Medium priority — polish and correctness

- [ ] **Role card — full end-to-end test in both modes**
  Manual test matrix: Tonal Scale × Adaptive Engine × each Find Base By × each Spread Unit × Auto/Manual mapping. Verify Figma variable output is correct in all 12 combinations.

- [ ] **Inline validation feedback**
  Duplicate names and invalid hex currently show in full error overlay. Add inline red border / helper text directly on the offending input field for smaller errors.

- [ ] **`output.js` preview rendering — migrate to `el()`**
  Preview panel HTML generation still uses some innerHTML string concatenation. Inconsistent with rest of codebase. Migrate to `el()`.

- [ ] **Settings — Role Labels CSV field**
  Add a "Role Labels (CSV)" text input to the Roles tab. On change: parse comma-separated names, write each into `appState.variations[i].name`, re-render the variation list.
  State key: operates on `appState.variations` array directly.

- [ ] **Settings — Project Name actually saving**
  `appState.name` is read in `updateSettingsFromInputs()`. Verify it's used in: export filenames, Figma collection names (if configured), and success messages.

---

## 🟢 Low priority — new features, future work

- [ ] **Saved States (version history)**
  Store snapshot array in `figma.root.setPluginData("ctm316_snapshots")`.
  UI: list in Project tab with timestamp, name, View / Restore / Delete buttons.
  Start with basic save-on-run and manual save button.

- [ ] **Pro mode definition**
  Before any implementation: define exactly which features are gated behind Pro mode, what the upgrade UX looks like, and how feature flags are stored.
  Current branch: `ProModeBeta_updated`.

- [ ] **Global Variables `_Global` collection**
  Seen in Settings PDF mockup. Purpose unclear — may be a "primitive tokens" layer separate from the existing Global Colors. Clarify with user before implementing.

- [ ] **Plugin tab — Language, Beta Features, About CTM**
  Placeholder UI exists in Plugin tab. Implement when content is defined.
  Language: no i18n infra exists yet.
  Beta Features: needs feature flag storage in clientStorage.

- [ ] **Offline / inlined font support**
  Google Fonts loaded at runtime (`fonts.googleapis.com`). Could be inlined at build for offline use. Low priority unless offline use case arises.

- [ ] **Undo / redo**
  No implementation planned. Document as a known gap.

---

## ✅ Recently completed (this session / last few sessions)

- [x] Full file restructure: `color/`, `ui/` folders, dissolved `utils.js`
- [x] Settings migrated from bottom sheet to full-screen 5-tab panel
- [x] `inputsUI.btn()` — universal button primitive with 5 variants + 3 sizes
- [x] `RoleGroupCard` fixed — was returning single element, `.forEach` expected array
- [x] `DEFAULT_VARIATION_TARGETS` duplicate `const` removed from `config.js`
- [x] Settings screen background fixed (`fixed` → `absolute`)
- [x] `setRole()` and `setRoleVariation()` — bounds checks added
- [x] `syncInputsFromState()` — now calls `syncUiSettingsInputs()` (Plugin tab values)
- [x] `uiPrefs` load — validated against allowed scales/themes before applying
- [x] Role card control logic spec — permanently documented in README
