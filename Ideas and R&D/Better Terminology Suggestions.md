Suggested Terms:

High‑level concepts

1. “Color Groups”

▫ Possible replacements:

⁃ “Color families”

⁃ “Base colors”

⁃ “Palettes”

▫ Rationale:
“Group” is generic. Most design systems talk about a “primary color,” “neutral palette,” “brand colors,” etc. “Color family” or “base color” better conveys “one anchor color plus its variations,” which matches how Material Design and Tailwind think about primary/neutral palettes.

2. “Theme Roles”

▫ Possible replacements:

⁃ “Color roles”

⁃ “Semantic roles”

⁃ “Semantic tokens”

▫ Rationale:
“Role” is fine, but “Theme Roles” can be vague. In the design‑token world (W3C Design Tokens Draft, Material Design, Figma variables), the common framing is “semantic colors” or “color roles” like “Text / Surface / Primary.” Adding “Color” or “Semantic” makes it obvious these are not user roles but color meanings.

3. “Plugin Mode: Tonal Scale / Direct Contrast”

▫ Possible replacements:

⁃ Section label: “Color generation mode”

⁃ “Tonal Scale” → “Generate color scales” or “Color scales mode”

⁃ “Direct Contrast” → “Single colors mode” or “Simple contrast mode”

▫ Rationale:
The user is choosing how colors are generated. “Tonal Scale” is a technical term (used in Material), but “color scales” is more familiar. “Direct Contrast” is unclear; adding “single colors” or “simple contrast” explains it’s not building ramps, just picking directly contrasting colors.

Scale / weight terminology

4. “Weights Count”

▫ Possible replacements:

⁃ “Number of steps”

⁃ “Steps per color”

⁃ “Shades per color”

▫ Rationale:
“Weight” is overloaded (typography, font weight). Libraries like Tailwind talk about “shades” (50–900), others say “steps.” “Steps per color” is clearer and closer to how non‑experts think: “How many shades of this color?”

5. “Weights Creation Method”

▫ Possible replacements:

⁃ “Scale method”

⁃ “How to generate steps”

⁃ “Color scale algorithm”

▫ Rationale:
“Weight creation” sounds abstract. You’re choosing how the shades are generated: “scale method” or “color scale algorithm” keeps it technical but obvious. Then “Natural / Uniform / Expressive / OKLCH / Material” become options under that.

6. “Color Group Weight Names (CSV)”

▫ Possible replacements:

⁃ “Shade names (CSV)”

⁃ “Step labels (CSV)”

⁃ “Names for each shade (CSV)”

▫ Rationale:
If the user is naming the steps (e.g., “50,100,200…” or “xlight, light…”), “shade names” or “step labels” matches everyday design language and what many token systems already use.

Role / state terminology

7. “Roles Variations Count (5 fixed)”

▫ Possible replacements:

⁃ “States per role (5 fixed)”

⁃ “Role states count (5 fixed)”

▫ Rationale:
Most people think of “states” (base / hover / active / disabled / subtle) rather than “variations.” “States per role” is both accurate and familiar from component design.

8. “Role Mapping Method: Contrast Based / Manual Base Index”

▫ Possible replacements:

⁃ Label: “How to assign colors to roles”

⁃ “Contrast based” → “Auto assign by contrast”

⁃ “Manual base index” → “Manual assignment”

▫ Rationale:
“Mapping method” is correct but abstract. Explaining it as “how to assign colors to roles” tells the user what this affects. “Auto assign by contrast” clearly advertises the benefit; “Manual assignment” is enough for advanced users.

9. “Role Variation Names (CSV)”

▫ Possible replacements:

⁃ “State names (CSV)”

⁃ “Role state labels (CSV)”

▫ Rationale:
If this is “Base / Hover / Active / Disabled…” then “state names” lines up with component state language and is instantly understandable.

Output & token terminology

10. “Skip Color Ramps”

- Possible replacements:

▫ “Don’t generate color scales”

▫ “No color scales”

- Rationale:
  “Ramp” is common in design‑system circles, but “scale” is more widely understood. “Don’t generate color scales” says plainly what will happen.

11. “Use hex values directly, no Color collection”

- Possible replacements:

▫ “Use raw HEX values (no variables)”

