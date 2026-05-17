---
name: Settings spec
description: Final settings module design, PDF gap analysis, and per-tab field inventory
type: project
originSessionId: 8d8bcbc1-572d-4c9f-b8bd-4a9ae7f56916
---
Last updated: 2026-05-17
Source: Settings.pdf mockup (read via pdfminer) + current codebase audit

---

## Settings screen layout

Full-screen overlay (not bottom sheet). Fixed header with Cancel / Done. 5 tab pills.
Cancel snapshots state on open, restores on cancel. Done calls updateSettingsFromInputs().

```
┌─────────────────────────────────┐
│ Settings         [Cancel] [Done]│
├─────────────────────────────────┤
│ [Project][Palettes][Roles][Figma][Plugin] │
├─────────────────────────────────┤
│  scrollable tab content         │
└─────────────────────────────────┘
```

---

## Tab-by-tab field spec

### Project tab

| Field | Type | State key | Status |
|---|---|---|---|
| Project Name | text input | `appState.name` | ✅ wired |
| Light theme bg | hex input | `appState.themes[0].bg` | ✅ wired |
| Dark theme bg | hex input | `appState.themes[1].bg` | ✅ wired |
| Saved States list | list + actions | new — snapshot array | 🚧 placeholder only |

Saved States row actions: View Changes, Restore, Preview, Delete.

### Palettes tab

| Field | Type | State key | Status |
|---|---|---|---|
| Token Creation Mode | segmented (Tonal Scale / Adaptive Engine) | `appState.pluginMode` | ✅ wired |
| Palette steps | number input | `appState.scaleLength` | ✅ wired |
| Scale Algorithm | select | `appState.scaleAlgorithm` | ✅ wired |
| Step Labels (CSV) | text input | `appState.scaleStepNames` | ✅ wired — verify engine uses it |

### Roles tab

| Field | Type | State key | Status |
|---|---|---|---|
| Role Specific Variations | toggle | `appState.allowRoleVariations` | ✅ wired |
| Per-role Controls | toggle | `appState.perRoleControls` | ✅ wired |
| Base Selection | select (By Contrast / By Index / Manual) | `appState.baseSelection` | ✅ wired |
| Spread Unit | segmented (Steps / Contrast) | `appState.spreadUnit` | ✅ wired |
| Variation Levels list | dynamic list | `appState.variations` | ✅ wired |
| Role Labels CSV | text input | new — global variation name setter | 🚧 not implemented |

Role Labels CSV = convenience field to rename all variation levels at once via comma list
(e.g. "Lighter, Light, Base, Dark, Darker" → sets each variation's name).
Currently the only way to rename is per-variation inline in the list.

### Figma tab

| Field | Type | State key | Status |
|---|---|---|---|
| Tonal Scale Collection | text input | `appState.tonalScaleCollectionName` | ✅ wired |
| Color Roles Collection | text input | `appState.tokenCollectionName` | ✅ wired |
| Embed Colors Directly | toggle | `appState.embedDirectly` | ✅ wired |
| Global Colors | toggle | `appState.includeGlobalColors` | ✅ wired |
| Global Colors Collection Name | text input | `appState.globalColorsCollectionName` | ✅ wired |
| Alpha Tints | toggle | `appState.includeAlphaTints` | ✅ wired |
| Alpha Values (CSV) | text input | `appState.alphaValues` | ✅ wired — verify engine |
| Variable Structure | segmented (Color-first / Role-first) | `appState.variableStructure` | ✅ wired |
| Use shorthand for Colors | toggle | `appState.useShorthandColors` | ✅ wired |
| Use shorthand for Roles | toggle | `appState.useShorthandRoles` | ✅ wired |
| Use shorthand for Variations | toggle | `appState.useShorthandVariations` | ✅ wired |
| Token name format preview | read-only display | derived | ✅ wired |
| Variable Descriptions | toggle | `appState.includeDescriptions` | ✅ wired |

**New fields seen in PDF not yet in code:**
- Global Variables collection name (`_Global`) — separate from "Global Colors" collection. Purpose unclear — may be the same field, or a separate "primitive tokens" layer. Needs clarification from user.

### Plugin tab

| Field | Type | State key | Status |
|---|---|---|---|
| UI Scale | select (70%–150%) | `uiPrefs.scale` | ✅ wired (moved from more-sheet) |
| UI Theme | select (Follow Figma / Dark / Light) | `uiPrefs.theme` | ✅ wired (moved from more-sheet) |
| Language | select | new — no i18n infra | 🚧 placeholder |
| Beta Features — Enroll | toggle | new | 🚧 placeholder |
| Beta Feature 1/2/3 | toggles | new | 🚧 placeholder |
| About CTM — Feedback | link | new | 🚧 placeholder |
| About CTM — Learn more | link | new | 🚧 placeholder |

---

## Gap analysis summary

### In PDF mockup but NOT in code (user needs to add/implement)
1. **Saved States** — version history with restore (Project tab)
2. **Role Labels CSV** — bulk variation rename (Roles tab)
3. **Global Variables `_Global` collection** — purpose TBD (Figma tab)
4. **Language selector** (Plugin tab)
5. **Beta Features** section (Plugin tab)
6. **About CTM** section (Plugin tab)

### In code but NOT visible in any mockup tab (user should add Figma slots)
1. `pluginMode` — Token Creation Mode is in Palettes tab ✅ (it's there)
2. `perRoleControls` — per-role override toggle is in Roles tab ✅
3. `includeDescriptions` — in Figma tab ✅
4. `variableStructure` — in Figma tab ✅
5. `embedDirectly` — in Figma tab ✅
6. `includeAlphaTints` + `alphaValues` — in Figma tab ✅
7. **`scaleStepNames`** — Step Labels CSV, in Palettes tab ✅
8. **`allowRoleVariations`** — in Roles tab ✅

All major code settings are accounted for in the mockup tabs. Only the new features above are missing.

---

## More-sheet (export menu) — what remains

After moving UI Scale/Theme to Plugin tab, more-sheet contains:
- Save Config JSON
- Export CSS Variables
- Export CSV
- Export SCSS
- Clear All (destructive, red)

This sheet is still needed. Accessed via the "•••" button in the toolbar.
