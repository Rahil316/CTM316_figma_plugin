/**
 * ============================================================================
 * CTM316 UI COMPONENTS
 * Pure functional templates for building the UI.
 * Transitioning to Node-based generation for better stability and event handling.
 * ============================================================================
 */

const Icons = {
  Trash: `<svg width="14" height="14" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>`,
  More: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8C3 7.44772 3.44772 7 4 7C4.55228 7 5 7.44772 5 8C5 8.55228 4.55228 9 4 9C3.44772 9 3 8.55228 3 8ZM7 8C7 7.44772 7.44772 7 8 7C8.55229 7 9 7.44772 9 8C9 8.55228 8.55229 9 8 9C7.44772 9 7 8.55228 7 8ZM11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8Z"/></svg>`,
  Import: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12.5 8.5C12.5 7.94772 12.0523 7.5 11.5 7.5V11.5C11.5 12.6046 10.6046 13.5 9.5 13.5H5.5C5.5 14.0523 5.94772 14.5 6.5 14.5H11.5C12.0523 14.5 12.5 14.0523 12.5 13.5V8.5ZM6.5 1C6.5 0.723858 6.72386 0.5 7 0.5C7.27614 0.5 7.5 0.723858 7.5 1V8.29297L8.64648 7.14648C8.84175 6.95122 9.15825 6.95122 9.35352 7.14648C9.54878 7.34175 9.54878 7.65825 9.35352 7.85352L7.35352 9.85352C7.25975 9.94728 7.13261 10 7 10C6.86739 10 6.74025 9.94728 6.64648 9.85352L4.64648 7.85352C4.45122 7.65825 4.45122 7.34175 4.64648 7.14648C4.84175 6.95122 5.15825 6.95122 5.35352 7.14648L6.5 8.29297V1ZM13.5 13.5C13.5 14.6046 12.6046 15.5 11.5 15.5H6.5C5.39543 15.5 4.5 14.6046 4.5 13.5C3.39543 13.5 2.5 12.6046 2.5 11.5V6.5C2.5 5.39543 3.39543 4.5 4.5 4.5H5C5.27614 4.5 5.5 4.72386 5.5 5C5.5 5.27614 5.27614 5.5 5 5.5H4.5C3.94772 5.5 3.5 5.94772 3.5 6.5V11.5C3.5 12.0523 3.94772 12.5 4.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6.5C10.5 5.94772 10.0523 5.5 9.5 5.5H9C8.72386 5.5 8.5 5.27614 8.5 5C8.5 4.72386 8.72386 4.5 9 4.5H9.5C10.6046 4.5 11.5 5.39543 11.5 6.5C12.6046 6.5 13.5 7.39543 13.5 8.5V13.5Z" fill="currentColor"/></svg>`,
  Preview: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  Run: `<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 3.76846C3 2.8177 4.01933 2.215 4.8524 2.67319L12.5461 6.90474C13.4096 7.37964 13.4096 8.62037 12.5461 9.09527L4.8524 13.3268C4.01933 13.785 3 13.1823 3 12.2316V3.76846Z" fill="white"/></svg>`,
  Settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  Check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  Save: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  Code: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  File: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
  Layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  Close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  Upload: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  TrashLarge: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
};

/**
 * Helper to create elements with attributes, event listeners, and children.
 */
const el = (tag, attrs = {}, children = []) => {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (key === "className" || key === "class") element.className = val;
    else if (key === "dataset") Object.assign(element.dataset, val);
    else if (key.startsWith("on") && typeof val === "function") {
      element.addEventListener(key.substring(2).toLowerCase(), val);
    } else if (key === "style" && typeof val === "object") Object.assign(element.style, val);
    else if (key === "disabled") {
      if (val) element.setAttribute("disabled", "");
      else element.removeAttribute("disabled");
    } else element.setAttribute(key, val);
  });
  const childrenArray = Array.isArray(children) ? children : [children];
  childrenArray.forEach((child) => {
    if (!child) return;
    if (typeof child === "string" || typeof child === "number") {
      const str = String(child);
      if (str.trim().startsWith("<")) {
        const temp = document.createElement("div");
        temp.innerHTML = str;
        while (temp.firstChild) element.appendChild(temp.firstChild);
      } else {
        element.appendChild(document.createTextNode(str));
      }
    } else {
      element.appendChild(child);
    }
  });
  return element;
};

