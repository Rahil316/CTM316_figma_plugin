// 5. FIGMA VARIABLE API (CRUD)
const VariableManager = {
  tally: { created: 0, updated: 0, renamed: 0, failed: 0 },
  cache: { variables: [], collections: [] },
  rampVarNameMap: {}, // entry.stepName (e.g. "Primary-18") → Figma variable path (e.g. "Primary/18")

  // Renames variables in a collection according to a { oldName: newName } map.
  // Two-pass strategy handles chain renames (A→B when B is being renamed to C).
  async applyRenames(collection, renameMap) {
    if (!collection || !renameMap || Object.keys(renameMap).length === 0) return 0;
    let renamed = 0;
    const colVars = this.cache.variables.filter((v) => v.variableCollectionId === collection.id);
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
        } catch (e) {
          console.warn("Rename failed for variable:", variable.name, e);
        }
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
    const renameMap = savedAppState && appState ? buildVariableRenameMap(savedAppState, appState) : { ramps: {}, contextual: {} };

    const rampCollectionName = (appState && appState.tonalScaleCollectionName) || "_scale";
    const contextualName = (appState && appState.tokenCollectionName) || "contextual";
    const skipRamps = config.embedDirectly || config.pluginMode === "adaptiveEngine" || config.includeTonalCollection === false;
    const tokenNameOrder = config.tokenNameOrder || (config.variableStructure === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
    const useShortColor = config.useShorthandColors || false;
    const useShortRole = config.useShorthandRoles || false;
    const useShortStep = config.useShorthandSteps || false;
    const stepShorthands = config.scaleStepShorthands || {};

    // Helper: resolve display label for color/role/step names
    const colorLabel = (name) => {
      if (!useShortColor) return name;
      const col = config.colors.find((c) => c.name === name);
      return (col && col.shorthand) || name;
    };
    const roleLabel = (name, roleIdx) => {
      if (!useShortRole) return name;
      const role = config.roles[roleIdx];
      return (role && role.shorthand) || name;
    };
    const stepLabel = (name) => (useShortStep && stepShorthands[name]) ? stepShorthands[name] : name;

    // Build tknRef → Figma variable name map using the same naming as stage 1
    for (const [colorName, ramp] of Object.entries(result.tonalScales)) {
      for (const [weightName, entry] of Object.entries(ramp)) {
        this.rampVarNameMap[entry.stepName] = `${colorLabel(colorName)}/${stepLabel(weightName)}`;
      }
    }

    // Fetch ramps collection once — used by both stages when applicable.
    // scope="roles" skips Stage 1 but Stage 2 still needs rampsCol to resolve variable aliases
    // (unless embedDirectly is true, in which case raw hex values are used directly).
    const needsRampsCol = !skipRamps && (scope === "all" || scope === "groups" || scope === "roles");
    const rampsCol = needsRampsCol ? await this.getOrCreateCollection(rampCollectionName) : null;

    // Apply ramp renames before upserting so the cache reflects new names immediately
    if (rampsCol && renameMap.ramps && Object.keys(renameMap.ramps).length > 0) {
      await this.applyRenames(rampsCol, renameMap.ramps);
    }

    // STAGE 1: Tonal Scale → scale collection (skipped when embedDirectly is true)
    if (rampsCol && (scope === "all" || scope === "groups")) {
      const modeId = rampsCol.modes[0].modeId;
      const include = config.includeDescriptions !== false;
      const allRampVars = [];

      for (const [colorName, ramp] of Object.entries(result.tonalScales)) {
        const cLabel = colorLabel(colorName);
        for (const [weightName, entry] of Object.entries(ramp)) {
          const contrastNote = include ? `L:${entry.contrast.light.ratio}(${entry.contrast.light.rating}) D:${entry.contrast.dark.ratio}(${entry.contrast.dark.rating})` : "";
          const groupDesc = include ? entry.description : "";
          const fullDesc = groupDesc && contrastNote ? `${groupDesc} | ${contrastNote}` : groupDesc || contrastNote;
          allRampVars.push([`${cLabel}/${stepLabel(weightName)}`, "COLOR", entry.value, fullDesc]);
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
      for (const theme of Object.keys(result.colorTokens || {})) {
        const modeId = this.ensureMode(contextualCol, theme);
        if (modeId === null) {
          skippedModes.push(theme);
          continue;
        }
        for (const [colorName, roles] of Object.entries(result.colorTokens[theme])) {
          for (const [roleId, variations] of Object.entries(roles)) {
            const roleObj = config.roles[roleId] || {};
            const rName = roleObj.name || roleId;
            const cLabel = colorLabel(colorName);
            const rLabel = roleLabel(rName, parseInt(roleId));
            const vars = config.variations
              .map((varDef, i) => {
                const token = variations[String(i)];
                if (!token) return null;
                const dispName = varDef.shorthand || varDef.name;
                const segParts = { color: cLabel, role: rLabel, variation: dispName };
                const figmaName = tokenNameOrder.map((s) => segParts[s] || s).join("/");
                let value;
                if (skipRamps) {
                  value = token.value;
                } else {
                  const rampFigmaName = this.rampVarNameMap[token.tknRef];
                  const targetVar = rampFigmaName && rampsCol ? this.cache.variables.find((cv) => cv.name === rampFigmaName && cv.variableCollectionId === rampsCol.id) : null;
                  value = targetVar ? { type: "VARIABLE_ALIAS", id: targetVar.id } : token.value;
                }
                const include = config.includeDescriptions !== false;
                const note = include && token.isAdjusted ? " | ⚠ Adjusted" : "";
                const themeNote = include ? theme.toUpperCase() : "";
                const roleDesc = include ? token.roleDescription : "";

                let fullDesc = "";
                if (roleDesc && themeNote) fullDesc = `${roleDesc} | ${themeNote}${note}`;
                else if (roleDesc) fullDesc = roleDesc;
                else if (themeNote) fullDesc = `${themeNote}${note}`;

                return [figmaName, "COLOR", value, fullDesc];
              })
              .filter(Boolean);
            await this.upsertVariables(contextualCol, modeId, vars);
          }
        }
      }
      if (skippedModes.length > 0) {
        figma.ui.postMessage({
          type: "warning",
          message: `The "${contextualName}" token collection is missing the ${skippedModes.join(" and ")} mode(s). Multiple modes per collection require a paid Figma plan.`,
        });
      }
    }

    // STAGE 3: Global Colors collection — raw brand hex values, no themes
    if (config.includeGlobalColors) {
      await this.syncGlobalColors(config);
    }

    // Persist config so the plugin can restore state on next launch
    if (appState) savePluginConfig(appState);

    figma.ui.postMessage({ type: "finish", tally: this.tally, errors: result ? result.errors : null, result });
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

  async syncGlobalColors(config) {
    const colName = config.globalColorsCollectionName || "_constants";
    const col = await this.getOrCreateCollection(colName);
    const modeId = col.modes[0].modeId;

    const vars = [];
    for (const color of config.colors) {
      const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
      const label = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
      const include = config.includeDescriptions !== false;
      const groupDesc = include ? color.description || "Brand constant — raw hex, no theme processing" : "";
      vars.push([`${label}/${label}`, "COLOR", hex, groupDesc]);

      if (config.includeAlphaTints && config.alphaValues.length > 0) {
        const rgb = hexToFigmaRgb(hex);
        for (const opacityInt of config.alphaValues) {
          const alpha = opacityInt / 100;
          const varName = `${label}/Opacities/${opacityInt}`;
          try {
            let variable = this.cache.variables.find((v) => v.name === varName && v.variableCollectionId === col.id);
            if (!variable) {
              variable = figma.variables.createVariable(varName, col, "COLOR");
              this.cache.variables.push(variable);
              this.tally.created++;
            } else {
              this.tally.updated++;
            }
            variable.description = `${opacityInt}% opacity variant`;
            variable.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha });
          } catch (_err) {
            this.tally.failed++;
          }
        }
      }
    }
    await this.upsertVariables(col, modeId, vars);
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

// Figma expects color channels in 0–1 range, not 0–255.
function hexToFigmaRgb(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { r: 0, g: 0, b: 0 };
  return { r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 };
}

// Stored on the document (not clientStorage) so config travels with the Figma file.
function savePluginConfig(appState) {
  try {
    figma.root.setPluginData("ctm316_state", JSON.stringify(appState));
  } catch (e) {
    console.warn("savePluginConfig failed:", e);
  }
}
