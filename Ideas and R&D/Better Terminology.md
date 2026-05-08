# Terminology Audit — CTM316 Figma Plugin

---

## Critical — Likely to cause confusion or misuse

---

**"Color Groups" (sidebar tab)**
Current label implies a visual grouping, not a generative concept. Users may think it's just a folder.
→ **"Source Colors"** — the word "source" is used by Figma Tokens, Style Dictionary, and Token Pipeline to describe base inputs that feed a system. Communicates that these are the seeds from which everything else is derived. Alternative: **"Brand Colors"** if the audience is always designers.

---

**"Theme Roles" (sidebar tab)**
"Theme" is redundant (the whole plugin is theme-aware) and "Roles" alone is the industry term. Material Design 3, Spectrum, and Figma's own Color Styles documentation all use "Color Roles" as the canonical phrase for semantic usage assignments.
→ **"Color Roles"** — direct, matches industry standard.

---

**"Weights Count" / "Weights Creation Method" / "Color Group Weight Names (CSV)"**
"Weights" is borrowed from typography (font weights) and has no established meaning in color system design. Radix uses "steps", Material uses "tones", Tailwind uses numeric stops.
→ **"Step Count"**, **"Scale Algorithm"**, **"Step Labels"** respectively. "Step" is already the cross-system lingua franca for tonal stops.

---

**"Roles Variations Count" showing "5 (fixed)"**
"Variations" is vague and "Count" implies editability, but the value is locked. This misleads users into thinking they can change it. If it's fixed, don't present it as an editable field at all.
→ Either remove it entirely, or rename it **"Variation Levels"** with a tooltip: *"Five fixed levels: decorative, subtle, standard, strong, prominent."* This also creates an opportunity to give the five levels better default names (see below).

---

**Default variation names: "weakest / weak / base / strong / stronger"**
"Weakest" and "Weak" feel pejorative in a design context. "Stronger" as a superlative without a clear ceiling reads oddly. Radix uses numbered steps; Spectrum uses "quiet / default / loud"; Material uses contrast ratios directly. The most designer-friendly naming in token systems is intent-based.
→ Suggested defaults: **"Decorative / Subtle / Default / Emphasized / Prominent"**. These communicate visual intent rather than abstract strength, making it immediately clear how to apply each token.

---

**"Role Mapping Method" with options "Contrast Based" / "Manual Base Index"**
"Role Mapping" implies connecting roles to something external (like a ramp). "Method" is overly mechanical. "Contrast Based" is clear but "Manual Base Index" is completely opaque to a non-developer.
→ Rename section: **"Base Selection"**. Options: **"By Contrast Target"** and **"Manual Index"**. The latter could add a tooltip: *"Pin each role's base step by its position number in the scale."*

---

**"Skip Color Ramps" toggle (Output Options and Run dialog)**
Users who don't know what a "ramp" is (which is many designers) won't understand what they're skipping. The description "Use hex values directly, no Color collection" is better than the label.
→ **"Embed Colors Directly"** with description: *"Write hex values into tokens instead of referencing the Tonal Scale collection."* This frames it as a capability, not a subtraction.

---

## Significant — Reduces clarity, affects onboarding

---

**"Figma Collections" section (Settings)**
The individual inputs inside are labeled inconsistently: "colors Collection Name" (wrong casing) and "Tokens collection Name" (mixed casing). The section heading itself is fine but the input labels should match the plugin's output.
→ Fix casing immediately. Rename inputs: **"Tonal Scale Collection"** and **"Token Collection"**. These names now mirror what the plugin actually creates.

---

**"Constants Collection" toggle**
"Constants" is a programming term. Designers tend to call these "Global Tokens", "Primitive Colors", or "Brand Values" (Spectrum calls this tier "globals"). The description "Write raw brand hex values" is correct but the section name doesn't prime that context.
→ **"Global Colors"** with description: *"A flat collection of raw brand hex values — no themes, no processing. Use as a reference layer."* Alternative: **"Primitive Colors"** (used by Primer and Token Pipeline).

---

**"Opacity Variants" and "Opacity Values (CSV, 0–100)"**
"Variants" is overloaded in design systems (it often refers to component variants in Figma). This is specifically alpha-channel versions.
→ **"Alpha Tints"** with label: **"Alpha Values (CSV, 0–100)"**. "Tints" is already established Figma vocabulary for lighter color values.

---

**"Solver Mode" (Direct Contrast — Color card)**
"Solver" is internal algorithm language. A designer asking "what is a solver?" gets no useful answer from this label.
→ **"Contrast Method"** with options renamed (see solver modes below).

---

**Solver mode option names**
All five are either jargon-dense or misleading:

| Current | Problem | Suggested |
|---|---|---|
| Natural — scales chroma with lightness | "chroma" / "lightness" are OKLCH terms | **Balanced** — adjusts hue and vibrancy naturally as lightness changes |
| Saturated — holds source chroma, moves L only | OKLCH jargon | **Vivid** — preserves the color's saturation, adjusts brightness only |
| Luminance — fades toward neutral gray at extremes | "Luminance" means something specific in WCAG | **Muted** — fades toward neutral at low/high lightness |
| Hue Locked — fixes H absolutely, co-adjusts L+C | H/L/C are OKLCH variables | **Hue Faithful** — locks the exact hue angle, adjusts brightness and vibrancy |
| Chroma Max — most vivid possible at required contrast | "Chroma" is OKLCH | **Maximum Vibrancy** — the most saturated possible color that still meets contrast |

