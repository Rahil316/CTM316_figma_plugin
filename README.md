# CTM316 — Color Token Machine

A Figma plugin that generates multi-theme design token systems from a set of brand colors and semantic role definitions. Produces Figma variable collections (tonal scales + contextual tokens), plus CSS, SCSS, CSV, and JSON exports.

---

## What it does

- **Palette mode** — generates a full tonal scale per color (configurable step count, 6 scale algorithms), then maps semantic roles (Text, Fill, Background, Border…) onto those steps by contrast or index
- **Adaptive Engine mode** — solves role colors directly to target contrast ratios without an intermediate tonal scale
- **Multi-theme** — light and dark modes, configurable background colors
- **Rename-safe sync** — stable `_id` tracking means reordering or renaming colors/roles updates existing Figma variables in place instead of deleting and recreating them
- **Exports** — Figma variables, CSS custom properties, SCSS (maps + mixin), CSV audit sheet, JSON token file

---

## Architecture

### Two threads (Figma plugin model)

| File              | Thread     | Purpose                                       |
| ----------------- | ---------- | --------------------------------------------- |
| `dist/scripts.js` | Figma main | Variable CRUD, color math, config persistence |
| `dist/ui.html`    | UI iframe  | Plugin panel — all user interaction           |

Both are generated from `src/` by `npm run build`. Never edit `dist/` directly.

### Source layout

```
src/
  ui.html                     — plugin panel markup + script tags (inlined at build)
  input.css / output.css      — Tailwind source / minified output
  code/
    utils.js                  — shared utilities (hex, contrast, sanitize, defaults)
    color/
      clrSpaces.js            — color space conversions (sRGB, OKLCH, HCT)
      clrSolver.js            — direct contrast solver or Adaptive Engine color solver
      clrGen.js               — tonal scale generator + variableMaker
    figma/
      config.js               — appState → engine config translator + rename detector
      figmaVars.js            — Figma variable API (CRUD, rename, sync)
      main.js                 — message router + plugin init
      docGen.js               — CSS / SCSS / CSV export formatters
    ui/
      state.js                — appState defaults, ensureIds, ensureVariations
      ui-components.js        — el() helper, inputsUI primitives, Components cards
      ui-actions.js           — CRUD handlers (add/remove/update color, role, variation)
      ui-settings.js          — settings sync, syncOutputToggles, renderSettingsVariations
      ui-io.js                — import/export, run dialog, system banners
      ui-preview.js           — live preview panel rendering
      uiGen.js                — top-level renderers, message handler, boot sequence
      bannerManager.js        — self-contained notification banner system
```

### UI component hierarchy

```
inputsUI          — base primitives (input, toggle, row, colorInput, iconButton, …)
  └─ Components   — card-level compositions (_ColorMainRow, _RoleSecondRow, …)
       └─ renderColorGroups / renderRoles   — list renderers (debounced, focus-preserving)
```

### Config persistence

- **Plugin config** (`appState`) → `figma.root.setPluginData("ctm316_state")` — stored in the document, travels with the Figma file, invisible to users
- **UI preferences** (window size, theme, scale) → `figma.clientStorage` — stored per-user

---

## Development

```bash
npm install
npm run build      # produces dist/scripts.js + dist/ui.html
npm run watch      # rebuilds on file change
```

Load in Figma Desktop → Plugins → Development → Import plugin from manifest → select `manifest.json`.

---

## Progress tracker

> Updated end of each session. Start here next time.

### Active branch: `ProModeBeta_temp`

---

### Done ✓

**UI architecture**

- [x] Modularised UI into focused files: `ui-actions`, `ui-settings`, `ui-io`, `ui-preview`, `uiGen`
- [x] `el()` helper + `inputsUI` primitive set: `input`, `colorInput`, `toggle`, `row`, `sectionLabel`, `iconButton`, `actionButton`, `caption`
- [x] `Components` card architecture: `ColorGroupCard` and `RoleGroupCard` composed from named sub-rows
- [x] All UI modules migrated from `innerHTML` string templates to `el()`-based DOM construction
- [x] `bindDragDrop()` helper — drag-to-reorder on both color and role cards
- [x] `debounce` + `withPreservedFocus` — glitch-free typing, no focus loss on re-render
- [x] In-place color sync on hex/picker input — no re-render, uses stable element IDs

**State & settings**

- [x] Stable `_id` identity on colors/roles — renames detected correctly across reorders
- [x] `syncOutputToggles` split into 5 focused helpers in `ui-settings.js`
- [x] `renderSettingsVariations` in `ui-settings.js`, uses `el()`
- [x] `DEFAULT_VARIATION_TARGETS` constant: unified in `utils.js` (UI thread), mirrored in `config.js` (Figma thread)
- [x] State validation before sync: requires ≥1 color and ≥1 role, clear error messages

**Persistence**

- [x] Config migrated from Figma STRING variable (`__ctm316_config__`) to `figma.root.setPluginData("ctm316_state")`
- [x] One-time migration on load: reads old variable → saves to new location → removes old variable
- [x] `savedState` snapshot updated on every successful sync (fixes rename detection within a session)

**Theme**

- [x] Figma theme detection: checks both `<html>` and `<body>` for `figma-dark`/`figma-light`, `matchMedia` as fallback
- [x] MutationObserver on both elements + `matchMedia` change listener
- [x] Dark theme default when no saved preference; dropdown reflects saved value correctly on load

**Banners & dialogs**

- [x] `BannerManager` extended with `detailNode` — passes DOM node instead of raw HTML string for expandable detail
- [x] `showSystemBanners` and `refreshRunDialog` use DOM nodes throughout
- [x] Success tally in finish handler uses `el()`, not `innerHTML`

**Build**

- [x] Build strips block + line comments from dist output
- [x] `/* filename */` markers added per section in both `scripts.js` and `ui.html`

**Code health**

- [x] Dead code removed: `hexToLum`, `slugify`, `_ColorStatsCalculationRow`, `confirm-sync-overlay`, `updateRoleVariationTargetInline`
- [x] `validateUniqueness` → `validateState` (also checks empty colors/roles)
- [x] Comment audit on `figma/*`: stale examples fixed, redundant comments removed

---

### Next up (priority order)

- [ ] **`ui-preview.js` — migrate to `el()`** — still uses `innerHTML` string templates; last remaining module not using the node-based pattern
- [ ] **`manifest.json` network cleanup** — `cdn.tailwindcss.com` is no longer fetched (Tailwind inlined at build); remove from `allowedDomains`
- [ ] **Pro mode feature definition** (`ProModeBeta` branch goal) — document exactly what "Pro mode" means before implementing; what features are gated, what the UX looks like
- [ ] **Role variation override — end-to-end test** — per-role custom variations exist in state but need a full manual test across both plugin modes
- [ ] **Alpha tints in preview** — `includeAlphaTints` flag exists; verify the preview panel reflects alpha token output correctly
- [ ] **Input validation feedback** — errors currently show in the full error overlay; consider inline feedback closer to the offending field for smaller errors (e.g. duplicate name)
- [ ] **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations but skips per-role variation overrides

---

### Known issues / watch list

- `ui-preview.js` uses `innerHTML` — safe (internal data only) but inconsistent with the rest of the UI
- `networkAccess.allowedDomains` in `manifest.json` includes `cdn.tailwindcss.com` — no longer fetched, should be removed
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) fetched at runtime — could be inlined at build if offline support ever matters
- No undo/redo — noted gap, no plans yet
