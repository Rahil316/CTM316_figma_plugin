/**
 * ============================================================================
 * CTM316 ENTITY CRUD
 *
 * Every user action that creates, updates, moves, or removes an entity in
 * appState lives here. Nothing else does.
 *
 * ┌─ ENTITY               OWNS                      RENDERS ON CHANGE ──────┐
 * │  Colors               appState.colors           renderColorGroups        │
 * │  Roles                appState.roles            renderRoles              │
 * │  Shared Variations    appState.variations       renderSettingsVariations  │
 * │                                                 renderRoles              │
 * │  Role Var Overrides   role.roleVariations       renderRoles              │
 * │  Themes               appState.themes           renderSettingsThemes     │
 * │                                                 renderPreviewTabs        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * All mutations go through the state.js setters (setColor, setRole,
 * setVariation, setRoleVariation) or direct splice for add/remove/move.
 * Every function ends with the minimum render calls needed — no more.
 * ============================================================================
 */

// ── COLORS ──────────────────────────────────────────────────────────────────
//
//  Reads:   appState.colors
//  Mutates: setColor() / splice / unshift
//  Renders: renderColorGroups(), schedulePreview()

const _PRESET_COLORS = [
  { name: "Crimson",    shorthand: "cr", value: "DC143C" },
  { name: "Coral",      shorthand: "co", value: "FF6B6B" },
  { name: "Tomato",     shorthand: "to", value: "FF4500" },
  { name: "Orange",     shorthand: "or", value: "FF7F00" },
  { name: "Amber",      shorthand: "am", value: "F59E0B" },
  { name: "Gold",       shorthand: "gd", value: "FFD700" },
  { name: "Lime",       shorthand: "li", value: "84CC16" },
  { name: "Emerald",    shorthand: "em", value: "10B981" },
  { name: "Teal",       shorthand: "te", value: "14B8A6" },
  { name: "Cyan",       shorthand: "cy", value: "06B6D4" },
  { name: "Sky",        shorthand: "sk", value: "0EA5E9" },
  { name: "Blue",       shorthand: "bl", value: "3B82F6" },
  { name: "Cobalt",     shorthand: "cb", value: "0047AB" },
  { name: "Indigo",     shorthand: "in", value: "6366F1" },
  { name: "Violet",     shorthand: "vi", value: "7C3AED" },
  { name: "Purple",     shorthand: "pu", value: "A855F7" },
  { name: "Fuchsia",    shorthand: "fu", value: "D946EF" },
  { name: "Pink",       shorthand: "pk", value: "EC4899" },
  { name: "Rose",       shorthand: "ro", value: "F43F5E" },
  { name: "Brown",      shorthand: "br", value: "92400E" },
  { name: "Sienna",     shorthand: "si", value: "A0522D" },
  { name: "Sand",       shorthand: "sa", value: "C2B280" },
  { name: "Slate",      shorthand: "sl", value: "64748B" },
  { name: "Stone",      shorthand: "st", value: "78716C" },
  { name: "Zinc",       shorthand: "zn", value: "71717A" },
  { name: "Gray",       shorthand: "gr", value: "6B7280" },
  { name: "Neutral",    shorthand: "nt", value: "737373" },
  { name: "Charcoal",   shorthand: "ch", value: "374151" },
  { name: "Navy",       shorthand: "nv", value: "1E3A5F" },
  { name: "Forest",     shorthand: "fo", value: "166534" },
  { name: "Olive",      shorthand: "ol", value: "6B7C2C" },
  { name: "Mint",       shorthand: "mn", value: "A7F3D0" },
  { name: "Lavender",   shorthand: "lv", value: "C4B5FD" },
  { name: "Peach",      shorthand: "pe", value: "FBBF9C" },
  { name: "Blush",      shorthand: "bs", value: "FCA5A5" },
  { name: "Cream",      shorthand: "cm", value: "FFFBEB" },
  { name: "Ivory",      shorthand: "iv", value: "FFFFF0" },
  { name: "Snow",       shorthand: "sn", value: "FFFAFA" },
  { name: "White",      shorthand: "wh", value: "FFFFFF" },
  { name: "Black",      shorthand: "bk", value: "000000" },
  { name: "Midnight",   shorthand: "md", value: "121212" },
  { name: "Obsidian",   shorthand: "ob", value: "1A1A2E" },
  { name: "Magenta",    shorthand: "mg", value: "FF00FF" },
  { name: "Turquoise",  shorthand: "tu", value: "40E0D0" },
  { name: "Aqua",       shorthand: "aq", value: "00FFFF" },
  { name: "Chartreuse", shorthand: "cz", value: "7FFF00" },
  { name: "Maroon",     shorthand: "mr", value: "800000" },
  { name: "Burgundy",   shorthand: "bu", value: "800020" },
  { name: "Scarlet",    shorthand: "sc", value: "FF2400" },
  { name: "Tangerine",  shorthand: "tg", value: "F28500" },
];

