/**
 * ============================================================================
 * CTM316 COLOR MATH & UTILITIES
 * Ported verbatim from Web_App/JS/Utils.js — single source of truth for color math.
 * Keep in sync with Utils.js; never add DOM-aware logic here.
 * ============================================================================
 */

/** @param {string} hex */
function validHex(hex) {
  if (typeof hex !== "string") return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/** @param {string} hex */
function normalizeHex(hex) {
  if (!validHex(hex)) return null;
  hex = hex.trim().replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + hex.toUpperCase();
}

/** @param {string} hex */
function hexToRgb(hex) {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  const bigint = parseInt(nhex.replace(/^#/, ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb[0], rgb[1], rgb[2]) : null;
}

function hexToHue(hex) { const hsl = hexToHsl(hex); return hsl ? hsl[0] : null; }
function hexToSat(hex) { const hsl = hexToHsl(hex); return hsl ? hsl[1] : null; }
function hexToLum(hex) { const hsl = hexToHsl(hex); return hsl ? hsl[2] : null; }

function hslToRgb(h, s, l) {
  if (typeof h !== "number" || typeof s !== "number" || typeof l !== "number" || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgb ? rgbToHex(rgb[0], rgb[1], rgb[2]) : null;
}

function relLum(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const n1 = normalizeHex(hex1), n2 = normalizeHex(hex2);
  if (!n1 || !n2) return null;
  const l1 = relLum(n1), l2 = relLum(n2);
  if (l1 === null || l2 === null) return null;
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

function shortestHueDiff(current, target) {
  return ((((target - current + 180) % 360) + 360) % 360) - 180;
}

function contrastRating(hex1, hex2) {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio === null) return null;
  if (ratio < 3) return "Fail";
  if (ratio < 4.5) return "AA Large";
  if (ratio < 7) return "AA";
  return "AAA";
}

function seriesMaker(x) {
  const out = [];
  for (let i = 1; i <= x; i++) out.push(i);
  return out;
}

function slugify(str) {
  if (!str) return "";
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

const debounce = (fn, delay = 150) => {
  let timeout;
  return function () {
    var args = Array.prototype.slice.call(arguments);
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
};

if (typeof document !== "undefined") {
  function withPreservedFocus(fn) {
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
          } catch (e) {}
        }
      }
    }
  }
}

if (typeof document !== "undefined") {
  /**
   * Applies the current UI preferences (scale and theme) to the document body.
   */
  function applyUiPrefs() {
    document.body.style.zoom = uiPrefs.scale;
    document.body.setAttribute("data-ui-theme", uiPrefs.theme);
  }
}

if (typeof parent !== "undefined" && typeof parent.postMessage === "function") {
  /**
   * Persists the current UI preferences to Figma's client storage.
   */
  function saveUiPrefs() {
    parent.postMessage({ pluginMessage: { type: "save-ui-prefs-meta", prefs: uiPrefs } }, "*");
  }
}
