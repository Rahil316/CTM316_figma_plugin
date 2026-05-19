
// 3. CONFIG TRANSLATOR: Converts appState (UI format) into the format expected by variableMaker.
function translateConfig(appState) {
  const count = Math.max(1, parseInt(appState.scaleLength) || 23);
  const stepNames = _parseStepNames(appState, count);
  const variations = _parseVariations(appState);
  const roleStepNames = variations.map((v) => (appState.useShorthandVariations && v.shorthand ? v.shorthand : v.name));
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];

  return {
    name: appState.name || "ctm316",
    colors: (appState.colors || []).map((g) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      solverMode: g.solverMode || "natural",
      description: g.description || "",
    })),
    roles: _mapRoles(appState, variations, count),
    scaleLength: count,
    scaleAlgorithm: appState.scaleAlgorithm || "Natural",
    pluginMode: appState.pluginMode || "tonalScalesBased",
    perRoleControls: !!appState.perRoleControls,
    spreadUnit: appState.spreadUnit || "steps",
    baseSelectionMode: appState.baseSelection || "By Contrast",
    roleMapping: appState.pluginMode === "adaptiveEngine" ? (appState.baseSelection === "Manual" ? "Direct Manual" : "Direct Contrast") : appState.baseSelection || "By Contrast",
    scaleStepNames: stepNames,
    roleStepNames,
    variations: variations.map(function (v) {
      return Object.assign({}, v);
    }),
    themes: _deduplicateThemeNames(themes),
    embedDirectly: appState.embedDirectly || false,
    variableStructure: appState.variableStructure || "color",
    useShorthandColors: appState.useShorthandColors || false,
    useShorthandRoles: appState.useShorthandRoles || false,
    useShorthandVariations: appState.useShorthandVariations || false,
    includeGlobalColors: appState.includeGlobalColors || false,
    globalColorsCollectionName: appState.globalColorsCollectionName || "_constants",
    includeAlphaTints: appState.includeAlphaTints || false,
    alphaValues: (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => Math.max(0, Math.min(100, parseInt(v.trim()))))
      .filter((v) => !isNaN(v)),
    includeDescriptions: appState.includeDescriptions !== false,
  };
}

