---
name: Feature registry
description: Full inventory of plugin features — implemented, needs work, and not yet started
type: project
---
Last updated: 2026-05-20

---

## ✅ Implemented — fully working

### Core engine
- Tonal scale generation — 7 algorithms (Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear)
- Adaptive Engine mode — solves role colors directly to target contrast ratios, no tonal scale intermediate
- WCAG contrast calculation (APCA-adjacent, hex↔RGB↔HSL↔OKLCH↔HCT)
- Multi-theme output — light and dark modes with configurable background colors
- Semantic role mapping — Text, Fill, Background, Border etc. mapped to tonal steps by contrast or index
- Variation levels — shared variation system with alias + shorthand
- `scaleStepNames` CSV — wired end-to-end: config.js parses, clrEngine.js uses for variable naming ✅ verified
- `alphaValues` CSV — wired end-to-end: config.js parses, figmaVars.js reads for alpha tint generation ✅ verified

### Figma variable output
- Palette collection (`_scale`) — full tonal ramp per color as Figma variables
- Token collection — contextual role variables referencing palette steps
- Embed directly mode — writes hex values instead of Figma aliases
- Global colors collection — raw brand hex values, no theme processing
- Alpha tint variables under `colorName/Opacities/`
- Variable descriptions — contrast metadata written into Figma variable descriptions
- Stable `_id` rename detection — reorder/rename colors or roles without duplicate variable creation
- savedState snapshot — detects renames correctly within a session

### Exports
- CSS custom properties export
- SCSS variable maps + mixin export
- CSV audit sheet
- JSON config export (full reimportable state)
- JSON import — restores full plugin state from exported file

### UI
- `el()` DOM factory — all UI built without innerHTML
- `inputsUI` primitives: `input`, `colorInput`, `toggle`, `row`, `sectionLabel`, `iconButton`, `actionButton`, `caption`, `btn()` (all variants)
- `Components` card system: `ColorGroupCard`, `RoleGroupCard`
- Drag-to-reorder on color and role cards
- `debounce` + `withPreservedFocus` — no focus loss on re-render
- In-place color sync on hex/picker input — no re-render on color value change
- BannerManager — toast + expandable detail banners (defined in `output.js`)
- ToastManager — lightweight stacking toast system (defined in `output.js`)
- Preview panel — live token preview before syncing to Figma
- Run dialog — shows existing collections, rename summary before sync
- Full-screen settings panel with 5 tabs (Project, Palettes, Roles, Figma, Plugin)
- Settings Cancel/Done — Cancel snapshots and reverts, Done applies
- UI Scale + Theme preference (persisted in Figma clientStorage)
- Figma theme detection (MutationObserver on html/body + matchMedia)
- Config persistence in `figma.root.setPluginData("ctm316_state")`
- One-time migration from old STRING variable storage to setPluginData

### Role card controls
- Role name + shorthand (always visible)
- Find base by: Min Contrast or By Index
- Spread unit: Steps or Contrast delta
- Mapping mode: Auto (computed read-only table) or Manual (fully editable table)
- Per-role variation override — each role can define its own variation set independently
- Per-role controls toggle — global default or per-card base/spread controls
- Collapsed header summary — shows active settings at a glance
- `solverMode` per color — "natural" | "saturated" | "luminance" | "hue-locked" | "chroma-maximized"
- `darkBaseIndex` per role — separate base index for dark mode (By Index mode only)

### Build
- `npm run build` — concatenates JS, strips comments, inlines CSS, produces `dist/scripts.js` + `dist/ui.html`
- Tailwind CSS inlined at build — no CDN dependency at runtime
- `/* filename */` section markers in built output for debugging

---

## 🔧 Implemented but needs verification / polish

- **Alpha tints in preview** — `includeAlphaTints` flag works in engine; preview panel does not show alpha tokens visually
- **Role variation override end-to-end** — per-role custom variations exist in state and UI; full manual test across both plugin modes not completed
- **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations only; per-role variation renames are silently skipped (may create duplicates on re-run)
- **`output.js` preview rendering** — some innerHTML string concatenation remains; inconsistent with el()-based codebase
- **Input validation feedback** — errors shown in full overlay; no inline feedback per field

---

## ⚠️ UI state with no engine effect (wired in state + UI but not passed to engine)

These toggles appear in settings and are persisted in appState, but `translateConfig()` in `config.js` does **not** pass them to the engine. They currently do nothing to the Figma output.

- **`addSeedValues`** — toggle in Figma tab (`toggle-addSeedValues`), persisted in `appState`, in settings snapshot. Not in `translateConfig`. Purpose: unknown/unimplemented.
- **`includeTonalCollection`** — toggle in Figma tab (`toggle-includeTonalCollection`), persisted in `appState`. Not in `translateConfig`. Intended purpose: gate whether the `_scale` ramp collection is written at all.
- **`useGlobalAlgo` / `perColorAlgoScope`** — in `appState` and settings snapshot; `config.js` used to forward them but now only leaves a comment. `clrEngine.js` does not read either. Reserved for future per-color algorithm scoping.

---

## 🚧 Designed but not yet implemented (seen in Settings PDF mockup)

- **Project Name field** — `appState.name` exists; verify it drives export filenames and success messages
- **Saved States** — versioned snapshots with timestamp, View / Restore / Delete. Placeholder in Project tab, non-functional
- **Role Labels CSV** — bulk-rename variations globally via comma-separated string
- **Language selector** — UI placeholder only, no i18n infrastructure
- **Beta Features section** — enrollment toggle + placeholder feature flags
- **About CTM section** — feedback link + learn more link

---

## ❌ Not started — future roadmap

- **Pro mode** — concept exists (`ProModeBeta` branch); feature set undefined, no implementation
- **Saved States backend** — requires new `figma.root.setPluginData` key + UI
- **Undo/redo** — noted gap, no plans
- **Inline validation feedback** — per-field error display instead of full overlay
- **Token preview for alpha tints** — preview panel alpha section
- **Design Lab** — button exists in more-sheet via `temp.js`, shows alert placeholder only
- **`includeTonalCollection` wiring** — gate that suppresses `_scale` ramp collection write; requires `translateConfig` → `figmaVars.js` plumbing
