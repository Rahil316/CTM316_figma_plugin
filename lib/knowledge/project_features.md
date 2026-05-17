---
name: Feature registry
description: Full inventory of plugin features — implemented, needs work, and not yet started
type: project
originSessionId: 8d8bcbc1-572d-4c9f-b8bd-4a9ae7f56916
---
Last updated: 2026-05-17

---

## ✅ Implemented — fully working

### Core engine
- Tonal scale generation — 7 algorithms (Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear)
- Adaptive Engine mode — solves role colors directly to target contrast ratios, no tonal scale intermediate
- WCAG contrast calculation (APCA-adjacent, hex↔RGB↔HSL↔OKLCH↔HCT)
- Multi-theme output — light and dark modes with configurable background colors
- Semantic role mapping — Text, Fill, Background, Border etc. mapped to tonal steps by contrast or index
- Variation levels — shared variation system (Lighter/Light/Base/Dark/Darker) with alias + shorthand

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
- `inputsUI` primitives: `input`, `colorInput`, `toggle`, `row`, `sectionLabel`, `iconButton`, `actionButton`, `caption`, `btn()` (new — all variants)
- `Components` card system: `ColorGroupCard`, `RoleGroupCard`
- Drag-to-reorder on color and role cards
- `debounce` + `withPreservedFocus` — no focus loss on re-render
- In-place color sync on hex/picker input — no re-render on color value change
- BannerManager — toast + expandable detail banners
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
- Find base by: Min Contrast or By Index (separate light/dark inputs for index mode)
- Spread unit: Steps or Contrast delta
- Mapping mode: Auto (computed read-only table) or Manual (fully editable table)
- Per-role variation override — each role can define its own variation set independently
- Per-role controls toggle — global default or per-card base/spread controls
- Collapsed header summary — shows active settings at a glance

### Build
- `npm run build` — concatenates JS, strips comments, inlines CSS, produces `dist/scripts.js` + `dist/ui.html`
- Tailwind CSS inlined at build — no CDN dependency at runtime
- `/* filename */` section markers in built output for debugging

---

## 🔧 Implemented but needs verification / polish

- **Alpha tints in preview** — `includeAlphaTints` flag exists and variables are written; preview panel does not visually distinguish alpha tokens
- **Role variation override end-to-end** — per-role custom variations exist in state and render in UI; full manual test across both plugin modes (tonal + adaptive) not completed
- **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations; per-role variation renames are skipped (may create duplicates)
- **`output.js` preview rendering** — uses some innerHTML for preview panel rows; inconsistent with rest of el()-based codebase
- **manifest.json network cleanup** — `cdn.tailwindcss.com` still in `allowedDomains` even though Tailwind is now inlined at build
- **Input validation feedback** — errors show in full error overlay; no inline feedback near the offending field

---

## 🚧 Designed but not yet implemented (seen in Settings PDF mockup)

- **Project Name field** — `appState.name` exists in state but no UI connection currently (field is in settings HTML but `updateSettingsFromInputs` reads it — verify it actually saves)
- **Saved States** — versioned snapshots with timestamp, View / Restore / Delete actions. Placeholder in Project tab, non-functional
- **Step Labels CSV** — `scaleStepNames` exists in state and is wired; UI field exists in Palettes tab. Verify engine uses it correctly for variable naming
- **Role Labels CSV** — bulk-rename variations globally via comma-separated string (separate from per-variation inline editing in Roles tab)
- **Global Variables collection name** — `globalColorsCollectionName` in state; field exists in Figma tab settings
- **Alpha Variations CSV** — `alphaValues` in state; field in Figma tab. Verify the engine reads it correctly for alpha tint generation
- **Language selector** — UI placeholder only, no i18n infrastructure
- **Beta Features section** — enrollment toggle + 3 placeholder feature flags
- **About CTM section** — feedback link + learn more link

---

## ❌ Not started — future roadmap

- **Pro mode** — feature gating concept exists (`ProModeBeta` branch); exact feature set not defined. No implementation
- **Saved States backend** — requires new `figma.root.setPluginData` key for snapshot array + UI to list/restore/delete
- **Undo/redo** — noted gap, no plans
- **Offline font support** — Google Fonts loaded at runtime; could be inlined
- **Inline validation feedback** — per-field error display (duplicate name, invalid hex) instead of full overlay
- **Token preview for alpha tints** — preview panel alpha section
- **Dark mode color solving improvements** — adaptive engine may need separate contrast targets per theme
