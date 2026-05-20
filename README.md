# CTM316 — Color Token Machine

A Figma plugin that generates multi-theme design token systems from a set of brand colors and semantic role definitions. Produces Figma variable collections (tonal scales + contextual tokens), plus CSS, SCSS, CSV, and JSON exports.

---

## What it does

- **Tonal Scale mode** — generates a full tonal scale per color (configurable step count, 7 scale algorithms), then maps semantic roles (Text, Fill, Background, Border…) onto those steps by contrast or index
- **Adaptive Engine mode** — solves role colors directly to target contrast ratios without an intermediate tonal scale; per-color or per-role solver modes (Balanced, Vivid, Muted, Hue Locked, Max Chroma)
- **Multi-theme** — unlimited themes, each with a configurable background color
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
  ui.html                          — plugin panel markup + script tags (inlined at build)
  input.css / output.css           — Tailwind source / compiled output

  color/
    clrUtils.js                    — color math: hex↔RGB↔HSL↔OKLCH↔HCT, WCAG contrast, sanitizeHex
    clrEngine.js                   — tonal scale generator, contrast solver, variableMaker pipeline

  figma/
    main.js                        — message router, plugin init, config persistence
    figmaVars.js                   — Figma variable API (CRUD, rename, sync)

  shared/
    config.js                      — appState → engine config translator + rename-map builder
    docGen.js                      — CSS / SCSS / CSV export formatters

  ui/
    store.js                       — appState, demoConfig, mutations (setColor/setRole/setVariation),
                                     validation, dirty-hash, savedState snapshot
    router.js                      — all screen/overlay visibility (show/hide only, no state mutations)
    runtime.js                     — event wiring, message handling, keyboard shortcuts, boot

    components/
      primitives.js                — base DOM helpers: el(), debounce, inputsUI (input, toggle, row,
                                     colorInput, iconButton, actionButton, …)
      organisms.js                 — panelUI (card, row, segmented, togglePill, selectInput, …)
                                     + Components card builders (ColorGroupCard, RoleGroupCard)

    screens/
      colors.js                    — Palette sidebar tab renderer (renderColorGroups, bindDragDrop)
      roles.js                     — Roles sidebar tab renderer (renderRoles)
      project.js                   — Project sidebar tab renderer (renderSidebarProject)
      settings.js                  — Settings screen: panel renderers, mode setters, state↔DOM sync,
                                     open/cancel/done lifecycle
      preview.js                   — Preview screen: renderPreviewTabs, renderPreviewPanel,
                                     renderThemePanel, schedulePreview

    services/
      crud.js                      — entity CRUD: addGroup/removeGroup/moveGroup/updateGroup,
                                     addRole/…, addSharedVariation/…, addStepLabel/…,
                                     toggleRoleVariationOverride, addTheme/…
      publish.js                   — Figma sync dispatch, run/success/error dialog renderers,
                                     import (with confirmation dialog) / export
      notifications.js             — BannerManager (persistent banners) + ToastManager
