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
    } catch (e) { /* fallback copy — ignore errors */ }
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
  ChevronDown: `<svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.26974 7.35999C7.02426 7.56025 6.66199 7.54569 6.43315 7.31686L0.183152 1.06686C-0.0609254 0.822781 -0.0609255 0.427147 0.183152 0.183069C0.427229 -0.0610085 0.822864 -0.0610085 1.06694 0.183069L6.87505 5.99117L12.6832 0.183069C12.9272 -0.0610087 13.3229 -0.0610087 13.5669 0.183069C13.811 0.427146 13.811 0.822781 13.5669 1.06686L7.31694 7.31686L7.26974 7.35999Z" fill="#ECEEF1"/></svg>`,
  Cog: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6.13542C12 6.01321 11.9116 5.90876 11.791 5.88867L11.1953 5.78971C10.7136 5.70943 10.3599 5.36233 10.196 4.96745C10.0306 4.56911 10.04 4.07821 10.3223 3.68294L10.6738 3.19076C10.7448 3.09132 10.7335 2.95487 10.6471 2.86849L10.1315 2.35286C10.0451 2.26652 9.90867 2.25522 9.80925 2.32617L9.31771 2.67773C8.92232 2.96016 8.43103 2.96948 8.03255 2.80404C7.63764 2.64005 7.29058 2.28647 7.21029 1.80469L7.11133 1.20898C7.09124 1.08844 6.98679 1 6.86458 1H6.13542C6.01321 1 5.90876 1.08844 5.88867 1.20898L5.78971 1.80469C5.70942 2.28643 5.36234 2.64009 4.96745 2.80404C4.56911 2.9694 4.07822 2.95995 3.68294 2.67773L3.19076 2.32617C3.09141 2.25538 2.9555 2.26672 2.86914 2.35286L2.35286 2.86849C2.26648 2.95491 2.2558 3.09132 2.32682 3.19076L2.67773 3.68229C2.96016 4.07768 2.96948 4.56897 2.80404 4.96745C2.64005 5.36236 2.28647 5.70942 1.80469 5.78971L1.20898 5.88867C1.08844 5.90876 1 6.01321 1 6.13542V6.86458C1 6.98679 1.08844 7.09124 1.20898 7.11133L1.80469 7.21029C2.28642 7.29058 2.64009 7.63766 2.80404 8.03255C2.9694 8.43089 2.95996 8.92179 2.67773 9.31706L2.32617 9.80925C2.25522 9.90868 2.26648 10.0451 2.35286 10.1315L2.86849 10.6471C2.95489 10.7335 3.09133 10.7448 3.19076 10.6738L3.68229 10.3223C4.07767 10.0399 4.56898 10.0305 4.96745 10.196C5.36236 10.3599 5.70942 10.7135 5.78971 11.1953L5.88867 11.791C5.90876 11.9116 6.01321 12 6.13542 12H6.86458C6.98679 12 7.09124 11.9116 7.11133 11.791L7.21029 11.1953C7.29058 10.7136 7.63765 10.3599 8.03255 10.196C8.43089 10.0306 8.92177 10.0401 9.31706 10.3223L9.80925 10.6738C9.90858 10.7446 10.0445 10.7333 10.1309 10.6471L10.6471 10.1315C10.7335 10.0452 10.7447 9.90867 10.6738 9.80925L10.3223 9.31771C10.0399 8.92233 10.0305 8.43102 10.196 8.03255C10.3599 7.63764 10.7135 7.29058 11.1953 7.21029L11.791 7.11133C11.9116 7.09124 12 6.98679 12 6.86458V6.13542ZM8.00065 6.5C8.00064 5.67164 7.32899 5.0001 6.50065 5C5.67223 5 5.00066 5.67158 5.00065 6.5C5.00065 7.32843 5.67222 8 6.50065 8C7.32899 7.9999 8.00065 7.32837 8.00065 6.5ZM9.00065 6.5C9.00065 7.88065 7.88128 8.9999 6.50065 9C5.11994 9 4.00065 7.88071 4.00065 6.5C4.00066 5.1193 5.11994 4 6.50065 4C7.88127 4.0001 9.00064 5.11936 9.00065 6.5ZM13 6.86458C13 7.47556 12.5584 7.99711 11.9557 8.09766L11.3594 8.19727C11.2756 8.21136 11.1757 8.28153 11.1198 8.41602C11.0652 8.54742 11.085 8.66485 11.1361 8.73633L11.487 9.22787C11.8421 9.72509 11.7862 10.4065 11.3542 10.8385L10.8385 11.3542C10.4065 11.7862 9.72508 11.8427 9.22787 11.4876L8.73633 11.1361C8.66488 11.085 8.54737 11.0653 8.41602 11.1198C8.28149 11.1757 8.21132 11.2756 8.19727 11.3594L8.09766 11.9557C7.99711 12.5584 7.47556 13 6.86458 13H6.13542C5.52444 13 5.00289 12.5584 4.90234 11.9557L4.80273 11.3594C4.78865 11.2756 4.71847 11.1757 4.58398 11.1198C4.45258 11.0652 4.33515 11.085 4.26367 11.1361L3.77214 11.4876C3.27492 11.8428 2.59353 11.7862 2.16146 11.3542L1.64583 10.8385C1.21377 10.4065 1.15723 9.72509 1.51237 9.22787L1.86393 8.73633C1.91495 8.6649 1.93474 8.54735 1.88021 8.41602C1.82434 8.28148 1.72441 8.21131 1.64062 8.19727L1.04427 8.09766C0.44165 7.99711 0 7.47556 0 6.86458V6.13542C0 5.52444 0.441649 5.00289 1.04427 4.90234L1.64062 4.80273C1.72443 4.78864 1.82432 4.71846 1.88021 4.58398C1.93477 4.45258 1.91498 4.33516 1.86393 4.26367L1.51302 3.77214C1.15786 3.27492 1.21379 2.59354 1.64583 2.16146L2.16146 1.64583C2.59348 1.21381 3.27492 1.15734 3.77214 1.51237L4.26367 1.86393C4.33511 1.91496 4.45264 1.93474 4.58398 1.88021C4.71852 1.82434 4.78868 1.72442 4.80273 1.64062L4.90234 1.04427C5.00289 0.44165 5.52444 0 6.13542 0H6.86458C7.47556 0 7.99711 0.441649 8.09766 1.04427L8.19727 1.64062C8.21136 1.72443 8.28154 1.82433 8.41602 1.88021C8.54742 1.93477 8.66484 1.91498 8.73633 1.86393L9.22787 1.51237C9.72508 1.15723 10.4065 1.2138 10.8385 1.64583L11.3542 2.16146C11.7862 2.59352 11.8428 3.27491 11.4876 3.77214L11.1361 4.26367C11.085 4.3351 11.0653 4.45265 11.1198 4.58398C11.1757 4.71853 11.2756 4.78869 11.3594 4.80273L11.9557 4.90234C12.5584 5.00289 13 5.52444 13 6.13542V6.86458Z" fill="currentColor"/></svg>`,
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
      const trimmed = str.trim();
      // Only parse as markup for SVG strings (Icons.*). All other strings — including
      // user-supplied names — are always inserted as safe text nodes.
      if (trimmed.startsWith("<svg") || trimmed.startsWith("<path")) {
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
  actionButton: (label, onClick, extra = {}) => inputsUI.btn("dashed", { label, onclick: onClick, size: "xl", class: "w-full mb-3", ...extra }),

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
    el("div", { class: "flex items-center gap-2 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] overflow-hidden h-[40px]" }, [
      el("input", {
        type: "color",
        value: normalizeHex(value) || "#000000",
        id: idPrefix ? `${idPrefix}-picker` : null,
        class: "cursor-pointer h-full w-10 shrink-0 bg-transparent border-none rounded-none p-0.5",
        onchange: (e) => onUpdate(e.target.value, null),
      }),
      el("input", {
        type: "text",
        value: value,
        id: idPrefix ? `${idPrefix}-hex` : null,
        class: "w-full bg-transparent text-[13px] uppercase outline-none text-[var(--text-primary)] pr-2",
        oninput: (e) => onUpdate(e.target.value, e.target),
      }),
    ]),

  // ── BUTTON ──
  // Universal button primitive. All interactive buttons in the UI go through here.
  //
  // variant: "primary" | "secondary" | "ghost" | "danger" | "icon"
  // size:    "xs"(20) | "sm"(28) | "md"(32) | "lg"(36, default) | "xl"(40)
  // square:  true → forces equal width/height (for icon-only knob buttons)
  // opts:    { label, icon, disabled, square, class, id, onclick, ... }
  //
  // Size token table (keep in sync with ui.html interactive element heights):
  //   xs  20px — in-card directional arrows, tiny table controls
  //   sm  28px — pill selectors, compact inline buttons
  //   md  32px — icon knob buttons (gear, trash in cards)
  //   lg  36px — labeled action buttons, tabs, Cancel/Done
  //   xl  40px — text inputs, header buttons, primary CTAs
  btn: (variant, opts = {}) => {
    const { label, icon, disabled, size = "lg", square = false, class: extraCls = "", ...rest } = opts;

    const base = "inline-flex items-center justify-center gap-1.5 font-medium transition-all border select-none";
    const sizes = {
      xs: "h-5     px-1     text-[10px] rounded-[4px]",
      sm: "h-[28px] px-2   text-[11px] rounded-[6px]",
      md: "h-[32px] px-2.5 text-[12px] rounded-[7px]",
      lg: "h-[36px] px-3   text-[12px] rounded-[8px]",
      xl: "h-[40px] px-4   text-[13px] rounded-[8px]",
    };
    const squareSizes = {
      xs: "size-5      text-[10px] rounded-[4px]",
      sm: "size-[28px] text-[11px] rounded-[6px]",
      md: "size-[32px] text-[12px] rounded-[7px]",
      lg: "size-[36px] text-[12px] rounded-[8px]",
      xl: "size-[40px] text-[13px] rounded-[8px]",
    };
    const variants = {
      primary: "bg-[var(--accent)] border-[var(--accent)] text-white hover:opacity-90 cursor-pointer",
      secondary: "bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer",
      ghost: "bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer",
      danger: "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/20 cursor-pointer",
      icon: "bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer",
      dashed: "bg-transparent border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer",
    };
    const isSquare = square || variant === "icon";
    const sizeToken = (isSquare ? squareSizes : sizes)[size] ?? (isSquare ? squareSizes.lg : sizes.lg);
    const disabledCls = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";
    const cls = [base, sizeToken, variants[variant] ?? variants.secondary, disabledCls, extraCls].filter(Boolean).join(" ");

    const inner = [icon ? el("span", { class: "flex items-center justify-center shrink-0" }, icon) : null, label ? el("span", {}, label) : null].filter(Boolean);

    return el("button", { ...rest, class: cls, disabled: disabled || null }, inner.length === 1 ? inner[0] : inner);
  },

  // Square icon-only knob button (md = 32px). variant: "danger" | "ghost"
  iconButton: (icon, onClick, variant = "danger", extra = {}) =>
    inputsUI.btn(variant === "danger" ? "danger" : "ghost", {
      icon, onclick: onClick, size: "lg", square: true, ...extra,
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
  return el(
    "div",
    { class: "flex bg-[var(--bg-base)] border border-[var(--border)] rounded-[6px] overflow-hidden h-[28px]" },
    options.map((opt) =>
      el(
        "button",
        {
          class: `flex-1 text-[10px] font-medium px-2 transition-all ${current === opt.value ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`,
          onclick: () => onChange(opt.value),
        },
        opt.label,
      ),
    ),
  );
}

function _settingsRow(label, control) {
  return el("div", { class: "flex items-center justify-between gap-3" }, [el("span", { class: "text-[11px] text-[var(--text-muted)] shrink-0 w-[110px]" }, label), el("div", { class: "flex-1" }, [control])]);
}

function _labelledInput(label, type, value, extra) {
  return el("div", { class: "space-y-1 flex-1" }, [
    el("label", { class: "text-[10px] text-[var(--text-muted)] font-medium block ml-1" }, label),
    el("input", Object.assign({ type, value, class: "w-full h-[28px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[6px] px-2 text-[11px] outline-none text-[var(--text-primary)]" }, extra)),
  ]);
}

function _labelledStatic(label, contentEl) {
  return el("div", { class: "space-y-1" }, [el("label", { class: "text-[10px] text-[var(--text-muted)] font-medium block ml-1 whitespace-nowrap" }, label), el("div", { class: "h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 flex items-center gap-1.5" }, [contentEl])]);
}

const getRoleVariations = (role, config) => {
  return role.variationOverride && role.roleVariations && role.roleVariations.length > 0 ? role.roleVariations : config.variations;
};

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
      el("div", { class: "space-y-1" }, [el("label", { class: "text-[10px] text-[var(--text-muted)] font-medium block ml-1" }, "Value"), inputsUI.colorInput(group.value, (val, elRef) => updateGroup(idx, "value", val, elRef), `clr-${idx}`)]),
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
        el("option", { value: "natural", selected: mode === "natural" ? "selected" : null }, "Balanced"),
        el("option", { value: "saturated", selected: mode === "saturated" ? "selected" : null }, "Vivid"),
        el("option", { value: "luminance", selected: mode === "luminance" ? "selected" : null }, "Muted"),
        el("option", { value: "hue-locked", selected: mode === "hue-locked" ? "selected" : null }, "Hue Locked"),
        el("option", { value: "chroma-maximized", selected: mode === "chroma-maximized" ? "selected" : null }, "Max Chroma"),
      ]),
    ]);
  },

  _ColorAlgoRow: (group, idx, config) => {
    // Show when global algo is off AND scope is "color" (or non-adaptive mode)
    const showOnColor = !config.useGlobalAlgo && (config.pluginMode !== "adaptiveEngine" || config.perColorAlgoScope !== "role");
    if (!showOnColor) return null;
    const algo = group.scaleAlgorithm || config.scaleAlgorithm || "Natural";
    const opts = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    return el("div", { class: "space-y-1" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Scale Algorithm"),
      el(
        "select",
        {
          "data-testid": "color-algo-select",
          onchange: (e) => updateGroup(idx, "scaleAlgorithm", e.target.value),
          class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none appearance-none cursor-pointer text-[var(--text-primary)]",
        },
        opts.map((o) => el("option", { value: o, selected: algo === o ? "selected" : null }, o)),
      ),
    ]);
  },

  _ColorDescriptionRow: (group, idx, config) => (config.includeDescriptions ? inputsUI.input({ value: group.description || "", placeholder: "Optional...", oninput: (e) => updateGroup(idx, "description", e.target.value) }, "Description") : null),

  ColorGroupCard: (group, idx, config) => [Components._ColorMainRow(group, idx, config), Components._ColorSolverRow(group, idx, config), Components._ColorAlgoRow(group, idx, config), Components._ColorDescriptionRow(group, idx, config)].filter(Boolean),

  _RoleAlgoRow: (role, idx, config) => {
    // Show only in adaptive engine mode, global algo off, scope = "role"
    if (config.useGlobalAlgo || config.pluginMode !== "adaptiveEngine" || config.perColorAlgoScope !== "role") return null;
    const algo = role.scaleAlgorithm || config.scaleAlgorithm || "Natural";
    const opts = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    return el("div", { class: "space-y-1 mt-2 pt-2 border-t border-[var(--border)]" }, [
      el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium" }, "Solver Algorithm"),
      el(
        "select",
        {
          "data-testid": "role-algo-select",
          onchange: (e) => setRole(idx, "scaleAlgorithm", e.target.value),
          class: "w-full h-[36px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none appearance-none cursor-pointer text-[var(--text-primary)]",
        },
        opts.map((o) => el("option", { value: o, selected: algo === o ? "selected" : null }, o)),
      ),
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
      const edInpCls = "w-full h-[26px] text-[11px] px-1.5 rounded-[4px] outline-none bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]";
      const cols = useGlobal ? "16px 1fr 88px" : `16px 1fr 56px 88px 24px`;
      const hdrCols = useGlobal ? ["#", "Variation", "Min Contrast"] : ["#", "Name", "Short", "Min Contrast", ""];

      const rows = vars.map((v, vi) => {
        const tgtVal = (role.variationTargets || [])[vi] !== undefined ? role.variationTargets[vi] : 4.5;

        const nameCell = useGlobal
          ? el("span", { class: roLabelCls }, `${v.name || "—"}${v.shorthand ? ` (${v.shorthand})` : ""}`)
          : el("input", {
              type: "text",
              value: v.name || "",
              class: edInpCls,
              oninput: (e) => (role.variationOverride ? updateRoleVariation(idx, vi, "name", e.target.value) : updateSharedVariation(vi, "name", e.target.value)),
            });

        const shortCell = useGlobal
          ? null
          : el("input", {
              type: "text",
              value: v.shorthand || "",
              class: edInpCls,
              oninput: (e) => (role.variationOverride ? updateRoleVariation(idx, vi, "shorthand", e.target.value) : updateSharedVariation(vi, "shorthand", e.target.value)),
            });

        const contrastInp = el("input", {
          type: "number",
          step: "0.1",
          min: "1",
          max: "21",
          value: String(tgtVal),
          class: edInpCls,
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