---

**"SILENT RENAMES DETECTED" (Run dialog section heading)**
"Silent" implies something is being hidden from the user, which creates anxiety. This is actually a helpful preview of what will happen — the exact opposite of silent.
→ **"VARIABLES TO RENAME"** with subtext: *"Existing variables matching the previous names will be updated in place — nothing deleted."*

---

**"Contrast- Light" / "Contrast- Dark" (Color card column headers)**
Bad spacing (dash with no space), reads as a stutter. Also "Contrast" alone says nothing about direction or purpose.
→ **"☀ Contrast"** and **"⏾ Contrast"** (or "Light BG" / "Dark BG") — align with how Figma's own accessibility checker labels backgrounds.

---

**"Base ☀️" / "Base 🌙" (Role card, Tonal Scale mode)**
These are the index pinning controls. The emoji-only qualification is not accessible (screen readers read emoji names, not intent) and "Base" without context is ambiguous.
→ **"Light Base Index"** / **"Dark Base Index"** as labels. The emoji can stay as decorative prefixes: "☀ Light Base" / "⏾ Dark Base".

---

**"Seed Hex" (Color card column)**
"Seed" is a generative algorithm term. "Hex" is developer shorthand.
→ **"Source Color"** or just **"Color"**. The hex input affordance already communicates format.

---

## Polish — Inconsistencies and opportunity to improve

---

**"Color Preview" (Preview panel first tab)**
This tab previews the color role tokens applied to sample UI, not just colors in isolation. "Color Preview" undersells it.
→ **"Token Preview"** — matches the tab's actual content (semantic role tokens across light/dark backgrounds).

---

**"Scale Type" (Run dialog summary, was "Ramp Type")**
Better than "Ramp Type" but "Scale Type" is still ambiguous — it could mean the type of scale (tonal/direct) or the algorithm. Since it refers to the algorithm:
→ **"Scale Algorithm"** — consistent with the renamed settings label.

---

**"System Name" (Settings)**
"System" implies a complex architecture. For most users this is just the name of their design system or project.
→ **"Project Name"** — universal, no assumed knowledge.

---

**"By Color  color/role/step" / "By Role  role/color/step" (Token Grouping)**
The path examples help but the toggle label "Token Grouping" could be more precise.
→ **"Variable Structure"** with options **"Color-first"** (`color/role/step`) and **"Role-first"** (`role/color/step`). This directly describes what the user sees in Figma's variable panel.

---

**"Short names — Colors" / "Short names — Roles"**
These are abbreviation toggles that shorten variable path segments.
→ **"Abbreviate Color Names"** / **"Abbreviate Role Names"** — more explicit about the action.

---

**"Light theme bg" / "Dark theme bg" (Settings)**
Inconsistent capitalization and abbreviation of "background".
→ **"Light Theme Background"** / **"Dark Theme Background"**. These are important inputs — spell them out.

---

## Summary Table

| Current | Suggested | Source / Rationale |
|---|---|---|
| Color Groups (tab) | Source Colors | Style Dictionary, Figma Tokens |
| Theme Roles (tab) | Color Roles | Material Design 3, Spectrum |
| Weights Count | Step Count | Radix, Tailwind, Primer |
| Weights Creation Method | Scale Algorithm | General |
| Color Group Weight Names | Step Labels | General |
| Roles Variations Count | Variation Levels | General |
| weakest/weak/base/strong/stronger | Decorative/Subtle/Default/Emphasized/Prominent | Spectrum intent-naming |
| Role Mapping Method | Base Selection | General |
| Contrast Based (option) | By Contrast Target | General |
| Manual Base Index (option) | Manual Index | General |
| Skip Color Ramps | Embed Colors Directly | General |
| Constants Collection | Global Colors | Spectrum, Primer |
| Opacity Variants | Alpha Tints | Figma vocabulary |
| Solver Mode | Contrast Method | General |
| Natural | Balanced | Descriptive, designer-facing |
| Saturated | Vivid | Descriptive, designer-facing |
| Luminance | Muted | Descriptive, designer-facing |
| Hue Locked | Hue Faithful | Descriptive, designer-facing |
| Chroma Max | Maximum Vibrancy | Descriptive, designer-facing |
| SILENT RENAMES DETECTED | VARIABLES TO RENAME | General |
| Contrast- Light / Contrast- Dark | ☀ Contrast / ⏾ Contrast | Figma accessibility checker |
| Base ☀️ / Base 🌙 | ☀ Light Base / ⏾ Dark Base | Accessibility |
| Seed Hex | Source Color | General |
| Color Preview (tab) | Token Preview | General |
| Scale Type | Scale Algorithm | Consistency |
| System Name | Project Name | General |
| Token Grouping | Variable Structure | Figma vocabulary |
| By Color / By Role | Color-first / Role-first | Descriptive |
| Short names — Colors/Roles | Abbreviate Color/Role Names | Clarity |
| Light theme bg / Dark theme bg | Light Theme Background / Dark Theme Background | Consistency |
| colors Collection Name | Tonal Scale Collection | Consistency + clarity |
| Tokens collection Name | Token Collection | Consistency + clarity |

---

*Note: Default variation name changes (weakest → Decorative etc.) affect Figma variable path segments and should be flagged as a breaking change for existing users who have already applied a system.*