function _nextPresetColor() {
  const usedNames = new Set(appState.colors.map((c) => c.name.toLowerCase()));
  const usedShorthands = new Set(appState.colors.map((c) => (c.shorthand || "").toLowerCase()));
  const available = _PRESET_COLORS.filter(
    (p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase())
  );
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  const n = appState.colors.length + 1;
  return { name: `Color ${n}`, shorthand: `c${n}`, value: "888888" };
}

function addGroup() {
  const preset = _nextPresetColor();
  appState.colors.unshift({ _id: generateId(), name: preset.name, shorthand: preset.shorthand, value: preset.value });
  renderColorGroups();
  schedulePreview();
}

function removeGroup(idx) {
  appState.colors.splice(idx, 1);
  renderColorGroups();
  schedulePreview();
}

function moveGroup(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.colors.length) return;
  const [item] = appState.colors.splice(idx, 1);
  appState.colors.splice(target, 0, item);
  renderColorGroups();
}

function updateGroup(idx, key, value, el) {
  setColor(idx, key, value);
  if (key === "value") {
    const clean = appState.colors[idx].value;
    if (el && el.value !== clean) {
      const pos = el.selectionStart;
      el.value = clean;
      el.setSelectionRange(pos, pos);
    }
    const textEl = document.getElementById(`clr-${idx}-hex`);
    const pickerEl = document.getElementById(`clr-${idx}-picker`);
    if (textEl && textEl !== el) textEl.value = clean;
    if (pickerEl && pickerEl !== el && clean.length === 6) pickerEl.value = "#" + clean;
  }
  schedulePreview();
}

// ── ROLES ────────────────────────────────────────────────────────────────────
//
//  Reads:   appState.roles, appState.variations, appState.pluginMode, appState.scaleLength
//  Mutates: setRole() / splice / unshift
//  Renders: renderRoles(), schedulePreview()

const _PRESET_ROLES = [
  { name: "Text",        shorthand: "tx" },
  { name: "Fill",        shorthand: "fi" },
  { name: "Background",  shorthand: "bg" },
  { name: "Border",      shorthand: "bd" },
  { name: "Icon",        shorthand: "ic" },
  { name: "Surface",     shorthand: "su" },
  { name: "Overlay",     shorthand: "ov" },
  { name: "Shadow",      shorthand: "sh" },
  { name: "Accent",      shorthand: "ac" },
  { name: "Muted",       shorthand: "mu" },
  { name: "Subtle",      shorthand: "sb" },
  { name: "Emphasis",    shorthand: "em" },
  { name: "Link",        shorthand: "lk" },
  { name: "Placeholder", shorthand: "ph" },
  { name: "Disabled",    shorthand: "ds" },
  { name: "Success",     shorthand: "ok" },
  { name: "Warning",     shorthand: "wn" },
  { name: "Error",       shorthand: "er" },
  { name: "Info",        shorthand: "nf" },
  { name: "Inverse",     shorthand: "iv" },
];

function _nextPresetRole() {
  const usedNames = new Set(appState.roles.map((r) => r.name.toLowerCase()));
  const usedShorthands = new Set(appState.roles.map((r) => (r.shorthand || "").toLowerCase()));
  const available = _PRESET_ROLES.filter(
    (p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase())
  );
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  const n = appState.roles.length + 1;
  return { name: `Role ${n}`, shorthand: `r${n}` };
}

function addRole() {
  const preset = _nextPresetRole();
  const mid = Math.floor(appState.scaleLength / 2);
  appState.roles.unshift({
    _id: generateId(),
    name: preset.name,
    shorthand: preset.shorthand,
    spread: 2,
    minContrast: 4.5,
    baseIndex: mid,
    darkBaseIndex: mid,
    variationTargets: defaultVariationTargets(appState.variations.length, appState.pluginMode, appState.scaleLength),
    description: "",
    variationOverride: false,
    roleVariations: [],
    mappingMode: "auto",
  });
  renderRoles();
  schedulePreview();
}

