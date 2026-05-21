# CTM316 — Color Token Machine

A Figma plugin that generates multi-theme design token systems from a set of brand colors and semantic role definitions.

---

## What it does

- **Tonal Scale mode** — generates a full tonal scale per color (configurable step count, 7 scale algorithms), then maps semantic roles (Text, Fill, Background, Border…) onto those steps by contrast or index
- **Adaptive Engine mode** — solves role colors directly to target contrast ratios without an intermediate tonal scale; per-color or per-role solver modes (Balanced, Vivid, Muted, Hue Locked, Max Chroma)
- **Multi-theme** — unlimited themes, each with a configurable background color
- **Rename-safe sync** — stable `_id` tracking means reordering or renaming colors/roles updates existing Figma variables in place instead of deleting and recreating them
- **Exports** — Figma variables, CSS custom properties, SCSS (maps + mixin), CSV audit sheet, JSON token file

---

## Quick start

```bash
npm install
npm run build      # produces dist/scripts.js + dist/ui.html
npm run watch      # rebuilds on file change
```

Load in Figma Desktop → Plugins → Development → Import plugin from manifest → select `manifest.json`.

> `dist/` is generated — never edit it directly.

---

## Docs

| File | Contents |
| ---- | -------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Two-thread model, source layout, module load order, config persistence |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | UI component rules, state management, naming, anti-patterns |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Done, next up, known issues — updated each session |