```

### UI module dependencies (load order)

```
primitives.js        — el(), debounce, clipboard, inputsUI
  organisms.js       — panelUI, Components (depends on inputsUI)
    store.js         — appState, demoConfig, mutations, validation
    router.js        — show/hide logic (depends on store for activeSidebarTab)
    services/crud.js — entity operations (depends on store mutations + screen renderers)
    screens/*.js     — renderers (depend on store + organisms + crud)
    services/*.js    — publish, notifications (depend on store + screens)
      runtime.js     — wiring + boot (depends on everything above)
```

### Config persistence

- **Plugin config** (`appState`) → `figma.root.setPluginData("ctm316_state")` — stored in the document, travels with the Figma file
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

### Active branch: `CTM_3.0_Beta`

---

### Done ✓

**Project restructure (CTM 3.0)**

- [x] Full source reorganisation: `color/`, `figma/`, `shared/`, `ui/` with `components/`, `screens/`, `services/`
- [x] All UI modules migrated to `el()`-based DOM construction (no `innerHTML` template strings remain)
- [x] `router.js` split out — pure visibility logic, zero state mutations
- [x] `crud.js` split out — all entity CRUD in one place
- [x] `store.js` owns all state: `appState`, mutations (`setColor`, `setRole`, `setVariation`, `setRoleVariation`), validation, dirty-hash

**UI architecture**

- [x] `el()` helper + `inputsUI` primitive set: `input`, `colorInput`, `toggle`, `row`, `sectionLabel`, `iconButton`, `actionButton`
- [x] `panelUI` layout system: `card`, `row`, `smallRow`, `segmented`, `togglePill`, `selectInput`, `sectionLabel`
- [x] `Components` card architecture: `ColorGroupCard` and `RoleGroupCard` composed from named sub-rows
- [x] `bindDragDrop()` helper — drag-to-reorder on both color and role cards
- [x] `debounce` + `withPreservedFocus` — glitch-free typing, no focus loss on re-render
- [x] In-place color sync on hex/picker input — no re-render, uses stable element IDs
- [x] Role card variations section — collapsible, Global/Role scope badge, full variation table

**Settings screen**

- [x] Two-tab settings: Token Settings + Plugin
- [x] Settings snapshot on open → full restore on Cancel
- [x] `syncOutputToggles` split into focused helpers: `_syncTogglePills`, `_syncModeControls`, `_syncSpreadUnit`, `_syncPerRoleControls`, `_syncGroupingButtons`, `syncAlgoSection`
- [x] Token Name Format pill drag-to-reorder
- [x] Scale Step Labels list with add/remove/reorder
- [x] Shared Variations list with add/remove/reorder
- [x] Global solver row for adaptive engine + global mode

**State & settings**

- [x] Stable `_id` identity on colors/roles/themes/variations — renames detected correctly across reorders
- [x] `ensureVariations()` — keeps all role `variationTargets` arrays in sync with the global variations list
- [x] `DEFAULT_VARIATION_TARGETS` constant shared between UI and Figma threads
- [x] State validation before sync: requires ≥1 color and ≥1 role; unique name + shorthand checks

**Persistence & sync**

- [x] `savedState` snapshot updated on every successful sync — correct rename detection within a session
- [x] `isDirty()` / `markClean()` dirty-hash tracking
- [x] Import confirmation dialog (Save Current & Import / Import & Replace / Cancel)

**Theme & preferences**

- [x] Figma theme detection: checks `<html>` and `<body>` for `figma-dark`/`figma-light`, `matchMedia` as fallback
- [x] MutationObserver on both elements + `matchMedia` change listener
- [x] UI Scale and UI Theme persisted via `clientStorage`

**Banners & dialogs**

- [x] `BannerManager` with `detailNode` support — expandable detail sections
- [x] `ToastManager` — transient success/error/info toasts
- [x] Custom confirm dialogs via `createDialogue()` — card layout and sheet layout variants
- [x] Run dialog: scope selector, output options, collections list, rename summary, warnings

**Build**

- [x] Build strips comments from dist output
- [x] `/* filename */` markers per section in both `scripts.js` and `ui.html`

---

### Next up (priority order)

- [ ] **Base Selection + Spread Unit UI** — `appState.baseSelection` and `appState.spreadUnit` have full sync/setter code but no rendered controls in the current settings panel; add them back to the Token Settings tab
- [ ] **Per-Role Controls toggle** — `appState.perRoleControls` and its sync code exist but the toggle has no rendered UI; adding it would unlock per-role base selection and spread unit overrides on individual role cards
- [ ] **Role variation override — end-to-end test** — per-role custom variations exist in state; need a full manual test across both plugin modes
- [ ] **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations but skips per-role variation overrides
- [ ] **`manifest.json` network cleanup** — `cdn.tailwindcss.com` no longer fetched (Tailwind inlined at build); remove from `allowedDomains`
- [ ] **Input validation feedback** — errors currently show in the full error overlay; consider inline feedback closer to the offending field for duplicate-name errors

---

## Known issues / watch list

- `appState.baseSelection`, `appState.spreadUnit`, and `appState.perRoleControls` are fully wired in state and sync logic but have no rendered UI controls — their default values are always used
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) fetched at runtime — could be inlined at build if offline support matters
- No undo/redo — noted gap, no plans yet
- `toggleRoleVariationOverride` does not clear `role.variationManual` when turning override off (legacy field, no current effect)