function removeRole(idx) {
  appState.roles.splice(idx, 1);
  renderRoles();
  schedulePreview();
}

function moveRole(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.roles.length) return;
  const [item] = appState.roles.splice(idx, 1);
  appState.roles.splice(target, 0, item);
  renderRoles();
}

function updateRole(idx, key, value) {
  setRole(idx, key, value);
  if (key === "name" || key === "shorthand") {
    schedulePreview();
  } else {
    renderRoles();
  }
}

// ── SHARED VARIATIONS ────────────────────────────────────────────────────────
//
//  Reads:   appState.variations
//  Mutates: appState.variations splice/push, setVariation()
//  Renders: renderSettingsVariations(), renderRoles(), schedulePreview()

function addSharedVariation() {
  const n = appState.variations.length + 1;
  appState.variations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function removeSharedVariation(idx) {
  if (appState.variations.length <= 1) return;
  appState.variations.splice(idx, 1);
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function moveSharedVariation(idx, dir) {
  const arr = appState.variations;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function updateSharedVariation(idx, field, value) {
  setVariation(idx, field, value);
  renderRoles();
  schedulePreview();
}

// ── STEP LABELS ──────────────────────────────────────────────────────────────

function addStepLabel() {
  if (!Array.isArray(appState.scaleStepNames)) appState.scaleStepNames = [];
  const n = appState.scaleStepNames.length + 1;
  const label = String(n * 100);
  appState.scaleStepNames.push({ _id: generateId(), name: label, shorthand: label });
  renderSettingsStepLabels();
  schedulePreview();
}

function removeStepLabel(idx) {
  if (!Array.isArray(appState.scaleStepNames)) return;
  appState.scaleStepNames.splice(idx, 1);
  renderSettingsStepLabels();
  schedulePreview();
}

function moveStepLabel(idx, dir) {
  const arr = appState.scaleStepNames;
  if (!Array.isArray(arr)) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  renderSettingsStepLabels();
  schedulePreview();
}

function updateStepLabel(idx, field, value) {
  if (!Array.isArray(appState.scaleStepNames) || !appState.scaleStepNames[idx]) return;
  appState.scaleStepNames[idx][field] = value;
  schedulePreview();
}

// ── ROLE VARIATION OVERRIDES ─────────────────────────────────────────────────

function toggleRoleVariationOverride(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = !role.variationOverride;
  if (role.variationOverride && (!role.roleVariations || role.roleVariations.length === 0)) {
    role.roleVariations = appState.variations.map((v) => Object.assign({}, v, { _id: generateId() }));
  }
  renderRoles();
  schedulePreview();
}

function addRoleVariation(roleIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations) role.roleVariations = [];
  const n = role.roleVariations.length + 1;
  role.roleVariations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function removeRoleVariation(roleIdx, varIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || role.roleVariations.length <= 1) return;
  role.roleVariations.splice(varIdx, 1);
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function moveRoleVariation(roleIdx, varIdx, dir) {
  const arr = appState.roles[roleIdx].roleVariations;
  if (!arr) return;
  const newIdx = varIdx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[varIdx], arr[newIdx]] = [arr[newIdx], arr[varIdx]];
  renderRoles();
  schedulePreview();
}

function updateRoleVariation(roleIdx, varIdx, field, value) {
  setRoleVariation(roleIdx, varIdx, field, value);
  schedulePreview();
}

function resetRoleVariationsToShared(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = false;
  role.roleVariations = [];
  renderRoles();
  schedulePreview();
}

function updateRoleVariationTarget(roleIdx, varIdx, value) {
  setRole(roleIdx, "variationTarget:" + varIdx, value);
  schedulePreview();
}

// ── THEMES ───────────────────────────────────────────────────────────────────

function addTheme() {
  if (!appState.themes) appState.themes = [];
  const n = appState.themes.length + 1;
  appState.themes.push({ _id: generateId(), name: "Theme " + n, bg: "888888" });
  renderSettingsThemes();
  renderPreviewTabs();
  schedulePreview();
}

function removeTheme(idx) {
  if (!appState.themes || appState.themes.length <= 1) return;
  appState.themes.splice(idx, 1);
  renderSettingsThemes();
  renderPreviewTabs();
  schedulePreview();
}

function updateTheme(idx, field, value) {
  if (!appState.themes || !appState.themes[idx]) return;
  if (field === "bg") value = sanitizeHex(value);
  appState.themes[idx][field] = value;
}

function updateProjectName(value) {
  appState.name = value;
  schedulePreview();
}
