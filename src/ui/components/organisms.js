/**
 * ============================================================================
 * CTM316 UI ORGANISMS
 * Reusable composite components — layout molecules and stateful cards.
 * Anything that could appear in more than one screen lives here.
 * Depends on: primitives.js
 * ============================================================================
 */

// ── PANEL UI ──
// Layout building blocks for any panel, dialog, or settings surface.
// Compose freely with inputsUI controls — e.g. panelUI.row("Label", null, panelUI.togglePill(...))

const panelUI = {
  // Uppercase section divider label.
  sectionLabel: (text) =>
    el("p", { class: "text-[11px] font-bold tracking-[0.6px] text-[var(--text-muted)] mb-2" }, [text]),

  // Rounded card wrapper with consistent inner spacing.
  card: (children) =>
    el("div", { class: "settings-card space-y-3" }, children),

  // Two-column row: label+description on left, control on right.
  // descText is optional — pass null to omit the subtitle line.
  row: (labelText, descText, control) =>
    el("div", { class: "flex items-center justify-between gap-3" }, [
      el("div", {}, [
        el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, [labelText]),
        descText ? el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, [descText]) : null,
      ].filter(Boolean)),
      control,
    ]),

  // Compact two-column row: muted label left, control right. No subtitle.
  smallRow: (labelText, control) =>
    el("div", { class: "flex items-center justify-between" }, [
      el("p", { class: "text-[12px] text-[var(--text-muted)] font-medium" }, [labelText]),
      control,
    ]),

  // Uncontrolled toggle pill button. State is synced externally via classList.toggle("on").
  // For a controlled toggle (state passed in), use inputsUI.toggle() instead.
  togglePill: (id, onclickFn) =>
    el("button", { id, class: "toggle-pill", onclick: onclickFn }),

  // Universal text/number input.
  //
  // size:  "table"(26px) | "sm"(32px) | "md"(36px) | "lg"(40px)
  // width: "full" | "flex" | null (no width class — use class for fixed widths)
  // class: extra classes on <input> (e.g. "w-[52px]" for fixed-width shorthand fields)
  // mono:  true → font-mono + uppercase (hex codes)
  //
  // Returns bare <input> when no label/hint/icons are set.
  // Returns <div class="space-y-1"> wrapper when any decoration is present.
  input: ({
    id = null, value = "", placeholder = "", type = "text",
    size = "md", width = "full", class: extraCls = "",
    leadingIcon = null, trailingIcon = null,
    label = null, infoIcon = null,
    hint = null, error = null,
    mono = false, disabled = false,
    min = null, max = null, step = null, maxlength = null,
    oninput = null, onchange = null, onblur = null,
  } = {}) => {
    const sizes = {
      table: { h: "h-[26px]", text: "text-[11px]", px: "px-1.5", r: "rounded-[4px]" },
      sm:    { h: "h-[32px]", text: "text-[12px]", px: "px-2",   r: "rounded-[8px]" },
      md:    { h: "h-[36px]", text: "text-[13px]", px: "px-3",   r: "rounded-[8px]" },
      lg:    { h: "h-[40px]", text: "text-[13px]", px: "p-2",    r: "rounded-[8px]" },
    };
    const s = sizes[size] || sizes.md;
    const widthCls = width === "full" ? "w-full" : width === "flex" ? "flex-1" : "";
    const hasDecor = label || hint || error || leadingIcon || trailingIcon;

    const iconPadL = leadingIcon  ? "pl-7" : "";
    const iconPadR = trailingIcon ? "pr-7" : "";
    const baseCls  = [
      s.h, s.text, s.px, s.r,
      iconPadL, iconPadR,
      !hasDecor ? widthCls : "w-full",
      "bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]",
      "outline-none focus:border-[var(--border-focus)] transition-colors",
      mono     ? "font-mono uppercase" : "",
      disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "",
      extraCls,
    ].filter(Boolean).join(" ");

    const attrs = { type, class: baseCls };
    if (id)               attrs.id    = id;
    if (value !== undefined) attrs.value = value;
    if (placeholder) attrs.placeholder = placeholder;
    if (min !== null)      attrs.min       = String(min);
    if (max !== null)      attrs.max       = String(max);
    if (step !== null)     attrs.step      = String(step);
    if (maxlength !== null) attrs.maxlength = String(maxlength);
    if (oninput)   attrs.oninput  = oninput;
    if (onchange)  attrs.onchange = onchange;
    if (onblur)    attrs.onblur   = onblur;
    if (disabled)  attrs.disabled = true;

    const inputEl = el("input", attrs);

    if (!hasDecor) return inputEl;

    // Input boundary — wraps with icon slots when icons are present
    let boundary = inputEl;
    if (leadingIcon || trailingIcon) {
      const mkIcon = (node, pos) => {
        const wrap = el("span", { class: `absolute ${pos}-2 flex items-center justify-center w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none` });
        if (typeof node === "string") wrap.innerHTML = node;
        else wrap.appendChild(node);
        return wrap;
      };
      boundary = el("div", { class: "relative flex items-center" }, [
        leadingIcon  ? mkIcon(leadingIcon,  "left")  : null,
        inputEl,
        trailingIcon ? mkIcon(trailingIcon, "right") : null,
      ].filter(Boolean));
    }

    const outerCls = ["space-y-1", widthCls].filter(Boolean).join(" ");
    return el("div", { class: outerCls }, [
      label ? el("div", { class: "flex items-center gap-1" }, [
        el("label", { for: id || undefined, class: "text-[12px] text-[var(--text-muted)] font-medium ml-1" }, [label]),
        infoIcon || null,
      ].filter(Boolean)) : null,
      boundary,
      (error || hint) ? el("p", { class: `text-[11px] ml-1 ${error ? "text-red-400" : "text-[var(--text-muted)]"}` }, [error || hint]) : null,
    ].filter(Boolean));
  },

  // Select/dropdown with optional label above.
  // options: Array of [value, displayText] pairs.
  selectInput: (id, options, label) => {
    const select = el("select", {
      id,
      class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] appearance-none cursor-pointer",
    }, options.map(([val, txt]) => el("option", { value: val }, [txt])));
    if (!label) return select;
    return el("div", { class: "space-y-1 flex-1" }, [
      el("label", { for: id, class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, [label]),
      select,
    ]);
  },

  // Pill-style segmented control. Each button gets id, label, onclick.
  // Use .active CSS class on the active button.
  segmented: (buttons) =>
    el("div", { class: "flex gap-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-0.5" },
      buttons.map(({ id, label, onclick }) =>
        el("button", { id, onclick, class: "seg-btn flex-1" }, [label])
      )
    ),
};