const inputsUI = {
  // Dashed "add" call-to-action button.
  actionButton: (label, onClick, icon = null) =>
    el(
      "button",
      {
        class: "w-full h-10 px-4 mb-2 bg-transparent text-[var(--accent)] border-2 border-dashed border-[var(--accent)] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2",
        onclick: onClick,
      },
      [icon ? el("span", { class: "flex items-center justify-center" }, icon) : null, el("span", {}, label)],
    ),

  // Text/number input with optional label above.
  input: (attrs = {}, label = null) => {
    const id = attrs.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const input = el("input", {
      class: "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]",
      id: id,
      ...attrs,
    });
    if (!label) return input;
    return el("div", { class: "space-y-1 flex-1" }, [el("label", { for: id, class: "text-[var(--text-muted)] text-[12px] font-medium block ml-1" }, label), input]);
  },

  // Native color picker + hex text input, both wired to the same update handler.
  // onUpdate(value, inputEl?) — inputEl is passed so callers can do in-place correction.
  colorInput: (value, onUpdate, idPrefix = null) =>
    el("div", { class: "flex items-center gap-2 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 pl-1 h-[40px]" }, [
      el("input", {
        type: "color",
        value: normalizeHex(value) || "#000000",
        id: idPrefix ? `${idPrefix}-picker` : null,
        class: "cursor-pointer size-5 bg-transparent border-none rounded-[4px]",
        onchange: (e) => onUpdate(e.target.value, null),
      }),
      el("input", {
        type: "text",
        value: value,
        id: idPrefix ? `${idPrefix}-hex` : null,
        class: "w-full bg-transparent text-[13px] uppercase outline-none text-[var(--text-primary)]",
        oninput: (e) => onUpdate(e.target.value, e.target),
      }),
    ]),

  // Square icon button. variant: "danger" | "ghost"
  iconButton: (icon, onClick, variant = "danger") => {
    const cls = variant === "danger" ? "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";
    return el("button", { class: `${cls} size-[40px] flex items-center justify-center rounded-[8px] transition-all`, onclick: onClick }, el("span", { class: "flex items-center justify-center" }, icon));
  },

  // Toggle pill button. Controlled: pass isOn state, onChange fires with no args (caller flips state).
  toggle: (id, isOn, onChange) => {
    const btn = el("button", {
      id: id || null,
      class: `toggle-pill${isOn ? " on" : ""}`,
      onclick: onChange,
    });
    return btn;
  },

  // Horizontal row: label on left, one or more controls on right.
  row: (label, ...controls) => el("div", { class: "flex items-center justify-between gap-2" }, [el("span", { class: "text-[var(--text-muted)] text-[12px] shrink-0" }, label), el("div", { class: "flex items-center gap-1.5" }, controls)]),

  // Uppercase section-header label — use to divide settings sections.
  sectionLabel: (text) =>
    el(
      "h3",
      {
        class: "text-[var(--text-muted)] text-[11px] font-bold tracking-[1.2px] px-1 uppercase mt-1",
      },
      text,
    ),

  // Subtle muted caption text.
  caption: (text) => el("p", { class: "text-[var(--text-dim)] text-[11px] px-1 leading-snug" }, text),
};

const getRoleVariations = (role, config) => {
  return role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : config.variations;
};

