// 3. CONFIG TRANSLATOR: Converts appState (UI format) into the format expected by variableMaker.
function translateConfig(appState) {
  const count = Math.max(1, parseInt(appState.colorSteps) || 23);

  // Weight (step) names — colorStepNames can be a comma-string (plugin) or array (web app export)
  const colorStepRaw = Array.isArray(appState.colorStepNames)
    ? appState.colorStepNames.join(",")
    : appState.colorStepNames || "";
  const userWeightNames = colorStepRaw.trim() ? colorStepRaw.split(",").map((n) => n.trim()) : null;
  let stepNames = null;
  if (userWeightNames && userWeightNames.length > 0) {
    const names = userWeightNames.slice();
    while (names.length < count) names.push(String(names.length + 1));
    stepNames = names.slice(0, count);
  }

  // Role variation display names — roleStepNames can be a comma-string (plugin) or array (web app export)
  const roleStepRaw = Array.isArray(appState.roleStepNames)
    ? appState.roleStepNames.join(",")
    : appState.roleStepNames || "";
  const userVarNames = roleStepRaw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaultVarNames = ["weakest", "weak", "base", "strong", "stronger"];
  const roleStepNames = defaultVarNames.map((def, i) => userVarNames[i] || def);

  // themes array → light/dark backgrounds
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];

  return {
    name: appState.name || "ctm316",
    colors: (appState.colors || []).map((g) => ({
      name: g.name,
      shortName: g.shortName,
      value: g.value,
      solverMode: g.solverMode || "natural",
    })),
    roles: (appState.roles || []).map((role) => ({
      name: role.name,
      shortName: role.shortName || role.name.substring(0, 2).toLowerCase(),
      minContrast: String(role.minContrast !== undefined ? role.minContrast : "4.5"),
      spread: Math.max(1, parseInt(role.spread) || 1),
      baseIndex: role.baseIndex !== undefined ? parseInt(role.baseIndex) : Math.floor(count / 2),
      darkBaseIndex: role.darkBaseIndex !== undefined ? parseInt(role.darkBaseIndex) : undefined,
      baseContrast:   parseFloat(role.baseContrast) || 4.5,
      contrastGap:    parseFloat(role.contrastGap)  || 1.5,
      useContrastGap: !!role.useContrastGap,
      variations: role.variations || { weakest: 1.5, weak: 3.0, base: 4.5, strong: 7.0, stronger: 12.0 },
    })),
    colorSteps: count,
    rampType: appState.rampType || "Natural",
    roleMapping: appState.roleMapping || "Contrast Based",
    colorStepNames: stepNames,
    roleStepNames,
    themes: [
      { name: "light", bg: themes[0].bg || "FFFFFF" },
      { name: "dark", bg: themes[1].bg || "000000" },
    ],
    skipColorRamps: appState.skipColorRamps || false,
    tokenGrouping: appState.tokenGrouping || "color",
    useShortColorNames: appState.useShortColorNames || false,
    useShortRoleNames: appState.useShortRoleNames || false,
  };
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

  const REF_VAR_KEYS = ["weakest", "weak", "base", "strong", "stronger"];
  const oldStepNames = oldCfg.colorStepNames || seriesMaker(oldCfg.colorSteps);
  const newStepNames = newCfg.colorStepNames || seriesMaker(newCfg.colorSteps);
  const oldRoleSteps = oldCfg.roleStepNames || REF_VAR_KEYS;
  const newRoleSteps = newCfg.roleStepNames || REF_VAR_KEYS;
  const stepCount = Math.min(oldCfg.colorSteps, newCfg.colorSteps);
  const oldTG = oldCfg.tokenGrouping || "color";
  const newTG = newCfg.tokenGrouping || "color";

  // Build _id → display-label maps for each side.
  // Items without _id are excluded — index-based guessing is not safe.
  function makeIdLabelMap(items, useShort) {
    const m = {};
    for (const item of items) {
      if (!item._id) continue;
      m[item._id] = (useShort && item.shortName) ? item.shortName : item.name;
    }
    return m;
  }

  const savedColorLabels = makeIdLabelMap(savedAppState.colors || [], oldCfg.useShortColorNames);
  const newColorLabels   = makeIdLabelMap(newAppState.colors  || [], newCfg.useShortColorNames);
  const savedRoleLabels  = makeIdLabelMap(savedAppState.roles  || [], oldCfg.useShortRoleNames);
  const newRoleLabels    = makeIdLabelMap(newAppState.roles   || [], newCfg.useShortRoleNames);

  // Compute matched pairs: items present in BOTH snapshots with the same _id.
  // Only matched pairs can be renamed; everything else is a new create or an orphan.
  const colorPairs = []; // { ocl: oldLabel, ncl: newLabel }
  for (const [id, ncl] of Object.entries(newColorLabels)) {
    const ocl = savedColorLabels[id];
    if (ocl !== undefined) colorPairs.push({ ocl, ncl });
  }

  const rolePairs = []; // { orl: oldLabel, nrl: newLabel }
  for (const [id, nrl] of Object.entries(newRoleLabels)) {
    const orl = savedRoleLabels[id];
    if (orl !== undefined) rolePairs.push({ orl, nrl });
  }

  // NOTE: reordering variables in Figma is not supported by the Plugin API
  // (VariableCollection.variableIds is readonly). Display order reflects creation
  // order only. Reordering in the plugin UI updates values correctly but does not
  // change visual order in the Figma Variables panel — accepted limitation.

  const rampRenames = {};
  const contextualRenames = {};

  // Color ramp renames: every matched color × every step position
  for (const { ocl, ncl } of colorPairs) {
    for (let si = 0; si < stepCount; si++) {
      const oldStep = oldStepNames[si];
      const newStep = newStepNames[si];
      if (oldStep === undefined || newStep === undefined) continue;
      const oldName = `${ocl}/${oldStep}`;
      const newName = `${ncl}/${newStep}`;
      if (oldName !== newName) rampRenames[oldName] = newName;
    }
  }

  // Contextual token renames: every matched color × every matched role × every variation step
  for (const { ocl, ncl } of colorPairs) {
    for (const { orl, nrl } of rolePairs) {
      for (let vi = 0; vi < 5; vi++) {
        const oldStep = oldRoleSteps[vi] || REF_VAR_KEYS[vi];
        const newStep = newRoleSteps[vi] || REF_VAR_KEYS[vi];
        const oldName = oldTG === "role" ? `${orl}/${ocl}/${oldStep}` : `${ocl}/${orl}/${oldStep}`;
        const newName = newTG === "role" ? `${nrl}/${ncl}/${newStep}` : `${ncl}/${nrl}/${newStep}`;
        if (oldName !== newName) contextualRenames[oldName] = newName;
      }
    }
  }

  // Human-readable change list for the UI (de-duped)
  const changes = [];
  for (const { ocl, ncl } of colorPairs) {
    if (ocl !== ncl) changes.push({ type: "color", from: ocl, to: ncl });
  }
  for (const { orl, nrl } of rolePairs) {
    if (orl !== nrl) changes.push({ type: "role", from: orl, to: nrl });
  }
  const oldStepSample = oldStepNames.slice(0, 3).join(",");
  const newStepSample = newStepNames.slice(0, 3).join(",");
  if (oldStepSample !== newStepSample) {
    changes.push({ type: "stepNames", from: oldStepSample + (stepCount > 3 ? "…" : ""), to: newStepSample + (stepCount > 3 ? "…" : "") });
  }
  const oldRSample = oldRoleSteps.join(",");
  const newRSample = newRoleSteps.join(",");
  if (oldRSample !== newRSample) changes.push({ type: "roleStepNames", from: oldRSample, to: newRSample });
  if (oldTG !== newTG) changes.push({ type: "grouping", from: oldTG, to: newTG });

  return {
    ramps: rampRenames,
    contextual: contextualRenames,
    summary: {
      rampCount: Object.keys(rampRenames).length,
      contextualCount: Object.keys(contextualRenames).length,
      changes,
    },
  };
}