▫ “Skip Figma color variables; use HEX only”

- Rationale:
  The core idea is “don’t create Figma Variables/Collections, just output raw HEX.” “Raw HEX values (no variables)” communicates the trade‑off clearly.

12. “Constants Collection / Write raw brand hex values — no themes, no processing”

- Possible replacements:

▫ “Brand color collection”

▫ “Store raw brand HEX values (no themes)”

- Rationale:
  “Constants” feels like engineering jargon. In design system practice these are “base tokens,” “brand colors,” or “raw brand palette.” Calling it “Brand color collection” aligns with how teams name their top‑level palettes.

13. “Token Grouping: By Color / By Role”

- Suggested tweak:

▫ Keep the options, but clarify label: “Organize tokens by…”

- Rationale:
  The choices themselves are good and map directly to common token strategies. A small framing tweak (“Organize tokens by…”) explains what the radio buttons influence.

14. “Variable Name Format / Short names — Colors / Short names — Roles”

- Possible replacements:

▫ Section: “Variable naming”

▫ “Abbreviations for colors”

▫ “Abbreviations for roles”

- Rationale:
  “Variable name format” is fine for devs; adding body text like “Abbreviations for colors (e.g. primary → pr)” and “Abbreviations for roles (e.g. Text → tx)” makes it friendlier and self‑documenting.

Figma / application terminology

15. “Collections”

- This one is actually aligned with Figma’s own term for variable groupings.

- Suggested small tweak:

▫ When you say “colors Collection Name / Tokens collection Name”, rename labels to:

⁃ “Color variables collection name”

⁃ “Token variables collection name”

- Rationale:
  Newer Figma users might not immediately map “Collections” to “Variable collections.” Calling them “Color variables collection” leans on Figma’s own language while being explicit.

16. “Apply to Figma → SCOPE: All / Tonal Scale Only / Roles Only”

- Possible replacements:

▫ “What to update in this file”

▫ “Update everything / Update scales only / Update roles only”

- Rationale:
  “Scope” is correct but generic. A subheading “What to update in this file” plus clearer option text (“Update scales only”) spells out impact and reduces anxiety.

References behind these suggestions

- Material Design color system uses terms like “primary color,” “color roles,” and “tonal palettes / tonal palette steps.”

- Tailwind CSS popularized “shades” and numeric “steps” (50–900) rather than “weights.”

- Figma Variables & Collections call them “variables” grouped into “collections,” so echoing “variable collection” helps new users map mental models.

- Design token specifications (e.g., W3C Community Group) distinguish “semantic tokens/roles” (e.g., “color.text.default”) from “base” or “primitive” color tokens.

Additional terms that can trip people ￼

Beyond the earlier list, I’d flag these as potentially confusing or anxiety‑inducing:

- “System Name” – By itself, “system” is vague. It could be “Project name,” “Token system name,” or “Color system name.” Renaming to something like “Color system name” or “Design token system name” makes its scope clear.

- “Theme Roles” vs “Roles Settings” vs “Roles Variations Count” – Having “Roles” appear in several places with slightly different meanings adds friction. You might collapse this under a single clearer concept like “Color roles & states” and then use “roles” (what the color means) and “states” (base/hover/etc).

- “Direct Contrast” (mode) – As we touched on, it doesn’t immediately say “I won’t generate ramps; I’ll just pick contrasting colors.” Something like “Single Colors (Direct Contrast)” during a transitional phase could bridge old and new wording.

- “Silent renames detected” – This one reads like a Git or database warning. Users may not know whether this is safe or scary. Something like “Existing variables will be renamed, not deleted” with a plain‑language explanation is less intimidating.

- “Collections Already Exist / Overwrite Data?” – “Overwrite” and “replace” language triggers fear. Since the behavior is actually “we’ll update existing variables in these collections,” it’s better to say that explicitly: “Update existing collections” with subtext “Variables in these collections will be updated; none will be deleted.”

- “Write raw brand hex values — no themes, no processing” – This is powerful but dense. It mixes three ideas: “brand colors,” “raw,” and “skip processing.” You could label it “Use raw brand colors” with helper text “Store your brand HEX values exactly as given (no adjustments, no themes).”
