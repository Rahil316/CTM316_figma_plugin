/**
 * ============================================================================
 * CTM316 COLOR MATH & UTILITIES
 * Ported verbatim from Web_App/JS/Utils.js — single source of truth for color math.
 * Keep in sync with Utils.js; never add DOM-aware logic here.
 * ============================================================================
 */

// Shared constants — single source of truth for values used across UI and engine
const DEFAULT_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

// Strip non-hex chars, uppercase, clamp to 6 chars. Returns raw hex without '#'.
function sanitizeHex(val) {
  return (val || "")
    .replace(/[^0-9A-Fa-f]/g, "")
    .toUpperCase()
    .substring(0, 6);
}

// Build a default variationTargets array for a role that doesn't yet have one.
function defaultVariationTargets(len, pluginMode, scaleLength) {
  return Array.from({ length: len }, (_, i) => (pluginMode === "adaptiveEngine" ? DEFAULT_VARIATION_TARGETS[i] || 4.5 : Math.floor((scaleLength || 25) / 2)));
}

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
    // Fallback for older browsers or non-secure contexts
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
