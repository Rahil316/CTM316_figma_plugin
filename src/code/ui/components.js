/**
 * ============================================================================
 * CTM316 UI COMPONENTS
 * Pure functional templates for building the UI.
 * Also owns shared DOM utilities (debounce, focus preservation, clipboard).
 * ============================================================================
 */

// ── DOM UTILITIES ──

const debounce = (fn, delay = 150) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
};

function withPreservedFocus(fn) {
  if (typeof document === "undefined") return fn();
  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const start = activeEl ? activeEl.selectionStart : null;
  const end = activeEl ? activeEl.selectionEnd : null;
  fn();
  if (activeId) {
    const newEl = document.getElementById(activeId);
    if (newEl) {
      newEl.focus();
      if (start !== null && (newEl.type === "text" || newEl.type === "number")) {
        try {
          newEl.setSelectionRange(start, end);
        } catch (e) {
          console.warn("Failed to restore focus range:", e);
        }
      }
    }
  }
}

async function copyToClipboard(text) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API not available");
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn("Clipboard copy failed:", err);
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(textArea);
    return true;
  }
}

// ── ICONS ──

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

// ── ELEMENT FACTORY ──

/**
 * Creates a DOM element with attributes, event listeners, and children.
 * @param {string} tag
 * @param {object} attrs
 * @param {Array|string|Node} children
 * @returns {HTMLElement}
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

// ── INPUT PRIMITIVES ──

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

  // ── BUTTON ──
  // Universal button primitive used by all other button helpers.
  // variant: "primary" | "secondary" | "ghost" | "danger" | "icon"
  // size:    "sm" | "md" (default) | "lg"
  // opts:    { label, icon, disabled, class, id, onclick, ... }
  btn: (variant, opts = {}) => {
    const { label, icon, disabled, size = "md", class: extraCls = "", ...rest } = opts;

    const base = "inline-flex items-center justify-center gap-1.5 font-medium transition-all border select-none";
    const sizes = {
      sm: "h-[28px] px-2.5 text-[11px] rounded-[6px]",
      md: "h-[36px] px-3 text-[12px] rounded-[8px]",
      lg: "h-[40px] px-4 text-[13px] rounded-[8px]",
    };
    const variants = {
      primary:   "bg-[var(--accent)] border-[var(--accent)] text-white hover:opacity-90 cursor-pointer",
      secondary: "bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer",
      ghost:     "bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer",
      danger:    "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/20 cursor-pointer",
      icon:      "bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer size-[36px] !p-0",
    };
    const disabledCls = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";
    const cls = [base, sizes[size] ?? sizes.md, variants[variant] ?? variants.secondary, disabledCls, extraCls]
      .filter(Boolean).join(" ");

    const inner = [
      icon  ? el("span", { class: "flex items-center justify-center shrink-0" }, icon) : null,
      label ? el("span", {}, label) : null,
    ].filter(Boolean);

    return el("button", { ...rest, class: cls, disabled: disabled || null },
      inner.length === 1 ? inner[0] : inner
    );
  },

  // Square icon button — delegates to btn(). variant: "danger" | "ghost"
  iconButton: (icon, onClick, variant = "danger") =>
    inputsUI.btn(variant === "danger" ? "danger" : "ghost", {
      icon, onclick: onClick, size: "md", class: "!size-[40px] !rounded-[8px]",
    }),

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

// ── CARD COMPONENTS ──

// Local UI state for role card open/gear toggle (keyed by role._id)
const _roleCardUIState = {};
function _getRoleUI(id) {
  if (!_roleCardUIState[id]) _roleCardUIState[id] = { open: false, gear: false };
  return _roleCardUIState[id];
}

function _pills(options, current, onChange) {
  return el("div", { class: "flex bg-[var(--bg-base)] border border-[var(--border)] rounded-[6px] overflow-hidden h-[28px]" },
    options.map(opt => el("button", {
      class: `flex-1 text-[10px] font-medium px-2 transition-all ${current === opt.value ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`,
      onclick: () => onChange(opt.value),
    }, opt.label))
  );
}

function _settingsRow(label, control) {
  return el("div", { class: "flex items-center justify-between gap-3" }, [
    el("span", { class: "text-[11px] text-[var(--text-muted)] shrink-0 w-[110px]" }, label),
    el("div", { class: "flex-1" }, [control]),
  ]);
}

function _labelledInput(label, type, value, extra) {
  return el("div", { class: "space-y-1 flex-1" }, [
    el("label", { class: "text-[10px] text-[var(--text-muted)] font-medium block ml-1" }, label),
    el("input", Object.assign({ type, value, class: "w-full h-[30px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[6px] px-2 text-[11px] outline-none text-[var(--text-primary)]" }, extra)),
  ]);
}

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
  RoleGroupCard: (role, idx, config) => {
    const ui = _getRoleUI(role._id);
    const vars = role.variationOverride ? (role.roleVariations || []) : (config.variations || []);
    const bSel = role.baseSelection || config.baseSelection || "By Contrast";
    const findBaseBy = bSel === "By Index" ? "index" : "contrast";
    const mappingMode = role.mappingMode || "auto";
    const spreadUnit = role.spreadUnit || config.spreadUnit || "steps";
    const useGlobal = !role.variationOverride;
    const isAuto = mappingMode === "auto";
    const isSteps = spreadUnit === "steps";
    const scaleLen = config.scaleLength || 25;
    const mid = Math.floor(scaleLen / 2);
    const center = Math.floor(vars.length / 2);
    const lightBase = role.baseIndex !== undefined ? role.baseIndex : mid;
    const darkBase = role.darkBaseIndex !== undefined ? role.darkBaseIndex : lightBase;
    const spread = parseFloat(role.spread) || 1;
    const minC = parseFloat(role.minContrast) || 4.5;
    const cGap = parseFloat(role.contrastGap) || 1.5;

    function summary() {
      const base = findBaseBy === "index" ? "By Index" : "By Contrast";
      const spr = isSteps ? "Steps" : "Contrast";
      const mode = isAuto ? "Auto" : "Manual";
      const vStr = useGlobal ? "Global" : `Custom (${vars.length})`;
      return `${base} · ${spr} · ${mode} · ${vStr}`;
    }

    // ── TABLE ──
    function buildTable() {
      const roCls = "w-full h-[24px] text-[11px] px-1 text-[var(--text-muted)] bg-transparent cursor-default tabular-nums outline-none";
      const edCls = "w-full h-[24px] text-[11px] px-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[4px] outline-none text-[var(--text-primary)] tabular-nums";
      const nameCls = "w-full h-[24px] text-[11px] px-1 rounded-[4px] outline-none"
        + (useGlobal ? " bg-transparent text-[var(--text-muted)] cursor-default" : " bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]");
      const cols = isSteps
        ? `16px 1fr 48px 54px 54px${!useGlobal ? " 20px" : ""}`
        : `16px 1fr 48px 76px${!useGlobal ? " 20px" : ""}`;

      const hdrLabels = isSteps ? ["#", "Alias", "Short", "Step ☀", "Step 🌙"] : ["#", "Alias", "Short", "Contrast"];
      if (!useGlobal) hdrLabels.push("");

      const rows = vars.map((v, vi) => {
        const offset = vi - center;
        const lightStep = Math.max(0, Math.min(scaleLen - 1, Math.round(lightBase + offset * spread)));
        const darkStep = Math.max(0, Math.min(scaleLen - 1, Math.round(darkBase + offset * spread)));
        const cVal = Math.max(1.01, +(minC + offset * cGap).toFixed(2));

        const nameInp = el("input", {
          type: "text", value: v.name || "", readOnly: useGlobal || null,
          class: nameCls,
          oninput: useGlobal ? null : (e) => {
            if (role.variationOverride) updateRoleVariation(idx, vi, "name", e.target.value);
            else updateSharedVariation(vi, "name", e.target.value);
          },
        });
        const shortInp = el("input", {
          type: "text", value: v.shorthand || "", readOnly: useGlobal || null,
          class: "w-full h-[24px] text-[11px] px-1 rounded-[4px] outline-none"
            + (useGlobal ? " bg-transparent text-[var(--text-muted)] cursor-default" : " bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"),
          oninput: useGlobal ? null : (e) => {
            if (role.variationOverride) updateRoleVariation(idx, vi, "shorthand", e.target.value);
            else updateSharedVariation(vi, "shorthand", e.target.value);
          },
        });

        let valueCells;
        if (isSteps) {
          const ltVal = isAuto ? lightStep : ((role.variationTargetsLight || [])[vi] !== undefined ? role.variationTargetsLight[vi] : lightStep);
          const dkVal = isAuto ? darkStep  : ((role.variationTargetsDark  || [])[vi] !== undefined ? role.variationTargetsDark[vi]  : darkStep);
          const ltInp = el("input", { type: "number", value: ltVal, readOnly: isAuto || null, class: isAuto ? roCls : edCls,
            onchange: isAuto ? null : (e) => updateRole(idx, "variationTargetL:" + vi, e.target.value) });
          const dkInp = el("input", { type: "number", value: dkVal, readOnly: isAuto || null, class: isAuto ? roCls : edCls,
            onchange: isAuto ? null : (e) => updateRole(idx, "variationTargetD:" + vi, e.target.value) });
          valueCells = [ltInp, dkInp];
        } else {
          const tgtVal = isAuto ? cVal : ((role.variationTargets || [])[vi] !== undefined ? role.variationTargets[vi] : cVal);
          const cInp = el("input", { type: "number", step: "0.1", value: tgtVal, readOnly: isAuto || null, class: isAuto ? roCls : edCls,
            onchange: isAuto ? null : (e) => updateRoleVariationTarget(idx, vi, e.target.value) });
          valueCells = [cInp];
        }

        const rmBtn = !useGlobal ? el("button", {
          class: "w-[18px] h-[18px] flex items-center justify-center rounded-[3px] text-[11px] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all",
          disabled: vars.length <= 1,
          onclick: () => role.variationOverride ? removeRoleVariation(idx, vi) : removeSharedVariation(vi),
        }, "−") : null;

        return el("div", {
          class: `grid px-2 py-1 items-center gap-1 ${vi < vars.length - 1 ? "border-b border-[var(--border)]/40" : ""} ${vi % 2 ? "bg-[var(--bg-input)]/20" : ""}`,
          style: `grid-template-columns:${cols}`,
        }, [
          el("span", { class: "text-[10px] text-[var(--text-muted)]" }, String(vi + 1)),
          nameInp,
          shortInp,
          ...valueCells,
          rmBtn,
        ].filter(Boolean));
      });

      const addRow = !useGlobal ? el("div", { class: "flex px-2 py-1.5 border-t border-[var(--border)]/40" }, [
        el("button", {
          class: "text-[10px] text-[var(--accent)] hover:underline",
          onclick: () => role.variationOverride ? addRoleVariation(idx) : addSharedVariation(),
        }, "+ Add variation"),
      ]) : null;

      return el("div", { class: "rounded-[8px] border border-[var(--border)] overflow-hidden" }, [
        el("div", {
          class: "grid px-2 py-1 bg-[var(--bg-base)] border-b border-[var(--border)]",
          style: `grid-template-columns:${cols}`,
        }, hdrLabels.map(h => el("span", { class: "text-[10px] font-bold text-[var(--text-muted)]" }, h))),
        ...rows,
        addRow,
      ].filter(Boolean));
    }

    // ── VALUE INPUTS (auto mode only) ──
    function buildValueInputs() {
      if (!isAuto) return null;
      const children = [];
      if (findBaseBy === "index") {
        children.push(_labelledInput("Light Base Step", "number", String(lightBase + 1), { min: "1", max: String(scaleLen), onchange: (e) => updateRole(idx, "baseIndex", parseInt(e.target.value) - 1) }));
        children.push(_labelledInput("Dark Base Step",  "number", String(darkBase + 1),  { min: "1", max: String(scaleLen), onchange: (e) => updateRole(idx, "darkBaseIndex", parseInt(e.target.value) - 1) }));
      } else {
        children.push(_labelledInput("Min Contrast", "number", String(minC), { step: "0.1", min: "1", max: "21", onchange: (e) => updateRole(idx, "minContrast", e.target.value) }));
      }
      const sLabel = isSteps ? "Spread (steps)" : "Spread (contrast Δ)";
      const sVal   = isSteps ? String(spread) : String(cGap);
      const sField = isSteps ? "spread" : "contrastGap";
      children.push(_labelledInput(sLabel, "number", sVal, { step: isSteps ? "1" : "0.1", min: "0", onchange: (e) => updateRole(idx, sField, e.target.value) }));
      return el("div", { class: "flex gap-2" }, children);
    }

    // ── SETTINGS PANEL (gear view) ──
    function buildSettings() {
      const rows = [
        _settingsRow("Find base by", _pills(
          [{ value: "contrast", label: "Min Contrast" }, { value: "index", label: "By Index" }],
          findBaseBy, v => updateRole(idx, "baseSelection", v === "index" ? "By Index" : "By Contrast")
        )),
        _settingsRow("Spread unit", _pills(
          [{ value: "steps", label: "Steps" }, { value: "contrast", label: "Contrast" }],
          spreadUnit, v => updateRole(idx, "spreadUnit", v)
        )),
        _settingsRow("Mapping mode", _pills(
          [{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }],
          mappingMode, v => updateRole(idx, "mappingMode", v)
        )),
        el("div", { class: "border-t border-[var(--border)]/60" }),
        _settingsRow("Variations", _pills(
          [{ value: "global", label: "Use global" }, { value: "custom", label: "Custom" }],
          useGlobal ? "global" : "custom",
          v => {
            if (v === "custom" && !role.variationOverride) toggleRoleVariationOverride(idx);
            else if (v === "global" && role.variationOverride) toggleRoleVariationOverride(idx);
          }
        )),
        !useGlobal ? el("div", { class: "flex justify-end" }, [
          el("button", {
            class: "text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline",
            onclick: () => resetRoleVariationsToShared(idx),
          }, "Reset to defaults"),
        ]) : null,
      ].filter(Boolean);
      return el("div", { class: "space-y-2.5 p-3" }, rows);
    }

    // ── CARD ASSEMBLY ──
    const nameRow = el("div", { class: "grid gap-2 items-end", style: "grid-template-columns:20px 1fr 72px 40px" }, [
      el("div", { class: "flex flex-col gap-0.5 self-center shrink-0" }, [
        el("button", { onclick: () => moveRole(idx, -1), disabled: idx === 0, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▲"),
        el("span", { class: "drag-handle text-[var(--text-muted)] cursor-grab text-[14px] leading-none text-center" }, "⠿"),
        el("button", { onclick: () => moveRole(idx, 1), disabled: idx === config.roles.length - 1, class: "w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-20" }, "▼"),
      ]),
      inputsUI.input({ id: `role-${idx}-name`, value: role.name || "", oninput: (e) => updateRole(idx, "name", e.target.value) }, "Role Name"),
      inputsUI.input({ id: `role-${idx}-short`, value: role.shorthand || "", oninput: (e) => updateRole(idx, "shorthand", e.target.value) }, "Short"),
      inputsUI.iconButton(Icons.Trash, () => removeRole(idx)),
    ]);

    const gearActive = ui.gear;
    const header = el("div", { class: "flex items-center gap-2 px-3 py-2 bg-[var(--bg-input)] cursor-pointer select-none", onclick: () => { ui.open = !ui.open; if (!ui.open) ui.gear = false; renderRoles(); } }, [
      el("span", { class: "text-[11px] text-[var(--text-muted)] w-3 shrink-0" }, ui.open ? "▾" : "▸"),
      el("span", { class: "text-[12px] font-medium text-[var(--text-primary)] flex-1" }, `Variations & Mapping (${vars.length})`),
      el("span", { class: "text-[10px] text-[var(--text-muted)] truncate max-w-[180px]" }, summary()),
      el("button", {
        class: `w-[22px] h-[22px] shrink-0 flex items-center justify-center rounded-[5px] text-[12px] transition-all ${gearActive ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"}`,
        title: "Mapping settings",
        onclick: (e) => { e.stopPropagation(); ui.gear = !ui.gear; if (!ui.open) ui.open = true; renderRoles(); },
      }, "⚙"),
    ]);

    const body = ui.open ? el("div", { class: "p-2.5 space-y-2" }, [
      ui.gear ? buildSettings() : null,
      !ui.gear ? buildValueInputs() : null,
      !ui.gear ? buildTable() : null,
      !ui.gear && !isAuto ? el("div", { class: "flex items-center justify-between pt-0.5" }, [
        el("span", { class: "text-[10px] text-[var(--text-muted)]" }, "All values entered manually"),
        el("button", { class: "text-[10px] text-[var(--accent)] hover:underline", onclick: () => updateRole(idx, "mappingMode", "auto") }, "Reset to Auto"),
      ]) : null,
    ].filter(Boolean)) : null;

    const section = el("div", { class: "border border-[var(--border)] rounded-[10px] overflow-hidden" }, [header, body].filter(Boolean));

    return [el("div", { class: "space-y-2" }, [nameRow, section])];
  },
};