// ── SHARED HELPERS ───────────────────────────────────────────────────────────

// Returns true if white text is more legible on the given hex background.
function useWhiteLabel(hex) {
  const lum = relLum(normalizeHex(hex) || "#888888");
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05;
}

// ── CARD COMPONENTS ──

// Local UI state for role card collapse toggle (keyed by role._id)
const _roleCardUIState = {};
function _getRoleUI(id) {
  if (!_roleCardUIState[id]) _roleCardUIState[id] = { open: false };
  return _roleCardUIState[id];
}

const Components = {
  // --- COLOR COMPONENTS ---
  _ColorMainRow: (group, idx, config) =>
    el("div", { class: "grid gap-2 items-center grid grid-cols-[20px_1fr_72px_108px_36px]" }, [
      el("div", { class: "flex flex-col gap-0.5 self-center flex-shrink-0" }, [
        inputsUI.btn("ghost", { size: "xs", square: true, icon: "▲", onclick: () => moveGroup(idx, -1), disabled: idx === 0 }),
        el("span", { class: "drag-handle text-[var(--text-muted)] cursor-grab text-[14px] leading-none text-center" }, "⠿"),
        inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveGroup(idx, 1), disabled: idx === config.colors.length - 1 }),
      ]),
      inputsUI.input({ id: `clr-${idx}-name`, value: group.name || "", oninput: (e) => updateGroup(idx, "name", e.target.value) }, "Color Name"),
      inputsUI.input({ id: `clr-${idx}-short`, value: group.shorthand || "", oninput: (e) => updateGroup(idx, "shorthand", e.target.value) }, "Shorthand"),
      el("div", { class: "space-y-1" }, [el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium block ml-1" }, "Value"), inputsUI.colorInput(group.value, (val, elRef) => updateGroup(idx, "value", val, elRef), `clr-${idx}`)]),
      el("div", { class: "self-end" }, [inputsUI.iconButton(Icons.Trash, () => removeGroup(idx), "danger", { "aria-label": "Delete color" })]),
    ]),

  _ColorSolverRow: (group, idx, config) => {
    if (config.pluginMode !== "adaptiveEngine") return null;
    if (config.useGlobalAlgo !== false) return null;
    if (config.perColorAlgoScope === "role") return null;
    const mode = group.solverMode || "natural";
    return el("div", { class: "space-y-1" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Color Solver"),
      el("select", { onchange: (e) => updateGroup(idx, "solverMode", e.target.value), class: "w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none" }, [
        el("option", { value: "natural",          selected: mode === "natural"          ? "selected" : null }, "Balanced"),
        el("option", { value: "saturated",        selected: mode === "saturated"        ? "selected" : null }, "Vivid"),
        el("option", { value: "luminance",        selected: mode === "luminance"        ? "selected" : null }, "Muted"),
        el("option", { value: "hue-locked",       selected: mode === "hue-locked"       ? "selected" : null }, "Hue Locked"),
        el("option", { value: "chroma-maximized", selected: mode === "chroma-maximized" ? "selected" : null }, "Max Chroma"),
      ]),
    ]);
  },

  _ColorAlgoRow: (group, idx, config) => {
    if (config.pluginMode === "adaptiveEngine") return null;
    if (config.useGlobalAlgo) return null;
    const algo = group.scaleAlgorithm || config.scaleAlgorithm || "Natural";
    const opts = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    return el("div", { class: "space-y-1" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Scale Algorithm"),
      el("select", {
        onchange: (e) => updateGroup(idx, "scaleAlgorithm", e.target.value),
        class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none appearance-none cursor-pointer text-[var(--text-primary)]",
      }, opts.map((o) => el("option", { value: o, selected: algo === o ? "selected" : null }, o))),
    ]);
  },

  _ColorDescriptionRow: (group, idx, config) => (config.includeDescriptions ? inputsUI.input({ value: group.description || "", placeholder: "Optional...", oninput: (e) => updateGroup(idx, "description", e.target.value) }, "Description") : null),

  ColorGroupCard: (group, idx, config) => [Components._ColorMainRow(group, idx, config), Components._ColorSolverRow(group, idx, config), Components._ColorAlgoRow(group, idx, config), Components._ColorDescriptionRow(group, idx, config)].filter(Boolean),

  _RoleAlgoRow: (role, idx, config) => {
    if (config.useGlobalAlgo || config.pluginMode !== "adaptiveEngine" || config.perColorAlgoScope !== "role") return null;
    const mode = role.solverMode || config.solverMode || "natural";
    return el("div", { class: "space-y-1 mt-2 pt-2 border-t border-[var(--border)]" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Solver"),
      el("select", {
        onchange: (e) => setRole(idx, "solverMode", e.target.value),
        class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none appearance-none cursor-pointer text-[var(--text-primary)]",
      }, [
        el("option", { value: "natural",          selected: mode === "natural"          ? "selected" : null }, "Balanced"),
        el("option", { value: "saturated",        selected: mode === "saturated"        ? "selected" : null }, "Vivid"),
        el("option", { value: "luminance",        selected: mode === "luminance"        ? "selected" : null }, "Muted"),
        el("option", { value: "hue-locked",       selected: mode === "hue-locked"       ? "selected" : null }, "Hue Locked"),
        el("option", { value: "chroma-maximized", selected: mode === "chroma-maximized" ? "selected" : null }, "Max Chroma"),
      ]),
    ]);
  },

  // --- ROLE COMPONENTS ---
  RoleGroupCard: (role, idx, config) => {
    const ui = _getRoleUI(role._id);
    const useGlobal = !role.variationOverride;
    const vars = useGlobal ? config.variations || [] : role.roleVariations || [];

    // ── TABLE ──
    function buildTable() {
      const roLabelCls = "text-[11px] px-1.5 text-[var(--text-muted)] truncate";
      const cols = useGlobal ? "16px 1fr 88px" : `16px 1fr 56px 88px 24px`;
      const hdrCols = useGlobal ? ["#", "Variation", "Min Contrast"] : ["#", "Name", "Short", "Min Contrast", ""];

      const rows = vars.map((v, vi) => {
        const tgtVal = (role.variationTargets || [])[vi] !== undefined ? role.variationTargets[vi] : 4.5;

        const nameCell = useGlobal
          ? el("span", { class: roLabelCls }, `${v.name || "—"}${v.shorthand ? ` (${v.shorthand})` : ""}`)
          : panelUI.input({
              value: v.name || "", size: "table",
              oninput: (e) => (role.variationOverride ? updateRoleVariation(idx, vi, "name", e.target.value) : updateSharedVariation(vi, "name", e.target.value)),
            });

        const shortCell = useGlobal
          ? null
          : panelUI.input({
              value: v.shorthand || "", size: "table",
              oninput: (e) => (role.variationOverride ? updateRoleVariation(idx, vi, "shorthand", e.target.value) : updateSharedVariation(vi, "shorthand", e.target.value)),
            });

        const contrastInp = panelUI.input({
          type: "number", value: String(tgtVal), size: "table",
          min: "1", max: "21", step: "0.1",
          onchange: (e) => updateRoleVariationTarget(idx, vi, e.target.value),
        });

        const rmBtn = !useGlobal
          ? inputsUI.btn("ghost", {
              size: "xs",
              square: true,
              icon: "−",
              disabled: vars.length <= 1,
              class: "hover:text-[var(--danger)] hover:bg-[var(--danger)]/10",
              onclick: () => (role.variationOverride ? removeRoleVariation(idx, vi) : removeSharedVariation(vi)),
            })
          : null;

        return el(
          "div",
          {
            class: `grid px-2 py-1 items-center gap-1.5 ${vi < vars.length - 1 ? "border-b border-[var(--border)]/40" : ""} ${vi % 2 ? "bg-[var(--bg-input)]/20" : ""}`,
            style: `grid-template-columns:${cols}`,
          },
          [el("span", { class: "text-[10px] text-[var(--text-muted)] tabular-nums" }, String(vi + 1)), nameCell, shortCell, contrastInp, rmBtn].filter(Boolean),
        );
      });

      const addRow = !useGlobal
        ? el("div", { class: "flex px-2 py-1.5 border-t border-[var(--border)]/40" }, [
            inputsUI.btn("ghost", {
              size: "sm",
              label: "+ Add variation",
              class: "text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10",
              onclick: () => (role.variationOverride ? addRoleVariation(idx) : addSharedVariation()),
            }),
          ])
        : null;

      return el(
        "div",
        { class: "overflow-hidden" },
        [
          el(
            "div",
            { class: `grid px-2 py-1 bg-[var(--bg-base)] border-b border-[var(--border)] gap-1.5`, style: `grid-template-columns:${cols}` },
            hdrCols.map((h) => el("span", { class: "text-[10px] font-bold text-[var(--text-muted)]" }, h)),
          ),
          ...rows,
          addRow,
        ].filter(Boolean),
      );
    }

    // ── CARD ASSEMBLY ──
    const nameRow = el("div", { class: "grid gap-2 items-end grid grid-cols-[20px_1fr_96px_36px]" }, [
      el("div", { class: "flex flex-col gap-0.5 self-center shrink-0" }, [
        inputsUI.btn("ghost", { size: "xs", square: true, icon: "▲", onclick: () => moveRole(idx, -1), disabled: idx === 0 }),
        el("span", { class: "drag-handle text-[var(--text-muted)] cursor-grab text-[14px] leading-none text-center" }, "⠿"),
        inputsUI.btn("ghost", { size: "xs", square: true, icon: "▼", onclick: () => moveRole(idx, 1), disabled: idx === config.roles.length - 1 }),
      ]),
      inputsUI.input({ id: `role-${idx}-name`, value: role.name || "", oninput: (e) => updateRole(idx, "name", e.target.value) }, "Role Name"),
      inputsUI.input({ id: `role-${idx}-short`, value: role.shorthand || "", oninput: (e) => updateRole(idx, "shorthand", e.target.value) }, "Shorthand"),
      inputsUI.iconButton(Icons.Trash, () => removeRole(idx), "danger", { "aria-label": "Delete role" }),
    ]);

    const canOverride = !!config.allowRoleVariations;
    const scopeBadge = el(
      "span",
      {
        class: `text-[10px] px-1.5 py-0.5 rounded-full font-medium select-none ${!canOverride ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${useGlobal ? "bg-[var(--bg-hover)] text-[var(--text-muted)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`,
        title: !canOverride ? "Enable Role-specific Variations in Settings → Roles to override per role" : useGlobal ? "Click to use role-specific variations" : "Click to use global variations",
        onclick: (e) => {
          e.stopPropagation();
          if (canOverride) toggleRoleVariationOverride(idx);
        },
      },
      useGlobal ? "Global" : "Role",
    );

    const header = el(
      "div",
      {
        class: "flex items-center gap-2 px-3 py-2 bg-[var(--bg-input)] cursor-pointer select-none",
        onclick: () => {
          ui.open = !ui.open;
          renderRoles();
        },
      },
      [
        el("span", { class: "flex items-center justify-center w-3 shrink-0", style: { transform: ui.open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s ease" } }, Icons.ChevronDown),
        el("span", { class: "text-[12px] font-medium text-[var(--text-primary)] flex-1" }, `Variations (${vars.length})`),
        scopeBadge,
      ],
    );

    const body = ui.open ? el("div", { class: "py-2" }, [buildTable()]) : null;

    const section = el("div", { class: "border border-[var(--border)] rounded-[10px] overflow-hidden" }, [header, body].filter(Boolean));

    const algoRow = Components._RoleAlgoRow(role, idx, config);
    return [el("div", { class: "space-y-2" }, [nameRow, section, algoRow].filter(Boolean))];
  },
};
