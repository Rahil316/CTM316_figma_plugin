/**
 * ============================================================================
 * UI PREVIEW RENDERING
 * Logic for generating and displaying the live color preview.
 * ============================================================================
 */

const schedulePreview = debounce(() => {
  if (document.getElementById("preview-overlay").classList.contains("hidden")) return;
  const result = variableMaker(translateConfig(appState));
  renderPreviewPanel(result);
}, 500);

function renderPreviewPanel(result) {
  const lightBgHex = normalizeHex(appState.themes[0].bg) || "#FFFFFF";
  const darkBgHex = normalizeHex(appState.themes[1].bg) || "#000000";

  // Color Ramps Tab
  const colorEl = document.getElementById("preview-colors");
  colorEl.innerHTML = "";
  if (Object.keys(result.tonalScales).length === 0) {
    colorEl.innerHTML = `<p class="text-[12px] text-[var(--text-muted)] px-1 py-4 text-center">No tonal scale in Adaptive Engine mode. Colors are solved directly per variation target.</p>`;
  } else {
    for (const [colorName, ramp] of Object.entries(result.tonalScales)) {
      const baseColor = ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value;
      const section = document.createElement("div");
      section.className = "grid grid-cols-[28px_auto_1fr] grid-rows-[28px_auto] items-center gap-2 mb-2";
      section.innerHTML = `
                <div class="size-6 rounded-md bg-[${baseColor}]"></div>
                <div class="text-[12px] font-bold">${colorName}</div>
                <div class="flex items-center gap-2 text-[12px] font-mono">
                  <span id="spec-num-${colorName}"></span>
                  <span id="spec-hex-${colorName}" class="font-bold"></span>
                  <span id="spec-info-${colorName}" class="ml-auto"></span>
                </div>
                <div id="preview-spectrum" class="col-span-3 flex w-full h-20 rounded-[10px] overflow-hidden [box-shadow:0_10px_30px_#0000001f] border border-[#8888881A] cursor-crosshair"></div>
                `;
      const spectrum = section.querySelector("#preview-spectrum");
      const hexDisplay = section.querySelector(`#spec-hex-${colorName}`);
      const infoDisplay = section.querySelector(`#spec-info-${colorName}`);
      const numDisplay = section.querySelector(`#spec-num-${colorName}`);
      for (const [weight, data] of Object.entries(ramp)) {
        const step = document.createElement("div");
        step.className = `preview-swatch flex-1 h-full hover:flex-[4] hover:z-10 hover:[transform:scaleY(1.15)] hover:rounded-[8px] hover:[box-shadow:0_15px_40px_#00000044]`;
        step.setAttribute("data-copy", data.value);
        step.style.backgroundColor = data.value;
        step.onmouseenter = () => {
          hexDisplay.textContent = data.value;
          numDisplay.textContent = weight;
          infoDisplay.textContent = `☀️ ${data.contrast.light.ratio} | ${data.contrast.dark.ratio} 🌙`;
          hexDisplay.style.color = data.value;
        };
        spectrum.appendChild(step);
      }
      colorEl.appendChild(section);
    }
  }

  // Render Light Theme
  renderThemePanel("preview-light", result.colorTokens.light, lightBgHex, result);
  // Render Dark Theme
  renderThemePanel("preview-dark", result.colorTokens.dark, darkBgHex, result);
}

function renderThemePanel(panelId, themeTokens, bgHex, result) {
  const el = document.getElementById(panelId);
  el.innerHTML = "";

  const varLabel = (varKey) => {
    const i = parseInt(varKey);
    if (!isNaN(i) && appState.variations && appState.variations[i]) {
      return appState.variations[i].name || appState.variations[i].shorthand;
    }
    return varKey;
  };

  for (const [colorName, roles] of Object.entries(themeTokens)) {
    const ramp = result.tonalScales[colorName];
    const srcColor = (appState.colors.find((c) => c.name === colorName) || {}).value || "888888";
    const baseColor = ramp ? ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value : `#${srcColor.replace(/^#/, "")}`;

    const section = document.createElement("div");
    section.className = "mb-4";
    section.innerHTML = `
            <div class="grid grid-cols-[32px_1fr_auto] items-center mb-2">
              <div class="size-6 rounded-md bg-[${baseColor}]"></div>
              <div class="text-[12px] font-bold">${colorName}</div>
            </div>
            <div class="preview-section-content space-y-3"></div>`;

    const content = section.querySelector(".preview-section-content");
    for (const [roleIdx, variations] of Object.entries(roles)) {
      const roleGroup = document.createElement("div");
      roleGroup.className = "mb-2";
      const rName = (appState.roles[roleIdx] && appState.roles[roleIdx].name) || `Role ${roleIdx}`;
      roleGroup.innerHTML = `
              <div class="flex items-center gap-1 mb-2">
                <div class="text-[11px] font-extrabold opacity-40 tracking-[0.15em]">${rName}</div>
                <div class="flex-1 h-px bg-current opacity-10"></div>
              </div>
              <div class="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]"></div>`;

      const grid = roleGroup.querySelector(".grid");
      for (const [varKey, token] of Object.entries(variations)) {
        const swatch = document.createElement("div");
        swatch.className = "group relative p-1.5 rounded-lg border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-input)] transition-all cursor-pointer";
        swatch.onclick = (e) => {
          const text = e.altKey && token.tknName ? token.tknName : token.value;
          copyToClipboard(text);
          BannerManager.success(`Copied ${text}`);
        };

        const cData = token.contrast || { ratio: 1, rating: "FAIL" };
        const ratingColor = cData.ratio >= 4.5 ? "text-green-500" : cData.ratio >= 3 ? "text-orange-500" : "text-red-500";

        swatch.innerHTML = `
                <div class="h-10 rounded-md mb-1.5 shadow-inner border border-black/5" style="background-color: ${token.value}"></div>
                <div class="flex flex-col gap-0.5">
                  <div class="text-[10px] font-bold truncate">${varLabel(varKey)}</div>
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] opacity-60 font-mono">${token.value}</span>
                    <span class="text-[9px] font-bold ${ratingColor}">${cData.ratio}</span>
                  </div>
                </div>`;
        grid.appendChild(swatch);
      }
      content.appendChild(roleGroup);
    }
    el.appendChild(section);
  }
}
