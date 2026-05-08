// 5. FIGMA VARIABLE API (CRUD)
const VariableManager = {
  tally: { created: 0, updated: 0, renamed: 0, failed: 0 },
  cache: { variables: [], collections: [] },
  rampVarNameMap: {}, // stepName ("primary-1") → figma variable name ("primary/1")

  // Renames variables in a collection according to a { oldName: newName } map.
  // Two-pass strategy handles chain renames (A→B when B is being renamed to C).
  async applyRenames(collection, renameMap) {
    if (!collection || !renameMap || Object.keys(renameMap).length === 0) return 0;
    let renamed = 0;
    const colVars = this.cache.variables.filter(
      (v) => v.variableCollectionId === collection.id && v.name !== "__ctm316_config__"
    );
    const occupiedNames = new Set(colVars.map((v) => v.name));

    for (let pass = 0; pass < 2; pass++) {
      for (const variable of colVars) {
        const newName = renameMap[variable.name];
        if (!newName || newName === variable.name) continue;
        if (occupiedNames.has(newName)) continue; // target name still in use; retry next pass
        try {
          occupiedNames.delete(variable.name);
          variable.name = newName;
          occupiedNames.add(newName);
          renamed++;
        } catch (_) {}
      }
    }

    this.tally.renamed += renamed;
    return renamed;
  },

  async sync(result, config, scope = "all", appState = null, savedAppState = null) {
    this.tally = { created: 0, updated: 0, renamed: 0, failed: 0 };
    this.rampVarNameMap = {};
    await this.refreshCache();

    // Build rename maps: position-matched items that only changed names get renamed
    // silently instead of being deleted and recreated.
    const renameMap = (savedAppState && appState)
      ? buildVariableRenameMap(savedAppState, appState)
      : { ramps: {}, contextual: {} };

    const colorName = (appState && appState.colorsCollectionName) || "_Colors";
    const contextualName = (appState && appState.contextualCollectionName) || "contextual";
    const skipRamps = config.skipColorRamps || config.pluginMode === "direct";
    const tokenGrouping = config.tokenGrouping || "color";
    const useShortColor = config.useShortColorNames || false;
    const useShortRole = config.useShortRoleNames || false;

    // Helper: resolve display label for color/role names
    const colorLabel = (name) => {
      if (!useShortColor) return name;
      const col = config.colors.find((c) => c.name === name);
      return (col && col.shortName) || name;
    };
    const roleLabel = (name, roleIdx) => {
      if (!useShortRole) return name;
      const role = config.roles[roleIdx];
      return (role && role.shortName) || name;
    };

    // Build tknRef → Figma variable name map using the same naming as stage 1
    for (const [colorName, ramp] of Object.entries(result.colorRamps)) {
      for (const [weightName, entry] of Object.entries(ramp)) {
        this.rampVarNameMap[entry.stepName] = `${colorLabel(colorName)}/${weightName}`;
      }
    }

    const roleStepNames = config.roleStepNames || REF_VARIATION_KEYS;

    // Fetch ramps collection once — used by both stages when applicable.
    // scope="roles" skips Stage 1 but Stage 2 still needs rampsCol to resolve variable aliases
    // (unless skipColorRamps is true, in which case raw hex values are used directly).
    const needsRampsCol = !skipRamps && (scope === "all" || scope === "groups" || scope === "roles");
    const rampsCol = needsRampsCol ? await this.getOrCreateCollection(colorName) : null;

    // Apply ramp renames before upserting so the cache reflects new names immediately
    if (rampsCol && renameMap.ramps && Object.keys(renameMap.ramps).length > 0) {
      await this.applyRenames(rampsCol, renameMap.ramps);
    }

    // STAGE 1: Color Ramps → color collection (skipped when skipColorRamps is true)
    if (rampsCol && (scope === "all" || scope === "groups")) {
      const modeId = rampsCol.modes[0].modeId;
      const allRampVars = [];
      for (const [colorName, ramp] of Object.entries(result.colorRamps)) {
        const cLabel = colorLabel(colorName);
        for (const [weightName, entry] of Object.entries(ramp)) {
          allRampVars.push([`${cLabel}/${weightName}`, "COLOR", entry.value, `L:${entry.contrast.light.ratio}(${entry.contrast.light.rating}) D:${entry.contrast.dark.ratio}(${entry.contrast.dark.rating})`]);
        }
      }
      await this.upsertVariables(rampsCol, modeId, allRampVars);
    }

    // STAGE 2: Semantic Role Tokens → contextual collection
    if (scope === "all" || scope === "roles") {
      const contextualCol = await this.getOrCreateCollection(contextualName);

      // Apply contextual token renames before upserting
      if (renameMap.contextual && Object.keys(renameMap.contextual).length > 0) {
        await this.applyRenames(contextualCol, renameMap.contextual);
      }

      const skippedModes = [];
      for (const theme of ["light", "dark"]) {
        const modeId = this.ensureMode(contextualCol, theme);
        if (modeId === null) {
          skippedModes.push(theme);
          continue;
        }
        for (const [colorName, roles] of Object.entries(result.colorTokens[theme])) {
          for (const [roleId, variations] of Object.entries(roles)) {
            const rName = (config.roles[roleId] && config.roles[roleId].name) || roleId;
            const cLabel = colorLabel(colorName);
            const rLabel = roleLabel(rName, parseInt(roleId));
            const vars = REF_VARIATION_KEYS.map((refKey, i) => {
              const token = variations[refKey];
              if (!token) return null;
              const dispName = roleStepNames[i] || refKey;
              const figmaName = tokenGrouping === "role" ? `${rLabel}/${cLabel}/${dispName}` : `${cLabel}/${rLabel}/${dispName}`;
              let value;
              if (skipRamps) {
                value = token.value;
              } else {
                const rampFigmaName = this.rampVarNameMap[token.tknRef];
                const targetVar = (rampFigmaName && rampsCol)
                  ? this.cache.variables.find((cv) => cv.name === rampFigmaName && cv.variableCollectionId === rampsCol.id)
                  : null;
                value = targetVar ? { type: "VARIABLE_ALIAS", id: targetVar.id } : token.value;
              }
              const note = token.isAdjusted ? " | ⚠ Adjusted" : "";
              return [figmaName, "COLOR", value, `${theme.toUpperCase()}${note}`];
            }).filter(Boolean);
            await this.upsertVariables(contextualCol, modeId, vars);
          }
        }
      }
      if (skippedModes.length > 0) {
        figma.ui.postMessage({
          type: "warning",
          message: `The "${contextualName}" collection is missing the ${skippedModes.join(" and ")} mode(s). Multiple modes per collection require a paid Figma plan.`
        });
      }
    }

    // Persist config so the plugin can restore state on next launch
    if (appState) {
      await this.saveConfig(appState, colorName);
    }

    figma.ui.postMessage({ type: "finish", tally: this.tally, errors: result ? result.errors : null });
  },

  async saveConfig(appState, colorName) {
    try {
      const targetName = appState.skipColorRamps ? appState.contextualCollectionName || "contextual" : colorName;
      const targetCol = await this.getOrCreateCollection(targetName);
      const modeId = targetCol.modes[0].modeId;

      // Remove any stale copies of __ctm316_config__ in other collections to avoid
      // ambiguous restore on next launch when skipColorRamps has been toggled.
      for (const v of this.cache.variables) {
        if (v.name === "__ctm316_config__" && v.variableCollectionId !== targetCol.id) {
          try { v.remove(); } catch (_) {}
        }
      }
      this.cache.variables = this.cache.variables.filter(
        (v) => !(v.name === "__ctm316_config__" && v.variableCollectionId !== targetCol.id)
      );

      let cfgVar = this.cache.variables.find((v) => v.name === "__ctm316_config__" && v.variableCollectionId === targetCol.id);
      if (!cfgVar) {
        cfgVar = figma.variables.createVariable("__ctm316_config__", targetCol, "STRING");
        this.cache.variables.push(cfgVar);
      }
      cfgVar.setValueForMode(modeId, JSON.stringify(appState));
    } catch (_) {}
  },

  async refreshCache() {
    this.cache.variables = await figma.variables.getLocalVariablesAsync();
    this.cache.collections = await figma.variables.getLocalVariableCollectionsAsync();
  },

  async getOrCreateCollection(name) {
    const existing = this.cache.collections.find((c) => c.name === name);
    if (existing) return existing;
    const newCol = figma.variables.createVariableCollection(name);
    this.cache.collections.push(newCol);
    return newCol;
  },

  ensureMode(collection, modeName) {
    const existing = collection.modes.find((m) => m.name.toLowerCase() === modeName.toLowerCase());
    if (existing) return existing.modeId;
    if (collection.modes.length === 1 && collection.modes[0].name.toLowerCase().startsWith("mode")) {
      collection.renameMode(collection.modes[0].modeId, modeName);
      return collection.modes[0].modeId;
    }
    try {
      return collection.addMode(modeName);
    } catch (_e) {
      // addMode fails on Figma free plan (only 1 mode allowed per collection).
      // Return null so the caller can skip writing rather than corrupting the wrong mode.
      return null;
    }
  },

  async upsertVariables(collection, modeId, vars) {
    for (const [varName, varType, varValue, varDescription] of vars) {
      try {
        let variable = this.cache.variables.find((v) => v.name === varName && v.variableCollectionId === collection.id);
        if (!variable) {
          variable = figma.variables.createVariable(varName, collection, varType);
          this.cache.variables.push(variable);
          this.tally.created++;
        } else {
          this.tally.updated++;
        }
        if (varDescription) variable.description = varDescription;
        if (varValue !== undefined && varValue !== null) {
          if (varType === "COLOR" && typeof varValue === "string") {
            variable.setValueForMode(modeId, hexToFigmaRgb(varValue));
          } else {
            variable.setValueForMode(modeId, varValue);
          }
        }
      } catch (_err) {
        console.error("Failed to upsert variable:", varName, _err);
        this.tally.failed++;
      }
    }
  },
};

// Converts hex to Figma's { r, g, b } (0–1 range). Lives here because it bridges color math and Figma API.
// Converts a hex string to Figma's { r, g, b } format (0–1 range).
function hexToFigmaRgb(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { r: 0, g: 0, b: 0 };
  return { r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 };
}