const Components = {
  // --- COLOR COMPONENTS ---
  _ColorMainRow: (group, idx, config) =>
    el("div", { class: "grid grid-cols-[20px_1fr_72px_40px] gap-2 items-end" }, [
      el("div", { class: "flex flex-col gap-0.5 self-center flex-shrink-0" }, [
        el("button", { onclick: () => moveGroup(idx, -1), disabled: idx === 0, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▲"),
        el("span", { class: "drag-handle text-[var(--text-muted)] cursor-grab text-[14px] leading-none text-center" }, "⠿"),
        el("button", { onclick: () => moveGroup(idx, 1), disabled: idx === config.colors.length - 1, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▼"),
      ]),
      inputsUI.input({ id: `clr-${idx}-name`, value: group.name || "", oninput: (e) => updateGroup(idx, "name", e.target.value) }, "Color Name"),
      inputsUI.input({ id: `clr-${idx}-short`, value: group.shorthand || "", oninput: (e) => updateGroup(idx, "shorthand", e.target.value) }, "Short"),
      inputsUI.iconButton(Icons.Trash, () => removeGroup(idx)),
    ]),

  _ColorStatsRow: (group, idx) => inputsUI.colorInput(group.value, (val, el) => updateGroup(idx, "value", val, el), `clr-${idx}`),

  _ColorSolverRow: (group, idx, config) => {
    if (config.pluginMode !== "adaptiveEngine") return null;
    const mode = group.solverMode || "natural";
    return el("div", { class: "space-y-1" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Color Solver"),
      el("select", { onchange: (e) => updateGroup(idx, "solverMode", e.target.value), class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none" }, [
        el("option", { value: "natural", selected: mode === "natural" ? "selected" : null }, "Balanced"),
        el("option", { value: "saturated", selected: mode === "saturated" ? "selected" : null }, "Vivid"),
        el("option", { value: "luminance", selected: mode === "luminance" ? "selected" : null }, "Muted"),
        el("option", { value: "hue-locked", selected: mode === "hue-locked" ? "selected" : null }, "Hue Locked"),
        el("option", { value: "chroma-maximized", selected: mode === "chroma-maximized" ? "selected" : null }, "Max Chroma"),
      ]),
    ]);
  },

  _ColorDescriptionRow: (group, idx, config) => (config.includeDescriptions ? inputsUI.input({ value: group.description || "", placeholder: "Optional...", oninput: (e) => updateGroup(idx, "description", e.target.value) }, "Description") : null),

  ColorGroupCard: (group, idx, config) => [Components._ColorMainRow(group, idx, config), Components._ColorStatsRow(group, idx, config), Components._ColorSolverRow(group, idx, config), Components._ColorDescriptionRow(group, idx, config)].filter(Boolean),

  // --- ROLE COMPONENTS ---
  _RoleMainRow: (role, idx, config) =>
    el("div", { class: "grid grid-cols-[20px_1fr_72px_40px] gap-2 items-end" }, [
      el("div", { class: "flex flex-col gap-0.5 self-center flex-shrink-0" }, [
        el("button", { onclick: () => moveRole(idx, -1), disabled: idx === 0, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▲"),
        el("span", { class: "drag-handle text-[var(--text-muted)] cursor-grab text-[14px] leading-none text-center" }, "⠿"),
        el("button", { onclick: () => moveRole(idx, 1), disabled: idx === config.roles.length - 1, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▼"),
      ]),
      inputsUI.input({ id: `role-${idx}-name`, value: role.name || "", oninput: (e) => updateRole(idx, "name", e.target.value) }, "Role Name"),
      inputsUI.input({ id: `role-${idx}-short`, value: role.shorthand || "", oninput: (e) => updateRole(idx, "shorthand", e.target.value) }, "Short"),
      inputsUI.iconButton(Icons.Trash, () => removeRole(idx)),
    ]),

  _RoleSecondRow: (role, idx, config) => {
    const isDirect = config.pluginMode === "adaptiveEngine";
    // Per-role baseSelection overrides the global setting when set.
    const bSel = role.baseSelection || config.baseSelection || "By Contrast";
    if (role.variationOverride && role.variationManual) return null;

    // ── ADAPTIVE ENGINE MODE ──
    if (isDirect && bSel === "By Contrast") {
      return el("div", { class: "grid grid-cols-2 gap-2" }, [
        inputsUI.input({ id: `role-${idx}-baseC`, type: "number", step: "0.1", value: role.baseContrast || 4.5, onchange: (e) => updateRole(idx, "baseContrast", e.target.value) }, "Base Contrast"),
        inputsUI.input({ id: `role-${idx}-gap`, type: "number", step: "0.1", value: role.contrastGap || 1.5, onchange: (e) => updateRole(idx, "contrastGap", e.target.value) }, "Contrast Gap"),
      ]);
    }

    if (isDirect && bSel === "Manual") {
      const varTargets = role.variationTargets || config.variations.map((_, i) => DEFAULT_VARIATION_TARGETS[i] || 4.5);
      return el(
        "div",
        { class: "grid gap-1.5", style: { gridTemplateColumns: `repeat(${config.variations.length}, 1fr)` } },
        config.variations.map((v, vi) =>
          el("div", { class: "space-y-1" }, [
            el("label", { class: "text-[var(--text-muted)] text-[11px] font-bold ml-1" }, v.name),
            el("input", { type: "number", step: "0.1", value: varTargets[vi], onchange: (e) => updateRoleVariationTarget(idx, vi, parseFloat(e.target.value)), class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px]" }),
          ]),
        ),
      );
    }

    // ── PALETTE MODE ──
    // "Set base by" toggle — per-role, falls back to global. Manual mode is a
    // global-only setting and bypasses this toggle (step indices shown as-is).
    const BASE_BY_OPTIONS = [
      { value: "By Contrast", label: "Contrast" },
      { value: "By Index", label: "Index" },
    ];

    if (bSel === "Manual") {
      // Global Manual: show per-variation step index inputs, no toggle.
      const varTargets = role.variationTargets || config.variations.map(() => Math.floor((config.scaleLength || 25) / 2));
      const maxStep = (config.scaleLength || 25) - 1;
      return el("div", { class: "space-y-1" }, [
        el(
          "div",
          { class: "grid gap-1.5", style: { gridTemplateColumns: `repeat(${config.variations.length}, 1fr)` } },
          config.variations.map((v, vi) =>
            el("div", { class: "space-y-1" }, [
              el("label", { class: "text-[var(--text-muted)] text-[11px] font-bold ml-1" }, v.name),
              el("input", { type: "number", min: "0", max: String(maxStep), value: varTargets[vi], oninput: (e) => updateRoleVariationTarget(idx, vi, e.target.value), class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px]" }),
            ]),
          ),
        ),
        el("p", { class: "text-[10px] text-[var(--text-muted)] px-1" }, `Step indices (0–${maxStep})`),
      ]);
    }

    // "Set base by" toggle only shown when per-role controls are unlocked in settings.
    const baseByToggle = config.perRoleControls ? Components._InlineToggle("Set base by", BASE_BY_OPTIONS, bSel, (v) => updateRole(idx, "baseSelection", v)) : null;

    if (bSel === "By Contrast") {
      return el(
        "div",
        { class: "space-y-1.5" },
        [baseByToggle, el("div", { class: "grid grid-cols-2 gap-2" }, [inputsUI.input({ type: "number", step: "0.1", value: role.minContrast || "4.5", onchange: (e) => updateRole(idx, "minContrast", e.target.value) }, "Min Contrast"), Components._SpreadInput(role, idx, config)])].filter(Boolean),
      );
    }

    // By Index (default)
    const mid = Math.floor((config.scaleLength || 25) / 2);
    const lightBase = (role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
    const darkBase = (role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
    return el(
      "div",
      { class: "space-y-1.5" },
      [
        baseByToggle,
        el("div", { class: "grid grid-cols-[1fr,1fr,2fr] gap-2" }, [
          inputsUI.input({ type: "number", value: lightBase, min: "1", max: String(config.scaleLength), onchange: (e) => updateRole(idx, "baseIndex", parseInt(e.target.value) - 1) }, "Light Base"),
          inputsUI.input({ type: "number", value: darkBase, min: "1", max: String(config.scaleLength), onchange: (e) => updateRole(idx, "darkBaseIndex", parseInt(e.target.value) - 1) }, "Dark Base"),
          Components._SpreadInput(role, idx, config),
        ]),
      ].filter(Boolean),
    );
  },

  _RoleOverrideSection: (role, idx, config) => {
    if (!config.allowRoleVariations) return null;

    const buildVariationsList = () => {
      if (!role.variationOverride) return null;

      const roleVars = getRoleVariations(role, config);
      const isDirect = config.pluginMode === "adaptiveEngine";
      const isManual = !!role.variationManual;

      const listItems = roleVars.map((v, vi) => {
        const storedTarget = (role.variationTargets || [])[vi];
        const varCount = roleVars.length;
        const baseVarIdx = Math.floor(varCount / 2);

        let ruleVal;
        if (isDirect) {
          const _bc = parseFloat(role.baseContrast) || 4.5;
          const _cg = parseFloat(role.contrastGap) || 1.5;
          ruleVal = Math.max(1.01, _bc + (vi - baseVarIdx) * _cg);
        } else {
          ruleVal = storedTarget !== undefined ? storedTarget : undefined;
        }

        const rawVal = isManual ? (storedTarget !== undefined ? storedTarget : ruleVal) : ruleVal;
        const displayVal = rawVal !== undefined ? parseFloat(parseFloat(rawVal).toFixed(2)) : "";

        return el("div", { class: "flex items-center gap-1.5" }, [
          el("div", { class: "flex flex-col gap-0.5 shrink-0" }, [
            el(
              "button",
              {
                onclick: () => moveRoleVariation(idx, vi, -1),
                disabled: vi === 0,
                class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]",
              },
              "▲",
            ),
            el(
              "button",
              {
                onclick: () => moveRoleVariation(idx, vi, 1),
                disabled: vi === roleVars.length - 1,
                class: "w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]",
              },
              "▼",
            ),
          ]),
          el("input", {
            type: "text",
            value: v.name || "",
            placeholder: "Name",
            oninput: (e) => updateRoleVariation(idx, vi, "name", e.target.value),
            class: "flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] text-[var(--text-primary)]",
          }),
          el("input", {
            type: "text",
            value: v.shorthand || "",
            placeholder: "Short",
            oninput: (e) => updateRoleVariation(idx, vi, "shorthand", e.target.value),
            class: "w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] text-[var(--text-primary)]",
          }),
          el("input", {
            type: "number",
            step: "0.1",
            value: displayVal,
            disabled: !isManual ? "disabled" : null,
            oninput: (e) => updateRoleVariationTarget(idx, vi, e.target.value),
            class: `w-[60px] h-[32px] border rounded-[8px] px-2 text-[12px] ${isManual ? "bg-[var(--bg-input)] border-[var(--border)]" : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-60"}`,
          }),
          el(
            "button",
            {
              onclick: () => removeRoleVariation(idx, vi),
              disabled: roleVars.length <= 1,
              class: "w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30",
            },
            "✕",
          ),
        ]);
      });

      return el("div", { class: "mt-2 space-y-1.5" }, [
        el("div", { class: "flex items-center justify-between py-1" }, [
          el("span", { class: "text-[11px] text-[var(--text-muted)]" }, "Variation targets"),
          el("div", { class: "flex gap-0.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-[6px] p-0.5" }, [
            el(
              "button",
              {
                onclick: () => role.variationManual && toggleRoleVariationManual(idx),
                class: `text-[11px] px-2 py-0.5 rounded-[4px] transition-all ${!role.variationManual ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`,
              },
              "Rule",
            ),
            el(
              "button",
              {
                onclick: () => !role.variationManual && toggleRoleVariationManual(idx),
                class: `text-[11px] px-2 py-0.5 rounded-[4px] transition-all ${role.variationManual ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`,
              },
              "Manual",
            ),
          ]),
        ]),
        ...listItems,
        el(
          "button",
          {
            onclick: () => addRoleVariation(idx),
            class: "w-full h-[28px] text-[11px] text-[var(--accent)] border border-[var(--border)] rounded-[8px] hover:bg-[var(--bg-hover)] transition-all",
          },
          "+ Add variation",
        ),
      ]);
    };

    return el("div", { class: "border-t border-[var(--border)] mt-2 pt-2" }, [
      el("div", { class: "flex items-center justify-between" }, [el("span", { class: "text-[12px] font-medium" }, "Custom Variations"), el("button", { onclick: () => toggleRoleVariationOverride(idx), class: `toggle-pill ${role.variationOverride ? "on" : ""}` })]),
      buildVariationsList(),
    ]);
  },

  // Renders a row of pill buttons. Used as a suffix in inputs or inline with labels.
  // Falls back to a <select> when options.length > 2 for future extensibility.
  _inlineControl: (options, current, onChange) => {
    if (options.length > 2) {
      return el(
        "select",
        {
          class: "h-[26px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[6px] px-2 text-[11px] text-[var(--text-primary)] outline-none cursor-pointer",
          onchange: (e) => onChange(e.target.value),
        },
        options.map((opt) => el("option", { value: opt.value, selected: current === opt.value ? "selected" : null }, opt.label)),
      );
    }
    return el(
      "div",
      { class: "flex shrink-0 bg-[var(--bg-base)] border border-[var(--border)] rounded-[6px]" },
      options.map((opt, i) =>
        el(
          "button",
          {
            class: `text-[10px] font-medium px-2 py-1 transition-all ${i === 0 ? "rounded-l-[5px]" : "rounded-r-[5px]"} ${current === opt.value ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`,
            onclick: () => onChange(opt.value),
          },
          opt.label,
        ),
      ),
    );
  },

  // Label-row toggle: "Label text ............ [Opt A] [Opt B]"
  // Switches to a <select> when options > 2.
  // @param {string}   label
  // @param {{value,label}[]} options
  // @param {string}   current  - active option value
  // @param {Function} onChange - called with the new value
  _InlineToggle: (label, options, current, onChange) => inputsUI.row(label, Components._inlineControl(options, current, onChange)),

  // Number input with a unit selector embedded as a right-side suffix (Style A).
  // Reads per-role spreadUnit when perRoleControls is enabled, otherwise uses the global.
  // Switches to a <select> suffix automatically when options > 2.
  _SpreadInput: (role, idx, config) => {
    const isSteps = (role.spreadUnit || config.spreadUnit || "steps") === "steps";
    const step = isSteps ? "1" : "0.1";
    const value = isSteps ? role.spread || 1 : role.contrastGap || 1.5;
    const field = isSteps ? "spread" : "contrastGap";

    const numInput = el("input", {
      type: "number",
      step,
      value,
      onchange: (e) => updateRole(idx, field, e.target.value),
      class: "w-full min-w-0 bg-transparent text-[13px] outline-none text-[var(--text-primary)]",
    });

    // Unit toggle only shown when per-role controls are unlocked — otherwise the
    // global Spread Unit setting in the settings panel is the authority.
    const inputChildren = config.perRoleControls
      ? [
          numInput,
          Components._inlineControl(
            [
              { value: "steps", label: "steps" },
              { value: "contrast", label: "contrast" },
            ],
            isSteps ? "steps" : "contrast",
            (v) => updateRole(idx, "spreadUnit", v),
          ),
        ]
      : [numInput];

    return el("div", { class: "space-y-1 flex-1" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium block ml-1" }, "Spread"),
      el("div", { class: "flex items-center gap-1.5 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 h-[40px]" }, inputChildren),
    ]);
  },

  RoleGroupCard: (role, idx, config) => [Components._RoleMainRow(role, idx, config), Components._RoleSecondRow(role, idx, config), Components._RoleOverrideSection(role, idx, config)].filter(Boolean),
};
