# Progress Tracker

> Updated end of each session. Start here next time.

**Active branch:** `CTM_3.0_Beta`

---

## Done ✓

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

## Next up (priority order)

- [ ] **Per-Role Controls toggle** — `appState.perRoleControls` and its sync code exist but the toggle has no rendered UI; adding it would unlock per-role base selection and spread unit overrides on individual role cards
- [ ] **Role variation override — end-to-end test** — per-role custom variations exist in state; need a full manual test across both plugin modes
- [ ] **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations but skips per-role variation overrides
- [ ] **`manifest.json` network cleanup** — `cdn.tailwindcss.com` no longer fetched (Tailwind inlined at build); remove from `allowedDomains`
- [ ] **Input validation feedback** — errors currently show in the full error overlay; consider inline feedback closer to the offending field for duplicate-name errors

---

## Known issues

- No undo/redo — noted gap, no plans yet
