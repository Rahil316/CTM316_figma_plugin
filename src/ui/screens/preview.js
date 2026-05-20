/**
 * ============================================================================
 * CTM316 SCREEN: PREVIEW
 * Renders the tonal scale + theme token swatches in the preview panel.
 * Also owns the dynamic theme tab bar.
 * ============================================================================
 */

function useWhiteLabel(hex) {
  const lum = relLum(normalizeHex(hex) || "#888888");
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05;
}

const schedulePreview = debounce(() => {
  if (document.getElementById("preview-screen").classList.contains("hidden")) return;
  try {
    const result = variableMaker(translateConfig(appState));
    renderPreviewPanel(result);
  } catch (err) {
    console.error("Preview render failed:", err);
  }
}, 500);

function renderPreviewPanel(result) {
  const themes = appState.themes || [];

  const colorEl = document.getElementById("preview-colors");
  colorEl.innerHTML = "";
  if (Object.keys(result.tonalScales).length === 0) {
    colorEl.innerHTML = `<p class="text-[12px] text-[var(--text-muted)] px-1 py-4 text-center">No tonal scale in Adaptive Engine mode. Colors are solved directly per variation target.</p>`;
  } else {
    const themeKeys = themes.map((t) => t.name.toLowerCase());
    for (const [colorName, ramp] of Object.entries(result.tonalScales)) {
      const colorEntry = appState.colors.find((c) => c.name === colorName);
      const srcHex = "#" + (colorEntry ? colorEntry.value.replace(/^#/, "") : "888888");
      const colorIdx = appState.colors.findIndex((c) => c.name === colorName);

      const hexDisplay = el("span", { class: "text-[12px] font-bold font-mono" });
      const numDisplay = el("span", { class: "text-[11px] text-[var(--text-muted)] font-mono" });
      const infoDisplay = el("span", { class: "ml-auto text-[10px] text-[var(--text-muted)]" });

      const pickerInput = el("input", {
        type: "color",
        value: srcHex,
        class: "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
        oninput: (e) => {
          const clean = e.target.value.replace("#", "").toUpperCase();
          if (colorIdx >= 0) {
            updateGroup(colorIdx, "value", clean);
            swatchDiv.style.background = "#" + clean;
          }
        },
        title: "Click to edit color",
      });
      const swatchDiv = el("div", {
        class: "size-8 rounded-md shrink-0",
        style: `background:${srcHex}`,
        title: "Click to edit source color",
      });
      const swatchWrap = el("div", { class: "relative size-6 shrink-0 cursor-pointer", title: "Click to edit color" }, [pickerInput, swatchDiv]);

      const spectrum = el("div", {
        class: "col-span-3 flex w-full h-20 rounded-[10px] overflow-hidden cursor-crosshair",
        style: "box-shadow:0 10px 30px #0000001f;border:1px solid #8888881A",
      });

      for (const [weight, data] of Object.entries(ramp)) {
        const labelEl = el(
          "div",
          {
            class: "absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
            style: `color:${useWhiteLabel(data.value) ? "#fff" : "#000"}`,
          },
          [el("span", { class: "text-[12px] font-bold leading-none" }, weight), el("span", { class: "text-[14px] font-mono leading-none opacity-80" }, data.value)],
        );
        const step = el(
          "div",
          {
            class: "preview-swatch group relative flex-1 h-full hover:flex-[4] hover:z-10 hover:rounded-[8px] transition-all cursor-pointer",
            style: `background:${data.value}`,
            title: `${weight} · ${data.value} — click to copy`,
            onclick: () => {
              copyToClipboard(data.value);
              ToastManager.success(`Copied ${data.value}`);
            },
          },
          [labelEl],
        );
        step.onmouseenter = () => {
          hexDisplay.textContent = data.value;
          hexDisplay.style.color = data.value;
          numDisplay.textContent = weight;
          const ratios = themeKeys
            .map((k) => (data.contrast[k] ? `${k}: ${data.contrast[k].ratio}` : ""))
            .filter(Boolean)
            .join(" · ");
          infoDisplay.textContent = ratios;
        };
        spectrum.appendChild(step);
      }

      const section = el("div", { class: "grid items-center gap-2 mb-3", style: "grid-template-columns:28px 1fr auto;grid-template-rows:28px auto" }, [
        swatchWrap,
        el("div", { class: "text-[12px] font-bold text-[var(--text-primary)]" }, colorName),
        el("div", { class: "flex items-center gap-2" }, [numDisplay, hexDisplay, infoDisplay]),
        spectrum,
      ]);
      colorEl.appendChild(section);
    }
  }

  if (appState.includeAlphaTints && appState.includeGlobalColors) {
    const alphaInts = (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v));
    if (alphaInts.length > 0) {
      const alphaSection = el("div", { class: "mb-4 mt-1" }, [
        el("div", { class: "text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] mb-2 px-1" }, "Alpha Tints"),
      ]);
      for (const color of appState.colors) {
        const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const swatches = alphaInts.map((opacity) => {
          const a = (opacity / 100).toFixed(2);
          const rgbaStr = `rgba(${r},${g},${b},${a})`;
          return el("div", {
            class: "flex-1 h-6 rounded cursor-pointer",
            style: `background:${rgbaStr};box-shadow:inset 0 0 0 1px rgba(128,128,128,.2)`,
            title: `${color.name} ${opacity}%\n${rgbaStr}`,
            onclick: () => { copyToClipboard(rgbaStr); ToastManager.success(`Copied ${rgbaStr}`); },
          });
        });
        const strip = el("div", { class: "flex gap-0.5 items-center mb-1.5" }, [
          el("div", { class: "w-16 text-[11px] text-[var(--text-muted)] truncate shrink-0", title: color.name }, color.name),
          ...swatches,
        ]);
        alphaSection.appendChild(strip);
      }
      colorEl.appendChild(alphaSection);
    }
  }

  const panelArea = document.getElementById("preview-theme-panels");
  if (!panelArea) return;
  themes.forEach((theme, i) => {
    const panelId = `preview-theme-panel-${i}`;
    let panel = panelArea.querySelector(`[data-theme-idx="${i}"]`);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "preview-panel preview-theme-panel";
      panel.dataset.themeIdx = i;
      panel.id = panelId;
      panelArea.appendChild(panel);
    } else {
      panel.id = panelId;
    }
    const themeKey = theme.name.toLowerCase();
    const bgHex = normalizeHex(theme.bg) || "#FFFFFF";
    const tokens = result.colorTokens[themeKey] || {};
    renderThemePanel(panel, tokens, bgHex, result);
  });
  panelArea.querySelectorAll(".preview-theme-panel").forEach((p) => {
    if (parseInt(p.dataset.themeIdx) >= themes.length) {
      if (p.classList.contains("active")) {
        const firstTab = document.querySelector("#preview-screen .preview-tab-btn:not(.hidden)");
        document.querySelectorAll("#preview-screen .preview-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll("#preview-content .preview-panel, #preview-theme-panels > div").forEach((q) => q.classList.remove("active"));
        if (firstTab) {
          firstTab.classList.add("active");
          const fallback = document.getElementById(firstTab.dataset.target);
          if (fallback) fallback.classList.add("active");
        }
      }
      p.remove();
    }
  });
}

function renderThemePanel(panelOrId, themeTokens, bgHex, result) {
  const panelEl = typeof panelOrId === "string" ? document.getElementById(panelOrId) : panelOrId;
  panelEl.innerHTML = "";
  panelEl.style.backgroundColor = bgHex || "";

  const bgLum = relLum(bgHex || "#FFFFFF");
  const useWhiteInk = 1.05 / (bgLum + 0.05) >= (bgLum + 0.05) / 0.05;
  const ink = useWhiteInk ? "255,255,255" : "0,0,0";
  const pvText = `rgb(${ink})`;
  const pvMuted = `rgba(${ink},0.55)`;
  const pvBorder = `rgba(${ink},0.15)`;
  const pvHover = `rgba(${ink},0.07)`;
  const pvHoverBorder = `rgba(${ink},0.25)`;
  panelEl.style.setProperty("--pv-text", pvText);
  panelEl.style.setProperty("--pv-muted", pvMuted);
  panelEl.style.setProperty("--pv-border", pvBorder);
  panelEl.style.setProperty("--pv-hover", pvHover);
  panelEl.style.setProperty("--pv-hover-border", pvHoverBorder);

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

    const section = el("div", { class: "mb-4 px-2 pt-2" }, [
      el("div", { class: "flex items-center gap-2 mb-2" }, [el("div", { class: "size-5 rounded-md shrink-0", style: `background:${baseColor}` }), el("div", { class: "text-[12px] font-bold", style: "color:var(--pv-text)" }, colorName)]),
      el("div", { class: "space-y-3" }),
    ]);
    const content = section.querySelector(".space-y-3");

    for (const [roleIdx, variations] of Object.entries(roles)) {
      const rName = (appState.roles[roleIdx] && appState.roles[roleIdx].name) || `Role ${roleIdx}`;
      const grid = el("div", { class: "grid grid-cols-swatches gap-2" });
      const roleGroup = el("div", { class: "mb-2" }, [
        el("div", { class: "flex items-center gap-1 mb-1.5" }, [el("div", { class: "text-[10px] font-extrabold tracking-[0.12em] uppercase", style: "color:var(--pv-muted)" }, rName), el("div", { class: "flex-1 h-px", style: "background:var(--pv-border)" })]),
        grid,
      ]);

      for (const [varKey, token] of Object.entries(variations)) {
        const cData = token.contrast || { ratio: 1, rating: "FAIL" };
        const ratio = typeof cData.ratio === "number" ? cData.ratio.toFixed(1) : String(cData.ratio);
        const swatchInk = useWhiteLabel(token.value) ? "255,255,255" : "0,0,0";
        const swatchText = `rgb(${swatchInk})`;

        const contrastEl = el(
          "div",
          { class: "absolute inset-0 flex items-center justify-center transition-opacity duration-150" },
          [el("span", { class: "text-[14px] font-bold leading-none tabular-nums", style: `color:${swatchText}` }, ratio)],
        );

        const hexEl = el(
          "div",
          {
            class: "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
            style: "opacity:0",
          },
          [el("span", { class: "text-[12px] font-mono leading-none", style: `color:${swatchText}` }, token.value)],
        );

        const nameEl = el("div", { class: "text-[12px] font-medium leading-none text-center", style: "color:var(--pv-muted)" }, varLabel(varKey));

        const swatch = el(
          "div",
          {
            class: "relative rounded-[6px] cursor-pointer transition-all duration-150",
            style: `background:${token.value};height:52px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)`,
            onclick: (e) => {
              const text = e.altKey && token.tknName ? token.tknName : token.value;
              copyToClipboard(text);
              ToastManager.success(`Copied ${text}`);
            },
            onmouseenter: (e) => {
              contrastEl.style.opacity = "0";
              hexEl.style.opacity = "1";
              e.currentTarget.style.boxShadow = `inset 0 0 0 2px rgba(${swatchInk},0.4)`;
            },
            onmouseleave: (e) => {
              contrastEl.style.opacity = "1";
              hexEl.style.opacity = "0";
              e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(128,128,128,.18)";
            },
          },
          [contrastEl, hexEl],
        );

        const card = el("div", { class: "flex flex-col gap-1" }, [swatch, nameEl]);
        grid.appendChild(card);
      }
      content.appendChild(roleGroup);
    }
    panelEl.appendChild(section);
  }
}

// renderPreviewTabs — rebuilds the dynamic theme tabs in the preview header.
// Called on preview open and whenever themes change (add/remove/rename).
function renderPreviewTabs() {
  const tabBar = document.querySelector("#preview-screen .sidebar-tabs");
  if (!tabBar) return;
  tabBar.querySelectorAll(".preview-theme-tab").forEach((b) => b.remove());

  const isAdaptive = appState.pluginMode === "adaptiveEngine";
  const paletteTab = tabBar.querySelector("[data-target='preview-colors']");
  if (paletteTab) paletteTab.classList.toggle("hidden", isAdaptive);

  const themes = appState.themes || [];
  themes.forEach((theme, i) => {
    const panelId = `preview-theme-panel-${i}`;
    const btn = document.createElement("button");
    btn.className = "preview-tab-btn preview-theme-tab";
    btn.dataset.target = panelId;
    btn.textContent = theme.name || `Theme ${i + 1}`;
    tabBar.appendChild(btn);
  });
}