function _parseStepNames(appState, count) {
  const raw = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames.join(",") : appState.scaleStepNames || "";
  const userNames = raw.trim() ? raw.split(",").map((n) => n.trim()) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

function _deduplicateThemeNames(themes) {
  const seen = {};
  return (themes || [{ name: "Light", bg: "FFFFFF" }, { name: "Dark", bg: "000000" }]).map((t) => {
    const base = (t.name || "Theme").trim();
    if (!seen[base]) { seen[base] = 1; return { name: base, bg: t.bg || "FFFFFF" }; }
    seen[base]++;
    return { name: `${base} ${seen[base]}`, bg: t.bg || "FFFFFF" };
  });
}

function _parseVariations(appState) {
  return appState.variations && appState.variations.length > 0 ? appState.variations : [1, 2, 3, 4, 5].map((n) => ({ _id: String(n), name: String(n), shorthand: String(n), description: "" }));
}

function _mapRoles(appState, variations, count) {
  return (appState.roles || []).map((role) => ({
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    minContrast: parseFloat(role.minContrast !== undefined ? role.minContrast : 4.5),
    spread: Math.max(1, parseInt(role.spread) || 1),
    baseIndex: role.baseIndex !== undefined ? parseInt(role.baseIndex) : Math.floor(count / 2),
    darkBaseIndex: role.darkBaseIndex !== undefined ? parseInt(role.darkBaseIndex) : undefined,
    baseContrast: parseFloat(role.baseContrast) || 4.5,
    contrastGap: parseFloat(role.contrastGap) || 1.5,
    baseSelection: role.baseSelection || appState.baseSelection || "By Contrast",
    spreadUnit: role.spreadUnit || appState.spreadUnit || "steps",
    useContrastGap: !!role.useContrastGap,
    variationTargets: role.variationTargets || (appState.pluginMode === "adaptiveEngine" ? variations.map((_, i) => DEFAULT_VARIATION_TARGETS[i] || 4.5) : variations.map((_, i) => Math.floor(count / 2 + (i - Math.floor(variations.length / 2))))),
    description: role.description || "",
    variationOverride: role.variationOverride || false,
    roleVariations:
      role.variationOverride && role.roleVariations && role.roleVariations.length > 0
        ? role.roleVariations.map(function (v) {
            return Object.assign({}, v);
          })
        : [],
  }));
}

// 3b. RENAME DETECTOR
// Builds a map of old Figma variable names → new Figma variable names so that
// variables can be renamed in-place rather than deleted and recreated.
//
// Identity is determined by the stable `_id` field on each color and role — not
// by array index.  This means:
//   • Deleting a color and adding a new one at the same slot → different _id → no rename
//   • Shuffling order → same _id at a different index → only renames if the label changed
//   • Items without _id (old snapshots) → skipped entirely → safe no-op fallback
function buildVariableRenameMap(savedAppState, newAppState) {
  if (!savedAppState || !newAppState) {
    return { ramps: {}, contextual: {}, summary: { rampCount: 0, contextualCount: 0, changes: [] } };
  }

  const oldCfg = translateConfig(savedAppState);
  const newCfg = translateConfig(newAppState);
  const oldStepNames = oldCfg.scaleStepNames || seriesMaker(oldCfg.scaleLength);
  const newStepNames = newCfg.scaleStepNames || seriesMaker(newCfg.scaleLength);

  const colorLabels = _mapIdToLabel(savedAppState.colors, newAppState.colors, oldCfg.useShorthandColors, newCfg.useShorthandColors);
  const roleLabels = _mapIdToLabel(savedAppState.roles, newAppState.roles, oldCfg.useShorthandRoles, newCfg.useShorthandRoles);

  const rampRenames = _getRampRenames(colorLabels.pairs, oldStepNames, newStepNames, Math.min(oldCfg.scaleLength, newCfg.scaleLength));
  const contextualRenames = _getContextualRenames(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg);

  return {
    ramps: rampRenames,
    contextual: contextualRenames,
    summary: {
      rampCount: Object.keys(rampRenames).length,
      contextualCount: Object.keys(contextualRenames).length,
      changes: _getSummaryChanges(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg, oldStepNames, newStepNames),
    },
  };
}

function _mapIdToLabel(oldItems, newItems, oldShort, newShort) {
  const getMap = (items, useShort) => {
    const m = {};
    (items || []).forEach((item) => {
      if (item._id) m[item._id] = useShort && item.shorthand ? item.shorthand : item.name;
    });
    return m;
  };
  const oldMap = getMap(oldItems, oldShort);
  const newMap = getMap(newItems, newShort);
  const pairs = Object.entries(newMap)
    .filter(([id]) => oldMap[id] !== undefined)
    .map(([id, ncl]) => ({ oldLabel: oldMap[id], newLabel: ncl }));
  return { oldMap, newMap, pairs };
}

function _getRampRenames(colorPairs, oldSteps, newSteps, count) {
  const renames = {};
  for (const { oldLabel, newLabel } of colorPairs) {
    for (let i = 0; i < count; i++) {
      if (oldSteps[i] === undefined || newSteps[i] === undefined) continue;
      const oldN = `${oldLabel}/${oldSteps[i]}`;
      const newN = `${newLabel}/${newSteps[i]}`;
      if (oldN !== newN) renames[oldN] = newN;
    }
  }
  return renames;
}

function _getContextualRenames(colorPairs, rolePairs, oldCfg, newCfg) {
  const renames = {};
  const varCount = Math.min((oldCfg.variations || []).length, (newCfg.variations || []).length);
  const oldRoleSteps = (oldCfg.variations || []).map(function (v, i) {
    return oldCfg.useShorthandVariations && v && v.shorthand ? v.shorthand : (v && v.name) || String(i);
  });
  const newRoleSteps = (newCfg.variations || []).map(function (v, i) {
    return newCfg.useShorthandVariations && v && v.shorthand ? v.shorthand : (v && v.name) || String(i);
  });
  const oldTG = oldCfg.variableStructure || "color";
  const newTG = newCfg.variableStructure || "color";

  for (const cp of colorPairs) {
    for (const rp of rolePairs) {
      for (let vi = 0; vi < varCount; vi++) {
        const oldStep = oldRoleSteps[vi];
        const newStep = newRoleSteps[vi];
        const oldName = oldTG === "role" ? `${rp.oldLabel}/${cp.oldLabel}/${oldStep}` : `${cp.oldLabel}/${rp.oldLabel}/${oldStep}`;
        const newName = newTG === "role" ? `${rp.newLabel}/${cp.newLabel}/${newStep}` : `${cp.newLabel}/${rp.newLabel}/${newStep}`;
        if (oldName !== newName) renames[oldName] = newName;
      }
    }
  }
  return renames;
}

function _getSummaryChanges(colorPairs, rolePairs, oldCfg, newCfg, oldSteps, newSteps) {
  const changes = [];
  colorPairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "color", from: p.oldLabel, to: p.newLabel });
  });
  rolePairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "role", from: p.oldLabel, to: p.newLabel });
  });

  const sample = (s) => s.slice(0, 3).join(",") + (s.length > 3 ? "…" : "");
  if (sample(oldSteps) !== sample(newSteps)) changes.push({ type: "stepNames", from: sample(oldSteps), to: sample(newSteps) });
  if (oldCfg.variableStructure !== newCfg.variableStructure) changes.push({ type: "grouping", from: oldCfg.variableStructure, to: newCfg.variableStructure });

  return changes;
}
