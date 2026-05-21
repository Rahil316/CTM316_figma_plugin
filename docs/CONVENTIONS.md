# Development Conventions

## UI component layers

The UI is built in three layers. Each layer can only depend on what's below it.

```
primitives   →   organisms   →   screens
```

### Primitives (`components/primitives.js`)

Low-level DOM helpers and stateless UI atoms. No knowledge of `appState`.

- `el(tag, attrs, children)` — the only way to create DOM nodes (no `innerHTML`)
- `inputsUI.*` — form atoms: `input`, `colorInput`, `toggle`, `iconButton`, `actionButton`, `btn`
- `debounce`, `copyToClipboard`, `withPreservedFocus`

**Rule:** primitives never import from organisms or screens. They receive everything they need as arguments.

---

### Organisms (`components/organisms.js`)

Composite components and layout systems. Can reference `appState` and call mutations.

- `panelUI.*` — layout building blocks: `card`, `row`, `smallRow`, `segmented`, `togglePill`, `selectInput`, `sectionLabel`
- `Components.*` — card-level builders composed from `panelUI` and `inputsUI` atoms
  - Public methods: `ColorGroupCard`, `RoleGroupCard` — called from screen renderers
  - Private methods: prefixed `_`, e.g. `_ColorMainRow`, `_RoleAlgoRow` — called only within `Components`
- Shared helpers like `useWhiteLabel` live here when used by more than one screen

**Rule:** only put something in `organisms.js` if it is reused across multiple screens or composes existing `panelUI`/`inputsUI` atoms. Screen-specific display helpers stay in their screen file.

---

### Screens (`screens/*.js`)

One file per screen or sidebar tab. Each owns its renderer and any screen-local helpers.

- Renderer functions are named `render*` (e.g. `renderColorGroups`, `renderPreviewPanel`)
- Screen-local component helpers use a `_` prefix and a screen abbreviation, e.g. `_pvScaleStep` in `preview.js`
- Renderers call `Components.*` for card-level building blocks; they do not build raw DOM structures that belong in organisms

---

## State management

- `appState` is the single source of truth. It lives in `store.js`.
- **Never mutate `appState` directly from a screen or service.** Use the mutation functions: `setColor`, `setRole`, `setVariation`, `updateGroup`, etc.
- `router.js` is pure visibility — it only toggles CSS classes. It never reads or writes `appState`.
- `crud.js` owns all entity add/remove/move/update operations. If you're splicing an array on `appState`, it belongs there.

---

## Naming conventions

| Pattern | Meaning | Example |
| ------- | ------- | ------- |
| `_lowerCamelCase` | Screen-local helper, not exported | `_pvScaleStep` |
| `_PascalCase` inside `Components` | Private card sub-row | `_ColorMainRow` |
| `PascalCase` inside `Components` | Public card builder | `ColorGroupCard` |
| `render*` | Writes DOM from current state | `renderColorGroups` |
| `schedule*` | Debounced render trigger | `schedulePreview` |
| `sync*` | DOM ↔ state sync (settings) | `_syncTogglePills` |
| `handle*` | Event handler | `handleImportJSON` |

---

## Anti-patterns

- **No `innerHTML` template strings** — use `el()` for all DOM construction
- **No direct `appState` mutation outside `store.js`** — use mutation helpers
- **No state logic in `router.js`** — visibility only
- **No cross-screen imports** — screens are loaded in order; later screens can call earlier ones but not vice versa
- **No speculative abstractions** — don't move code into organisms until it's reused by a second screen
