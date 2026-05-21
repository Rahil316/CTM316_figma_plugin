# Architecture

## Two threads (Figma plugin model)

Figma plugins run two isolated JavaScript contexts that communicate only by message passing.

| File              | Thread     | Purpose                                       |
| ----------------- | ---------- | --------------------------------------------- |
| `dist/scripts.js` | Figma main | Variable CRUD, color math, config persistence |
| `dist/ui.html`    | UI iframe  | Plugin panel — all user interaction           |

Both are generated from `src/` by `npm run build`. Never edit `dist/` directly.

---

## Source layout

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
                                     + shared helpers (useWhiteLabel)

    screens/
      colors.js                    — Palette sidebar tab renderer (renderColorGroups, bindDragDrop)
      roles.js                     — Roles sidebar tab renderer (renderRoles)
      project.js                   — Project sidebar tab renderer (renderSidebarProject)
      settings.js                  — Settings screen: panel renderers, mode setters, state↔DOM sync,
                                     open/cancel/done lifecycle
      preview.js                   — Preview screen: tonal scale rows, token swatches,
                                     renderPreviewTabs, renderPreviewPanel, schedulePreview

    services/
      crud.js                      — entity CRUD: addGroup/removeGroup/moveGroup/updateGroup,
                                     addRole/…, addSharedVariation/…, addStepLabel/…,
                                     toggleRoleVariationOverride, addTheme/…
      publish.js                   — Figma sync dispatch, run/success/error dialog renderers,
                                     import (with confirmation dialog) / export
      notifications.js             — BannerManager (persistent banners) + ToastManager
```

---

## UI module load order

Script tags in `ui.html` must follow this dependency order — each layer can only reference what's above it.

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

---

## Config persistence

| What | Where | Scope |
| ---- | ----- | ----- |
| Plugin config (`appState`) | `figma.root.setPluginData("ctm316_state")` | Per Figma document — travels with the file |
| UI preferences (window size, theme, scale) | `figma.clientStorage` | Per user |
