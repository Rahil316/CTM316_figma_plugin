      /**
       * ============================================================================
       * UI THREAD LOGIC
       * ============================================================================
       */

      /**
       * 0. STABLE IDENTITY HELPERS
       * Each color and role carries a `_id` that never changes, even when the item
       * is renamed or reordered.  The rename-detector in scripts.js relies on these
       * to distinguish "same item, new name" from "deleted + new item at same slot".
       */
      function generateId() {
        return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      }

      // Assigns a `_id` to any color or role that is missing one (migration for
      // configs saved before this feature existed).  Mutates in place, returns state.
      function ensureIds(state) {
        if (state.colors) state.colors.forEach((c) => { if (!c._id) c._id = generateId(); });
        if (state.roles)  state.roles.forEach((r)  => { if (!r._id) r._id = generateId(); });
        return state;
      }

      /**
       * 1. CORE STATE & DEFAULTS
       * demoConfig serves as the template for factory resets and schema validation.
       * appState is the single source of truth for the session.
       */
      const demoConfig = {
        name: "CTM316",
        colorsCollectionName: "_Colors",
        contextualCollectionName: "contextual",
        skipColorRamps: false,
        tokenGrouping: "color",
        useShortColorNames: false,
        useShortRoleNames: false,
        colorSteps: 25,
        rampType: "Natural",
        colorStepNames: "",
        roleMapping: "Contrast Based",
        roleSteps: 5,
        roleStepNames: "weakest, weak, base, strong, stronger",
        colors: [
          { name: "Primary", shortName: "pr", value: "0067DD" },
          { name: "Secondary", shortName: "sc", value: "EFEFF2" },
          { name: "Gray", shortName: "gr", value: "808080" },
        ],
        roles: [
          { name: "Text", shortName: "tx", spread: 2, minContrast: 4.5, baseIndex: 14 },
          { name: "Fill", shortName: "fi", spread: 1, minContrast: 3.0, baseIndex: 9 },
          { name: "Background", shortName: "bg", spread: 1, minContrast: 1.2, baseIndex: 4 },
          { name: "Border", shortName: "br", spread: 1, minContrast: 2.0, baseIndex: 11 },
        ],
        themes: [
          { name: "light", bg: "FFFFFF" },
          { name: "dark", bg: "000000" },
        ],
      };

      // Ensure demoConfig items have stable IDs from the very first run
      ensureIds(demoConfig);

      let appState = JSON.parse(JSON.stringify(demoConfig));
      // Drag-and-drop state (separate per list to prevent cross-contamination)
      let _colorDragSrcIdx = null;
      let _roleDragSrcIdx = null;
      const _demoConfigStr = JSON.stringify(demoConfig);
      let activeSidebarTab = "color-groups";

      /**
       * 2. UI UTILITIES & FOCUS MANAGEMENT
       * Helpers to ensure smooth DOM updates without losing input focus.
       */
      const debounce = (fn, delay = 150) => {
        let timeout;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          clearTimeout(timeout);
          timeout = setTimeout(() => fn.apply(null, args), delay);
        };
      };

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

      /**
       * 3. COLOR MATH UTILITIES
       * Ported verbatim from Web_App/JS/Utils.js — single source of truth for color math.
       * Keep in sync with Utils.js; never add DOM-aware logic here.
       */

      function validHex(hex) {
        if (typeof hex !== "string") return false;
        return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
      }

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

      function hexToRgb(hex) {
        const nhex = normalizeHex(hex);
        if (!nhex) return null;
        const bigint = parseInt(nhex.replace(/^#/, ""), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
      }

      function rgbToHsl(r, g, b) {
        if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
        let h,
          s,
          l = (max + min) / 2;
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            default:
              h = (r - g) / d + 4;
              break;
          }
          h *= 60;
        }
        return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
      }

      function hexToHsl(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return null;
        return rgbToHsl(rgb[0], rgb[1], rgb[2]);
      }

      function hexToHue(hex) {
        const hsl = hexToHsl(hex);
        return hsl ? hsl[0] : null;
      }
      function hexToSat(hex) {
        const hsl = hexToHsl(hex);
        return hsl ? hsl[1] : null;
      }
      function hexToLum(hex) {
        const hsl = hexToHsl(hex);
        return hsl ? hsl[2] : null;
      }

      function hslToRgb(h, s, l) {
        if (typeof h !== "number" || typeof s !== "number" || typeof l !== "number" || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0,
          g = 0,
          b = 0;
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
        if (!rgb) return null;
        return rgbToHex(rgb[0], rgb[1], rgb[2]);
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
        const n1 = normalizeHex(hex1),
          n2 = normalizeHex(hex2);
        if (!n1 || !n2) return null;
        const l1 = relLum(n1),
          l2 = relLum(n2);
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
        return str
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      /**
       * 4. COLOR ENGINE (UI THREAD)
       * Ported from Web_App/JS/ClrGen.js — runs in UI thread for live preview without postMessage.
       * Uses a separate cache (_previewLastHash/_previewCache) to avoid colliding with code.js cache.
       * Keep in sync with code.js sections 6 & 7 (backend engine).
       */

      let _previewLastHash = null;
      let _previewCache = null;

      function translateConfigForPreview(state) {
        const count = Math.max(1, parseInt(state.colorSteps) || 23);
        const userWeightNames = state.colorStepNames && state.colorStepNames.trim() ? state.colorStepNames.split(",").map((n) => n.trim()) : null;
        let stepNames = null;
        if (userWeightNames && userWeightNames.length > 0) {
          const names = userWeightNames.slice();
          while (names.length < count) names.push(String(names.length + 1));
          stepNames = names.slice(0, count);
        }
        const userVarNames = (state.roleStepNames || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const defaultVarNames = ["weakest", "weak", "base", "strong", "stronger"];
        const roleStepNames = defaultVarNames.map((def, i) => userVarNames[i] || def);
        const themes = state.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
        return {
          name: state.name || "ctm316",
          colors: (state.colors || []).map((g) => ({ name: g.name, shortName: g.shortName, value: g.value })),
          roles: (state.roles || []).map((role) => ({
            name: role.name,
            shortName: role.shortName || role.name.substring(0, 2).toLowerCase(),
            minContrast: String(role.minContrast !== undefined ? role.minContrast : "4.5"),
            spread: Math.max(1, parseInt(role.spread) || 1),
            baseIndex: role.baseIndex !== undefined ? parseInt(role.baseIndex) : Math.floor(count / 2),
            darkBaseIndex: role.darkBaseIndex !== undefined ? parseInt(role.darkBaseIndex) : undefined,
          })),
          colorSteps: count,
          rampType: state.rampType || "Natural",
          roleMapping: state.roleMapping || "Contrast Based",
          colorStepNames: stepNames,
          roleStepNames,
          themes: [
            { name: "light", bg: themes[0].bg || "FFFFFF" },
            { name: "dark", bg: themes[1].bg || "000000" },
          ],
        };
      }

      // ColorSpaces — OKLCH + HCT inlined (no external deps)
      function _lin(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function _dlin(c) {
        return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      }
      function _h2lr(hex) {
        const n = parseInt(hex.replace("#", ""), 16);
        return [_lin(((n >> 16) & 255) / 255), _lin(((n >> 8) & 255) / 255), _lin((n & 255) / 255)];
      }
      function _lr2h(r, g, b) {
        const cl = (v) => Math.max(0, Math.min(255, Math.round(_dlin(Math.max(0, v)) * 255)));
        return "#" + [cl(r), cl(g), cl(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
      }
      function _m3(m, v) {
        return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
      }
      const _M1 = [
        [0.4122214708, 0.5363325363, 0.0514459929],
        [0.2119034982, 0.6806995451, 0.1073969566],
        [0.0883024619, 0.2817188376, 0.6299787005],
      ];
      const _M2 = [
        [0.2104542553, 0.793617785, -0.0040720468],
        [1.9779984951, -2.428592205, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.808675766],
      ];
      const _M2i = [
        [1.0, 0.3963377774, 0.2158037573],
        [1.0, -0.1055613458, -0.0638541728],
        [1.0, -0.0894841775, -1.291485548],
      ];
      const _M1i = [
        [4.0767416621, -3.3077115913, 0.2309699292],
        [-1.2684380046, 2.6097574011, -0.3413193965],
        [-0.0041960863, -0.7034186147, 1.707614701],
      ];
      function hexToOklch(hex) {
        const [r, g, b] = _h2lr(hex);
        const lms = _m3(_M1, [r, g, b]).map((v) => Math.cbrt(Math.max(0, v)));
        const [L, a, b2] = _m3(_M2, lms);
        const C = Math.sqrt(a * a + b2 * b2);
        const H = ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360;
        return { L, C, H };
      }
      function oklchToHex(L, C, H) {
        const a = C * Math.cos((H * Math.PI) / 180);
        const b = C * Math.sin((H * Math.PI) / 180);
        const lms = _m3(_M2i, [L, a, b]).map((v) => v * v * v);
        const [r, g, bl] = _m3(_M1i, lms);
        return _lr2h(r, g, bl);
      }
      const _LX = [
        [0.4123907993, 0.3575843394, 0.1804807884],
        [0.2126390059, 0.7151686788, 0.0721923154],
        [0.0193308187, 0.1191947798, 0.9505321522],
      ];
      const _XL = [
        [3.2409699419, -1.5373831776, -0.4986107603],
        [-0.9692436363, 1.8759675015, 0.0415550574],
        [0.0556300797, -0.2039769589, 1.0569715142],
      ];
      const _VC = (() => {
        const W = [95.047, 100, 108.883];
        const aL = (200 / Math.PI) * Math.pow(66 / 116, 3);
        const F = 1,
          c = 0.69,
          Nc = 1;
        const k = 1 / (5 * aL + 1);
        const FL = 0.2 * k ** 4 * (5 * aL) + 0.1 * (1 - k ** 4) ** 2 * (5 * aL) ** (1 / 3);
        const n = Math.pow(66 / 116, 3);
        const z = 1.48 + Math.sqrt(50 * n),
          Nbb = 0.725 / n ** 0.2,
          Ncb = Nbb;
        const hpe = [
          [0.38971, 0.68898, -0.07868],
          [-0.22981, 1.1834, 0.04641],
          [0, 0, 1],
        ];
        const cat = [
          [0.7328, 0.4296, -0.1624],
          [-0.7036, 1.6975, 0.0061],
          [0.003, 0.0136, 0.9834],
        ];
        const ci = [
          [1.0961238208, -0.2788690002, 0.1827452039],
          [0.4543690419, 0.4735331543, 0.0720978039],
          [-0.0096276087, -0.0056980312, 1.0153256399],
        ];
        const hpi = [
          [1.9101968341, -1.1121238928, 0.2019079568],
          [0.3709500882, 0.6290542574, -0.0000080551],
          [0, 0, 1],
        ];
        const m3 = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
        const D = F * (1 - (1 / 3.6) * Math.exp((-aL - 42) / 92));
        const rW = m3(
          cat,
          W.map((v) => v / 100),
        );
        const Drgb = rW.map((v) => D / v + 1 - D);
        const ad = (c2) => {
          const f = (FL * Math.abs(c2)) ** 0.42;
          return (400 * Math.sign(c2) * f) / (f + 27.13);
        };
        const aW = m3(
          hpe,
          m3(
            ci,
            rW.map((v, i) => v * Drgb[i]),
          ),
        ).map(ad);
        const Aw = (2 * aW[0] + aW[1] + 0.05 * aW[2] - 0.305) * Nbb;
        return { F, c, Nc, Nbb, Ncb, FL, n, z, Aw, D, Drgb, hpe, cat, ci, hpi, ad };
      })();
      function _x2hct(X, Y, Z) {
        const v = _VC,
          m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
        const rgb = m3(v.cat, [X, Y, Z]).map((c2, i) => c2 * v.Drgb[i]);
        const rA = m3(v.hpe, m3(v.ci, rgb)).map(v.ad);
        const p2 = (2 * rA[0] + rA[1] + 0.05 * rA[2] - 0.305) * v.Nbb;
        const a = rA[0] - (12 * rA[1]) / 11 + rA[2] / 11,
          b = (rA[0] + rA[1] - 2 * rA[2]) / 9;
        const hd = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
        const t = ((50000 / 13) * v.Nc * v.Ncb * Math.sqrt(a * a + b * b)) / (p2 + 0.305);
        const J = 100 * Math.pow(p2 / v.Aw, v.c * v.z);
        return { h: hd, c: (t === 0 ? 0 : Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, v.n), 0.73)) * Math.sqrt(J / 100), t: Y <= 0 ? 0 : Y >= 1 ? 100 : 116 * Math.cbrt(Y) - 16 };
      }
      function hexToHct(hex) {
        const [r, g, b] = _h2lr(hex);
        const [X, Y, Z] = _m3(_LX, [r, g, b]);
        return _x2hct(X, Y, Z);
      }
      function _jFromTone(tone) {
        const v = _VC,
          m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
        if (tone <= 0) return 0;
        if (tone >= 100) return 100;
        const Y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3;
        const cat = m3(v.cat, [Y * 0.95047, Y, Y * 1.08883]).map((c2, i) => c2 * v.Drgb[i]);
        const hR = m3(v.hpe, m3(v.ci, cat)).map(v.ad);
        const p2 = (2 * hR[0] + hR[1] + 0.05 * hR[2] - 0.305) * v.Nbb;
        return 100 * Math.pow(Math.max(0, p2 / v.Aw), v.c * v.z);
      }
      function _hctRgbOrNull(hue, ch, J) {
        const v = _VC,
          m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
        if (J <= 0) return null;
        const ta = ch > 0 ? Math.pow(ch / Math.sqrt(J / 100), 1 / 0.9) / Math.pow(1.64 - Math.pow(0.29, v.n), 0.73) : 0;
        const hr = (hue * Math.PI) / 180,
          p1 = (50000 / 13) * v.Nc * v.Ncb,
          p2 = (Math.pow(J / 100, 1 / (v.c * v.z)) * v.Aw) / v.Nbb + 0.305;
        let a, b;
        if (ta <= 0) {
          a = 0;
          b = 0;
        } else {
          const g = (23 * (p2 + 0.305) * ta) / (23 * p1 + 11 * ta * Math.cos(hr) + 108 * ta * Math.sin(hr));
          a = g * Math.cos(hr);
          b = g * Math.sin(hr);
        }
        const Ra = (460 * p2 + 451 * a + 288 * b) / 1403,
          Ga = (460 * p2 - 891 * a - 261 * b) / 1403,
          Ba = (460 * p2 - 220 * a - 6300 * b) / 1403;
        const iv = (c2) => {
          const s = Math.sign(c2);
          return (s * Math.pow(Math.max(0, (Math.abs(c2) * 27.13) / (400 - Math.abs(c2))), 1 / 0.42)) / v.FL;
        };
        const lr = m3(
          _XL,
          m3(
            v.ci,
            m3(v.hpi, [Ra, Ga, Ba].map(iv)).map((c2, i) => c2 / v.Drgb[i]),
          ),
        );
        if (Math.max(...lr) > 1 + 1e-4 || Math.min(...lr) < -1e-4) return null;
        return lr.map((x) => Math.max(0, x));
      }
      function hctToHex(hue, ch, tone) {
        if (ch < 0.0001 || tone <= 0 || tone >= 100) {
          if (tone <= 0) return "#000000";
          if (tone >= 100) return "#ffffff";
          const Y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3;
          const v = Math.round(_dlin(Y) * 255);
          return "#" + v.toString(16).padStart(2, "0").repeat(3);
        }
        const J = _jFromTone(tone);
        if (J <= 0) return "#000000";
        let lo = 0,
          hi = ch,
          best = null;
        for (let it = 0; it < 50; it++) {
          if (hi - lo < 0.01) break;
          const mid = (lo + hi) / 2;
          const rgb = _hctRgbOrNull(hue, mid, J);
          if (rgb === null) {
            hi = mid;
          } else {
            best = _lr2h(...rgb);
            lo = mid;
          }
        }
        return (
          best ||
          "#" +
            Math.round(_dlin(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3) * 255)
              .toString(16)
              .padStart(2, "0")
              .repeat(3)
        );
      }

      function colorRampMaker(hexIn, rampLength, rampType = "Natural") {
        const hue = hexToHue(hexIn);
        const satu = hexToSat(hexIn);
        const N = rampLength;

        if (rampType === "Linear") {
          const inc = 100 / (N + 1);
          const out = [];
          for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
          return out.reverse();
        }

        const C_max = (21 * N) / (N + 1);
        const uMax = Math.log(0.05 * C_max);
        const uMin = Math.log(1.05 / C_max);

        function stepLum(i) {
          const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
          return Math.exp(u) - 0.05;
        }

        function findL(targetLum, getS, getH) {
          let lo = 0,
            hi = 100,
            L = 50;
          for (let j = 0; j < 30; j++) {
            const mid = (lo + hi) / 2;
            const lum = relLum(hslToHex(getH(mid), getS(mid), mid));
            L = mid;
            if (Math.abs(lum - targetLum) < 0.0001) break;
            if (lum < targetLum) lo = mid;
            else hi = mid;
          }
          return L;
        }

        const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);

        if (rampType === "Uniform") {
          const out = [];
          for (let i = 0; i < N; i++) {
            const L = findL(
              stepLum(i),
              () => satu,
              () => hue,
            );
            out.push(hslToHex(hue, satu, L) || "#000000");
          }
          return out;
        }

        if (rampType === "Natural") {
          const out = [];
          for (let i = 0; i < N; i++) {
            const L = findL(stepLum(i), tapS, () => hue);
            out.push(hslToHex(hue, tapS(L), L) || "#000000");
          }
          return out;
        }

        if (rampType === "Expressive") {
          const shiftH = (L) => {
            const d = (L - 50) / 50;
            return (hue + shortestHueDiff(hue, d > 0 ? 60 : 240) * Math.abs(d) * 0.15 + 360) % 360;
          };
          const out = [];
          for (let i = 0; i < N; i++) {
            const L = findL(stepLum(i), tapS, shiftH);
            out.push(hslToHex(shiftH(L), tapS(L), L) || "#000000");
          }
          return out;
        }

        if (rampType === "Symmetric") {
          const srcLum = relLum(normalizeHex(hexIn)) || 0.18;
          const uSrc = Math.log(srcLum + 0.05);
          const mid = Math.floor((N - 1) / 2);
          const out = [];
          for (let i = 0; i < N; i++) {
            let u;
            if (N === 1) u = uSrc;
            else if (i === 0) u = uMax;
            else if (i === N - 1) u = uMin;
            else if (i <= mid && mid > 0) u = uMax - ((uMax - uSrc) * i) / mid;
            else u = uSrc - ((uSrc - uMin) * (i - mid)) / (N - 1 - mid);
            const targetLum = Math.max(0.0001, Math.exp(Math.min(uMax, Math.max(uMin, u))) - 0.05);
            const L = findL(
              targetLum,
              () => satu,
              () => hue,
            );
            out.push(hslToHex(hue, satu, L) || "#000000");
          }
          return out;
        }

        if (rampType === "OKLCH") {
          const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn));
          const out = [];
          for (let i = 0; i < N; i++) {
            const targetLum = stepLum(i);
            let lo = 0,
              hi = 1,
              oL = 0.5;
            for (let j = 0; j < 40; j++) {
              const mid = (lo + hi) / 2;
              const lum = relLum(oklchToHex(mid, srcC, srcH));
              oL = mid;
              if (Math.abs(lum - targetLum) < 0.0001) break;
              if (lum < targetLum) lo = mid;
              else hi = mid;
            }
            out.push(oklchToHex(oL, srcC, srcH) || "#000000");
          }
          return out;
        }

        if (rampType === "Material") {
          const { h: srcH, c: srcC } = hexToHct(normalizeHex(hexIn));
          const out = [];
          for (let i = 0; i < N; i++) {
            const targetLum = stepLum(i);
            let lo = 0,
              hi = 100,
              tone = 50;
            for (let j = 0; j < 40; j++) {
              const mid = (lo + hi) / 2;
              const lum = relLum(hctToHex(srcH, srcC, mid));
              tone = mid;
              if (Math.abs(lum - targetLum) < 0.0001) break;
              if (lum < targetLum) lo = mid;
              else hi = mid;
            }
            out.push(hctToHex(srcH, srcC, tone) || "#000000");
          }
          return out;
        }

        return colorRampMaker(hexIn, rampLength, "Natural");
      }

      function variableMakerUI(config) {
        const inputHash = JSON.stringify({ colors: config.colors, steps: config.colorSteps, rampType: config.rampType, themes: config.themes, roles: config.roles, roleMapping: config.roleMapping, colorStepNames: config.colorStepNames, roleStepNames: config.roleStepNames });
        if (inputHash === _previewLastHash && _previewCache) return _previewCache;

        const colors = config.colors;
        const roles = config.roles;
        const rampLength = config.colorSteps;
        const stepNames = config.colorStepNames || seriesMaker(rampLength);
        const lightBg = normalizeHex(config.themes[0].bg) || "#FFFFFF";
        const darkBg = normalizeHex(config.themes[1].bg) || "#000000";
        const clrRamps = Object.create(null);
        const tokens = { light: Object.create(null), dark: Object.create(null) };
        const errors = { critical: [], warnings: [], notices: [] };

        for (const color of colors) {
          const colorRamp = colorRampMaker(color.value, rampLength, config.rampType);
          const ramp = Object.create(null);
          clrRamps[color.name] = ramp;
          for (let i = 0; i < rampLength; i++) {
            const weight = stepNames[i];
            const value = normalizeHex(colorRamp[i]) || "#000000";
            ramp[weight] = {
              value,
              stepName: `${color.name}-${weight}`,
              shortName: `${color.shortName}-${weight}`,
              contrast: {
                light: { ratio: contrastRatio(value, lightBg), rating: contrastRating(value, lightBg) },
                dark: { ratio: contrastRatio(value, darkBg), rating: contrastRating(value, darkBg) },
              },
            };
          }
        }

        for (const mode of config.themes) {
          const modeName = mode.name.toLowerCase();
          for (const color of colors) {
            const clrName = color.name;
            const conGroup = Object.create(null);
            tokens[modeName][clrName] = conGroup;
            const roleNames = roles.map((_, i) => i);

            for (const roleName of roleNames) {
              const role = roles[roleName];
              const spread = role.spread;
              const conRole = Object.create(null);
              conGroup[roleName] = conRole;
              const cEnd = clrRamps[clrName][stepNames[rampLength - 1]].contrast[modeName].ratio;
              const cStart = clrRamps[clrName][stepNames[0]].contrast[modeName].ratio;
              const growthDir = cEnd > cStart ? 1 : -1;
              const maxOffset = 2 * spread;
              const minAllowed = maxOffset;
              const maxAllowed = rampLength - 1 - maxOffset;

              let baseIdx;
              if (config.roleMapping === "Manual Base Index") {
                const isDarkMode = modeName === "dark";
                const baseIndexSource = isDarkMode && role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex;
                baseIdx = baseIndexSource !== undefined ? parseInt(baseIndexSource) : rampLength >> 1;
              } else {
                baseIdx = -1;
                const isDark = modeName === "dark";
                const minC = parseFloat(role.minContrast);
                if (isDark) {
                  for (let i = rampLength - 1; i >= 0; i--) {
                    if ((clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0) >= minC) {
                      baseIdx = i;
                      break;
                    }
                  }
                } else {
                  for (let i = 0; i < rampLength; i++) {
                    if ((clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0) >= minC) {
                      baseIdx = i;
                      break;
                    }
                  }
                }
                if (baseIdx === -1) {
                  let bestIdx = 0,
                    maxC = -1;
                  for (let i = 0; i < rampLength; i++) {
                    const c = clrRamps[clrName][stepNames[i]].contrast[modeName].ratio || 0;
                    if (c > maxC) {
                      bestIdx = i;
                      maxC = c;
                    }
                  }
                  baseIdx = bestIdx;
                  errors.critical.push({ color: clrName, role: roleName, theme: modeName, error: `Cannot meet minimum contrast ${minC}.` });
                }
              }

              let adjustedBase = false;
              if (minAllowed > maxAllowed) {
                baseIdx = Math.floor((rampLength - 1) / 2);
                adjustedBase = true;
              } else {
                if (baseIdx < minAllowed) {
                  baseIdx = minAllowed;
                  adjustedBase = true;
                }
                if (baseIdx > maxAllowed) {
                  baseIdx = maxAllowed;
                  adjustedBase = true;
                }
              }
              if (adjustedBase) errors.warnings.push({ color: clrName, role: roleName, theme: modeName, warning: `Base index clamped to ${baseIdx} due to spread constraints.` });

              const offsets = [
                { key: "weakest", offset: -2 * spread },
                { key: "weak", offset: -spread },
                { key: "base", offset: 0 },
                { key: "strong", offset: spread },
                { key: "stronger", offset: 2 * spread },
              ];

              for (const { key: variation, offset } of offsets) {
                let idx = baseIdx + offset * growthDir;
                let adjusted = false;
                if (idx < 0) {
                  idx = 0;
                  adjusted = true;
                } else if (idx >= rampLength) {
                  idx = rampLength - 1;
                  adjusted = true;
                }
                const data = clrRamps[clrName][stepNames[idx]];
                conRole[variation] = {
                  tknName: `${clrName}-${role.name}-${variation}`,
                  color: clrName,
                  role: role.name,
                  variation,
                  tknRef: data.stepName,
                  value: data.value,
                  contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
                  isAdjusted: adjusted,
                };
                if (adjusted) errors.warnings.push({ color: clrName, role: roleName, variation, theme: modeName, warning: `Variation '${variation}' clamped due to overflow.` });
              }
            }
          }
        }

        const output = { colorRamps: clrRamps, colorTokens: tokens, errors };
        _previewLastHash = inputHash;
        _previewCache = output;
        return output;
      }

      /**
       * 5. DYNAMIC DOM GENERATORS
       * These functions convert appState into interactive UI cards.
       * Uses document fragments for performance.
       */
      const renderColorGroups = debounce(() => {
        if (activeSidebarTab !== "color-groups") return;
        withPreservedFocus(() => {
          const container = document.getElementById("sidebar-content-container");
          const fragment = document.createDocumentFragment();

          const addButton = document.createElement("button");
          addButton.className = "w-full h-10 px-4 mb-2 bg-transparent text-[var(--accent)] border-2 border-dashed border-[var(--accent)] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2";
          addButton.innerHTML = `<span>+ Add Color Group</span>`;
          addButton.onclick = addGroup;
          fragment.appendChild(addButton);

          appState.colors.forEach((group, idx) => {
            const hexValue = normalizeHex(group.value) || "#8E8E93";
            const lightBgHex = normalizeHex(appState.themes[0].bg) || "#FFFFFF";
            const darkBgHex = normalizeHex(appState.themes[1].bg) || "#000000";
            const lightC = contrastRatio(hexValue, lightBgHex) || 0;
            const darkC = contrastRatio(hexValue, darkBgHex) || 0;
            const gId = `group-${idx}`;

            const card = document.createElement("div");
            card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2";
            card.draggable = true;

            // ── Color group drag-and-drop ────────────────────────────────────
            card.addEventListener("dragstart", (e) => {
              _colorDragSrcIdx = idx;
              e.dataTransfer.effectAllowed = "move";
              card.style.opacity = "0.5";
            });
            card.addEventListener("dragend", () => {
              _colorDragSrcIdx = null;
              card.style.opacity = "";
              document.querySelectorAll(".color-group-card-plugin").forEach((c) => {
                c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              });
            });
            card.addEventListener("dragover", (e) => {
              if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              document.querySelectorAll(".color-group-card-plugin").forEach((c) => {
                c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              });
              card.classList.add("border-t-2", "!border-t-[var(--accent)]");
            });
            card.addEventListener("dragleave", (e) => {
              if (!card.contains(e.relatedTarget)) {
                card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              }
            });
            card.addEventListener("drop", (e) => {
              e.preventDefault();
              if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
              const from = _colorDragSrcIdx;
              const to = idx;
              const [moved] = appState.colors.splice(from, 1);
              appState.colors.splice(to, 0, moved);
              renderColorGroups();
            });
            card.classList.add("color-group-card-plugin");

            card.innerHTML = `
                <div class="grid grid-cols-[20px_1fr_1fr_40px] gap-2">
                  <div class="flex flex-col gap-0.5 self-center">
                    <button onclick="moveGroup(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
                    <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
                    <button onclick="moveGroup(${idx}, 1)" ${idx === appState.colors.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
                  </div>
                  <div class="flex-[3] space-y-1">
                    <label for="${gId}-name" class="text-[var(--text-muted)] text-[12px] font-medium">Color Name</label>
                    <input type="text" id="${gId}-name" value="${group.name}" oninput="updateGroup(${idx}, 'name', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
                  </div>
                  <div class="flex-[4] space-y-1">
                    <label for="${gId}-hex" class="text-[var(--text-muted)] text-[12px] font-medium">Seed Hex</label>
                    <div class="flex items-center gap-2 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 pl-1 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px]">
                        <input type="color" value="${hexValue}" onchange="updateGroup(${idx}, 'value', this.value)" class="cursor-pointer size- bg-transparent border-none rounded-[8px]">
                        <input type="text" id="${gId}-hex" value="${group.value}" oninput="updateGroup(${idx}, 'value', this.value, this)" class="w-full bg-transparent text-[13px] uppercase outline-none text-[var(--text-primary)]">
                    </div>
                  </div>
                  <button onclick="removeGroup(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 self-end size-[40px] flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">
                    <svg width="16" height="16" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>
                  </button>
                </div>
                <div class="grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
                  <div class="flex-[3] space-y-1">
                    <label for="${gId}-short" class="text-[var(--text-muted)] text-[12px] font-medium">Short Name</label>
                    <input type="text" id="${gId}-short" value="${group.shortName}" oninput="updateGroup(${idx}, 'shortName', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
                  </div>
                  <div class="flex-[3.5] space-y-1">
                    <span class="text-[var(--text-muted)] text-[12px] font-medium">Contrast- Light</span>
                    <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
                      <span>${lightC.toFixed(2)}:1</span>
                      <span class="font-bold ${lightC >= 4.5 ? "text-[var(--success)]" : lightC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, lightBgHex)}</span>
                    </div>
                  </div>
                  <div class="flex-[3.5] space-y-1">
                    <span class="text-[var(--text-muted)] text-[12px] font-medium">Contrast- Dark</span>
                    <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
                      <span>${darkC.toFixed(2)}:1</span>
                      <span class="font-bold ${darkC >= 4.5 ? "text-[var(--success)]" : darkC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, darkBgHex)}</span>
                    </div>
                  </div>
                </div>
              `;
            // Prevent accidental drags from interactive children
            card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
            fragment.appendChild(card);
          });

          container.innerHTML = "";
          container.appendChild(fragment);
        });
      }, 50);

      const renderRoles = debounce(() => {
        if (activeSidebarTab !== "roles-config") return;
        withPreservedFocus(() => {
          const container = document.getElementById("sidebar-content-container");
          const fragment = document.createDocumentFragment();

          const addButton = document.createElement("button");
          addButton.className = "w-full h-10 px-4 mb-2 bg-transparent text-[var(--accent)] border-2 border-dashed border-[var(--accent)] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2";
          addButton.innerHTML = `<span>+ Add Theme Role</span>`;
          addButton.onclick = addRole;
          fragment.appendChild(addButton);

          const variations = (appState.roleVariationsNames || "weakest, weak, base, strong, stronger").split(",").map((v) => v.trim());

          const trashSvg = `<svg width="14" height="14" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>`;

          appState.roles.forEach((role, idx) => {
            const card = document.createElement("div");
            card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2";
            card.draggable = true;
            card.classList.add("role-card-plugin");

            // ── Role drag-and-drop ───────────────────────────────────────────
            card.addEventListener("dragstart", (e) => {
              _roleDragSrcIdx = idx;
              e.dataTransfer.effectAllowed = "move";
              card.style.opacity = "0.5";
            });
            card.addEventListener("dragend", () => {
              _roleDragSrcIdx = null;
              card.style.opacity = "";
              document.querySelectorAll(".role-card-plugin").forEach((c) => {
                c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              });
            });
            card.addEventListener("dragover", (e) => {
              if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              document.querySelectorAll(".role-card-plugin").forEach((c) => {
                c.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              });
              card.classList.add("border-t-2", "!border-t-[var(--accent)]");
            });
            card.addEventListener("dragleave", (e) => {
              if (!card.contains(e.relatedTarget)) {
                card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
              }
            });
            card.addEventListener("drop", (e) => {
              e.preventDefault();
              if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
              const from = _roleDragSrcIdx;
              const to = idx;
              const [moved] = appState.roles.splice(from, 1);
              appState.roles.splice(to, 0, moved);
              renderRoles();
            });

            const mappingMethod = appState.roleMapping || "Contrast Based";
            const mid = Math.floor(appState.colorSteps / 2);

            let secondRowHtml = "";
            if (mappingMethod === "Contrast Based") {
              secondRowHtml = `
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-contrast" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Min Contrast</label>
                    <input type="number" id="role-${idx}-contrast" step="0.1" value="${role.minContrast || "4.5"}" onchange="updateRole(${idx}, 'minContrast', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-spread" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Spread</label>
                    <input type="number" id="role-${idx}-spread" value="${role.spread || 1}" onchange="updateRole(${idx}, 'spread', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
            } else {
              const lightBase = (role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
              const darkBase = (role.darkBaseIndex !== undefined ? role.darkBaseIndex : role.baseIndex !== undefined ? role.baseIndex : mid) + 1;
              secondRowHtml = `
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-1">
                    <label for="role-${idx}-base" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Base ☀️</label>
                    <input type="number" id="role-${idx}-base" value="${lightBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'baseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-darkbase" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Base 🌙</label>
                    <input type="number" id="role-${idx}-darkbase" value="${darkBase}" min="1" max="${appState.colorSteps}" onchange="updateRole(${idx}, 'darkBaseIndex', parseInt(this.value) - 1)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                  <div class="space-y-1">
                    <label for="role-${idx}-spread" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Spread</label>
                    <input type="number" id="role-${idx}-spread" value="${role.spread || 1}" onchange="updateRole(${idx}, 'spread', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                  </div>
                </div>`;
            }

            card.innerHTML = `
              <div class="flex items-end gap-2">
                <div class="flex flex-col gap-0.5 self-center flex-shrink-0">
                  <button onclick="moveRole(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
                  <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
                  <button onclick="moveRole(${idx}, 1)" ${idx === appState.roles.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
                </div>
                <div class="flex-1 space-y-1">
                  <label for="role-${idx}-name" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Role Name</label>
                  <input type="text" id="role-${idx}-name" value="${role.name || ""}" oninput="updateRole(${idx}, 'name', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                </div>
                <div class="w-[72px] space-y-1">
                  <label for="role-${idx}-short" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Short</label>
                  <input type="text" id="role-${idx}-short" value="${role.shortName || ""}" oninput="updateRole(${idx}, 'shortName', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
                </div>
                <button onclick="removeRole(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 size-[40px] shrink-0 flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">${trashSvg}</button>
              </div>
              ${secondRowHtml}`;
            // Prevent accidental drags from interactive children
            card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
            fragment.appendChild(card);
          });

          container.innerHTML = "";
          container.appendChild(fragment);
        });
      }, 50);

      // 5. EVENT HANDLERS
      function toggleSection(id, event) {
        if (event && event.target.closest("button")) return;
        const section = document.getElementById(id);
        const isCollapsed = section.classList.toggle("collapsed");
        const trigger = section.querySelector('[role="button"]');
        if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
      }

      function showSheet(id) {
        document.getElementById(id).classList.add("open");
        document.getElementById("overlay").classList.add("active");
        document.body.style.overflow = "hidden";
      }

      function hideSheets() {
        document.querySelectorAll(".bottom-sheet").forEach((s) => s.classList.remove("open"));
        document.getElementById("overlay").classList.remove("active");
        document.body.style.overflow = "";
      }

      function showOverlay(id) {
        document.getElementById(id).classList.remove("hidden");
      }

      function hideOverlay(id) {
        document.getElementById(id).classList.add("hidden");
        if (id === "success-overlay" || id === "error-overlay") hideSheets();
        if (id === "preview-overlay") {
          document.getElementById("preview-errors-body").classList.remove("open");
        }
      }

      function updateGroup(idx, key, value, el) {
        if (key === "value") {
          const clean = value
            .replace(/[^0-9A-Fa-f]/g, "")
            .toUpperCase()
            .substring(0, 6);
          if (el && el.value !== clean) {
            const start = el.selectionStart;
            el.value = clean;
            el.setSelectionRange(start, start);
          }
          appState.colors[idx].value = clean;
          renderColorGroups();
        } else {
          appState.colors[idx][key] = value;
          if (key === "name") renderColorGroups();
        }
      }

      function removeGroup(idx) {
        appState.colors.splice(idx, 1);
        renderColorGroups();
      }

      function moveGroup(idx, dir) {
        const target = idx + dir;
        if (target < 0 || target >= appState.colors.length) return;
        const [item] = appState.colors.splice(idx, 1);
        appState.colors.splice(target, 0, item);
        renderColorGroups();
      }

      function addGroup() {
        const n = appState.colors.length + 1;
        appState.colors.unshift({ _id: generateId(), name: `color${n}`, shortName: `C${n}`, value: "888888" });
        renderColorGroups();
      }

      function updateRole(idx, key, value) {
        if (key === "minContrast") {
          let v = parseFloat(value);
          if (isNaN(v)) v = 1;
          appState.roles[idx].minContrast = Math.max(1, Math.min(21, v)).toString();
        } else if (key === "spread") {
          let v = parseInt(value);
          if (isNaN(v)) v = 1;
          appState.roles[idx].spread = Math.max(1, Math.min(21, v));
        } else if (key === "baseIndex" || key === "darkBaseIndex") {
          let v = parseInt(value);
          if (isNaN(v)) v = 0;
          appState.roles[idx][key] = Math.max(0, Math.min(appState.colorSteps - 1, v));
        } else {
          appState.roles[idx][key] = value;
        }
        renderRoles();
      }

      function removeRole(idx) {
        appState.roles.splice(idx, 1);
        renderRoles();
      }

      function moveRole(idx, dir) {
        const target = idx + dir;
        if (target < 0 || target >= appState.roles.length) return;
        const [item] = appState.roles.splice(idx, 1);
        appState.roles.splice(target, 0, item);
        renderRoles();
      }

      function addRole() {
        const n = appState.roles.length + 1;
        const mid = Math.floor(appState.colorSteps / 2);
        appState.roles.unshift({ _id: generateId(), name: "Role " + n, shortName: `r-${n}`, spread: 2, minContrast: 4.5, baseIndex: mid, darkBaseIndex: mid });
        renderRoles();
      }

      function toggleBoolSetting(key) {
        appState[key] = !appState[key];
        syncOutputToggles();
      }

      function setTokenGrouping(val) {
        appState.tokenGrouping = val;
        syncOutputToggles();
      }

      function syncOutputToggles() {
        const tg = appState.tokenGrouping || "color";
        // Sync all toggle pills (settings sheet + run dialog)
        ["skipColorRamps", "useShortColorNames", "useShortRoleNames"].forEach((key) => {
          ["toggle-" + key, "rd-toggle-" + key].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.toggle("on", !!appState[key]);
          });
        });
        // Sync grouping segment buttons
        [
          ["seg-group-color", "rd-seg-group-color"],
          ["seg-group-role", "rd-seg-group-role"],
        ].forEach(([settingsId, rdId]) => {
          const isColor = tg === "color";
          const isRole = tg === "role";
          const s = document.getElementById(settingsId);
          const r = document.getElementById(rdId);
          if (settingsId.includes("color")) {
            if (s) s.classList.toggle("active", isColor);
            if (r) r.classList.toggle("active", isColor);
          } else {
            if (s) s.classList.toggle("active", isRole);
            if (r) r.classList.toggle("active", isRole);
          }
        });
        // Update settings-sheet name format preview
        const sampleColor = appState.colors && appState.colors[0];
        const sampleRole = appState.roles && appState.roles[0];
        if (sampleColor && sampleRole) {
          const cLabel = appState.useShortColorNames ? sampleColor.shortName || sampleColor.name : sampleColor.name;
          const rLabel = appState.useShortRoleNames ? sampleRole.shortName || sampleRole.name : sampleRole.name;
          const stepLabel = (appState.roleStepNames || "base").split(",")[2]?.trim() || "base";
          const preview = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
          const el = document.getElementById("name-format-preview");
          if (el) el.textContent = preview;
        }
      }

      function updateSettingsFromInputs() {
        appState.name = document.getElementById("setting-name").value;
        appState.colorsCollectionName = document.getElementById("setting-colorsCollectionName").value.trim() || "_Colors";
        appState.contextualCollectionName = document.getElementById("setting-tokensCollectionName").value.trim() || "contextual";
        const sanitizeHex = (id) => {
          const el = document.getElementById(id);
          const clean = el.value
            .replace(/[^0-9A-Fa-f]/g, "")
            .toUpperCase()
            .substring(0, 6);
          if (el.value !== clean) el.value = clean;
          return clean;
        };
        if (!appState.themes)
          appState.themes = [
            { name: "light", bg: "FFFFFF" },
            { name: "dark", bg: "000000" },
          ];
        appState.themes[0].bg = sanitizeHex("setting-light-bg");
        appState.themes[1].bg = sanitizeHex("setting-dark-bg");

        // Color Settings
        let wCount = parseInt(document.getElementById("setting-colorSteps").value);
        appState.colorSteps = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
        appState.rampType = document.getElementById("setting-rampType").value;
        appState.colorStepNames = document.getElementById("setting-colorStepNames").value;

        // Role Settings
        appState.roleSteps = 5; // fixed at 5 — variations count is not configurable
        appState.roleMapping = document.getElementById("setting-roleMapping").value;
        appState.roleStepNames = document.getElementById("setting-roleStepNames").value;

        renderColorGroups();
        renderRoles();
      }

      function syncInputsFromState() {
        document.getElementById("setting-name").value = appState.name || "";
        document.getElementById("setting-colorsCollectionName").value = appState.colorsCollectionName || "_Colors";
        document.getElementById("setting-tokensCollectionName").value = appState.contextualCollectionName || "contextual";
        syncOutputToggles();
        const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
        document.getElementById("setting-light-bg").value = themes[0].bg;
        document.getElementById("setting-dark-bg").value = themes[1].bg;

        // Color Settings
        document.getElementById("setting-colorSteps").value = appState.colorSteps;
        document.getElementById("setting-rampType").value = appState.rampType || "Natural";
        document.getElementById("setting-colorStepNames").value = appState.colorStepNames || "";

        // Role Settings (roleSteps is fixed at 5, no DOM sync needed)
        document.getElementById("setting-roleMapping").value = appState.roleMapping || "Contrast Based";
        document.getElementById("setting-roleStepNames").value = appState.roleStepNames;
      }

      /**
       * 6. DATA PERSISTENCE & ASYNC BRIDGE
       * Handlers for Figma API syncing, file imports, and data exports.
       */
      function validateUniqueness() {
        const colorNames = appState.colors.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
        const colorShorts = appState.colors.map((c) => (c.shortName || "").trim().toLowerCase()).filter(Boolean);
        const roleNames = appState.roles.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
        const roleShorts = appState.roles.map((r) => (r.shortName || "").trim().toLowerCase()).filter(Boolean);
        const hasDup = (arr) => new Set(arr).size !== arr.length;
        if (hasDup(colorNames)) return "Two or more color groups share the same name. Each color name must be unique.";
        if (colorShorts.length && hasDup(colorShorts)) return "Two or more color groups share the same short name. Each color short name must be unique.";
        if (hasDup(roleNames)) return "Two or more roles share the same name. Each role name must be unique.";
        if (roleShorts.length && hasDup(roleShorts)) return "Two or more roles share the same short name. Each role short name must be unique.";
        return null;
      }

      let pendingScope = "all";
      // savedState: the snapshot loaded from Figma on startup — used for rename detection.
      // Stays frozen at the originally loaded state; does NOT update as the user edits appState.
      let savedState = null;

      function handleSubmit(scope = "all") {
        const dupError = validateUniqueness();
        if (dupError) {
          showOverlay("error-overlay");
          document.getElementById("error-message").textContent = dupError;
          return;
        }
        pendingScope = scope;
        parent.postMessage(
          {
            pluginMessage: {
              type: "check-collections",
              colorName: appState.colorsCollectionName || "_Colors",
              contextualName: appState.contextualCollectionName || "contextual",
              state: appState,
              savedState: savedState,
            },
          },
          "*",
        );
      }

      function proceedWithSync() {
        showOverlay("loading-overlay");
        setTimeout(() => {
          parent.postMessage({ pluginMessage: { type: "run-creater", state: appState, scope: pendingScope, savedState: savedState } }, "*");
        }, 50);
      }

      function renderPreviewPanel(result) {
        const lightBgHex = normalizeHex(appState.themes[0].bg) || "#FFFFFF";
        const darkBgHex = normalizeHex(appState.themes[1].bg) || "#000000";

        // Color Ramps Tab
        const colorEl = document.getElementById("preview-colors");
        colorEl.innerHTML = "";
        for (const [colorName, ramp] of Object.entries(result.colorRamps)) {
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
            step.className = `preview-swatch bg-[${data.value}] flex-1 h-full hover:flex-[4] hover:z-10 hover:[transform:scaleY(1.15)] hover:rounded-[8px] hover:[box-shadow:0_15px_40px_#00000044]`;
            step.setAttribute("data-copy", data.value);

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

        // Theme tabs helper
        const REF_VAR_KEYS = ["weakest", "weak", "base", "strong", "stronger"];
        const varDisplayNames = (appState.roleStepNames || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const varLabel = (refKey) => {
          const i = REF_VAR_KEYS.indexOf(refKey);
          return i >= 0 && varDisplayNames[i] ? varDisplayNames[i] : refKey;
        };

        function renderThemePanel(panelId, themeTokens, bgHex) {
          const el = document.getElementById(panelId);
          el.innerHTML = "";

          for (const [colorName, roles] of Object.entries(themeTokens)) {
            const ramp = result.colorRamps[colorName];
            const baseColor = ramp ? ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value : "#888";

            const section = document.createElement("div");
            section.innerHTML = `
              <div class="grid grid-cols-[32px_1fr_auto]">
                <div class="size-6 rounded-md bg-[${baseColor}]"></div>
                <div class="text-[12px] font-bold">${colorName}</div>
              </div>
              <div class="preview-section-content"></div>`;

            const content = section.querySelector(".preview-section-content");
            for (const [roleName, variations] of Object.entries(roles)) {
              const roleGroup = document.createElement("div");
              roleGroup.className = "mb-2";
              const rName = (appState.roles[roleName] && appState.roles[roleName].name) || roleName;
              roleGroup.innerHTML = `
                <div class="flex items-center gap-1 mb-2">
                  <div class="text-[11px] font-extrabold opacity-40 tracking-[0.15em]">${rName}</div>
                  <div class="flex-1 h-px bg-current opacity-10"></div>
                </div>
                <div class="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]"></div>`;

              const grid = roleGroup.querySelector(".grid");
              for (const [varKey, token] of Object.entries(variations)) {
                if (!token) continue;
                const card = document.createElement("div");
                card.className = "preview-swatch bg-[#8888880d] border border-[#8888881a] rounded-[20px] p-1.5 flex flex-col gap-1.5 transition-all duration-140 ease-in-out cursor-pointer hover:bg-[#8888881a] hover:-translate-y-1 hover:shadow-[0_12px_30px_#0000001f]";
                card.setAttribute("data-copy", token.value);
                card.setAttribute("data-copy-name", token.tknName);

                const contrastColor = (contrastRatio(token.value, "#FFFFFF") || 0) > (contrastRatio(token.value, "#000000") || 0) ? "#FFFFFF" : "#000000";

                card.innerHTML = `
                  <div class="h-20 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center" style="background:${token.value};color:${contrastColor}">
                    <div class="text-2xl font-black tracking-[-0.05em] opacity-90">${token.contrast.ratio}</div>
                    <div class="text-[9px] font-black px-1.5 py-0.5 bg-black/20 backdrop-blur-sm rounded-[6px] border border-white/10 text-white">${token.contrast.rating}</div>
                    ${token.isAdjusted ? `<div class="absolute bottom-2 right-2 bg-[var(--warning)] text-black w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-black">!</div>` : ""}
                  </div>
                  <div class="px-2 pt-1 pb-2">
                    <div class="text-[11px] font-extrabold uppercase tracking-[0.05em] mb-0.5">${varLabel(varKey)}</div>
                    <div class="text-[10px] font-mono opacity-50 font-semibold">${token.value}</div>
                  </div>`;
                grid.appendChild(card);
              }
              content.appendChild(roleGroup);
            }
            el.appendChild(section);
          }
        }

        renderThemePanel("preview-light", result.colorTokens.light, lightBgHex);
        renderThemePanel("preview-dark", result.colorTokens.dark, darkBgHex);

        // Error bar
        const allErrors = result.errors;
        const critCount = allErrors.critical.length;
        const warnCount = allErrors.warnings.length;
        const errBar = document.getElementById("preview-errors-bar");
        if (critCount + warnCount > 0) {
          errBar.classList.remove("hidden");
          document.getElementById("preview-errors-count").textContent = `${critCount} critical · ${warnCount} warnings`;
          const body = document.getElementById("preview-errors-body");
          body.innerHTML = "";
          for (const e of allErrors.critical) {
            const item = document.createElement("div");
            item.className = "py-1 px-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]";
            item.textContent = `⛔ ${e.color} · ${e.role} [${e.theme}]: ${e.error}`;
            body.appendChild(item);
          }
          for (const e of allErrors.warnings) {
            const item = document.createElement("div");
            item.className = "py-1 px-3 text-[10px] text-[var(--warning)] border-t border-[var(--border)]";
            item.textContent = `⚠️ ${e.color} · ${e.role} [${e.theme}]: ${e.warning}`;
            body.appendChild(item);
          }
        } else {
          errBar.classList.add("hidden");
        }
      }

      function togglePreviewErrors() {
        document.getElementById("preview-errors-body").classList.toggle("open");
      }

      function toggleRunErrors() {
        document.getElementById("run-errors-body").classList.toggle("open");
      }

      function renderRunErrors(errors) {
        const bar = document.getElementById("run-errors-bar");
        const body = document.getElementById("run-errors-body");
        if (!errors) {
          bar.classList.add("hidden");
          return;
        }
        const critCount = errors.critical.length;
        const warnCount = errors.warnings.length;
        if (critCount + warnCount === 0) {
          bar.classList.add("hidden");
          return;
        }
        bar.classList.remove("hidden");
        document.getElementById("run-errors-count").textContent = `${critCount} critical · ${warnCount} warnings`;
        body.innerHTML = "";
        for (const e of errors.critical) {
          const item = document.createElement("div");
          item.className = "py-1 px-3 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]";
          item.textContent = `⛔ ${e.color} · ${e.role} [${e.theme}]: ${e.error}`;
          body.appendChild(item);
        }
        for (const w of errors.warnings) {
          const item = document.createElement("div");
          item.className = "py-1 px-3 text-[10px] text-[var(--warning)] border-t border-[var(--border)]";
          item.textContent = `⚠ ${w.color} · ${w.role}${w.variation ? ` · ${w.variation}` : ""} [${w.theme}]: ${w.warning}`;
          body.appendChild(item);
        }
      }

      function showToast(msg) {
        const t = document.getElementById("toast");
        if (t) {
          document.getElementById("toast-msg").textContent = msg;
          t.classList.add("show");
          setTimeout(() => t.classList.remove("show"), 2000);
        }
      }

      // Copy-to-clipboard inside preview (delegated)
      document.addEventListener("click", async (e) => {
        const swatch = e.target.closest(".preview-swatch[data-copy]");
        if (!swatch) return;

        const val = swatch.getAttribute("data-copy");
        const name = swatch.getAttribute("data-copy-name");

        try {
          // Alt+Click copies the name
          const text = e.altKey && name ? name : val;
          await navigator.clipboard.writeText(text);
          showToast(`Copied ${text}`);
        } catch (_) {}
      });

      // Preview tab switching
      document.getElementById("preview-tabs").addEventListener("click", (e) => {
        const btn = e.target.closest(".preview-tab-btn");
        if (!btn) return;

        const target = btn.dataset.target;
        const overlay = document.getElementById("preview-overlay");

        // Remove old theme classes
        overlay.classList.remove("theme-light", "theme-dark", "theme-ramps");

        // Add new theme class
        if (target === "preview-light") overlay.classList.add("theme-light");
        else if (target === "preview-dark") overlay.classList.add("theme-dark");
        else overlay.classList.add("theme-ramps");

        document.querySelectorAll(".preview-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".preview-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(target).classList.add("active");
      });

      // 6. INITIALIZATIONS & GLOBAL LISTENERS
      document.getElementById("btn-settings").onclick = () => showSheet("settings-sheet");
      document.getElementById("btn-more").onclick = () => showSheet("more-sheet");
      document.getElementById("overlay").onclick = hideSheets;
      document.getElementById("close-settings").onclick = () => {
        updateSettingsFromInputs();
        hideSheets();
      };
      document.getElementById("close-more").onclick = hideSheets;
      document.getElementById("btn-run").onclick = () => handleSubmit("all");
      document.getElementById("btn-import").onclick = () => document.getElementById("file-input").click();

      document.getElementById("btn-preview").onclick = () => {
        const result = variableMakerUI(translateConfigForPreview(appState));
        // Reset to Color Ramps tab each time
        document.querySelectorAll(".preview-tab-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
        document.querySelectorAll(".preview-panel").forEach((p, i) => p.classList.toggle("active", i === 0));
        renderPreviewPanel(result);
        showOverlay("preview-overlay");
      };

      document.getElementById("preview-close").onclick = () => {
        hideOverlay("preview-overlay");
        document.getElementById("preview-overlay").classList.remove("theme-light", "theme-dark", "theme-ramps");
      };

      // Sidebar Tab Logic
      const sidebarTabs = document.querySelectorAll(".sidebar-tab-btn");
      sidebarTabs.forEach((btn) => {
        btn.onclick = () => {
          activeSidebarTab = btn.dataset.tab;
          sidebarTabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === activeSidebarTab));
          if (activeSidebarTab === "color-groups") renderColorGroups();
          else if (activeSidebarTab === "roles-config") renderRoles();
        };
      });

      // Initial Render
      renderColorGroups();

      // Export filename helper — systemName_type_YYYY-MM-DD_HH-MM.ext
      function exportFileName(type, ext) {
        const name = (appState.name || "design_system").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
        return `${name}_${type}_${date}_${time}.${ext}`;
      }

      function triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType || "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Export Options
      document.getElementById("opt-save-config").onclick = () => {
        triggerDownload(JSON.stringify(appState, null, 2), exportFileName("config", "json"), "application/json");
        hideSheets();
      };

      document.getElementById("opt-export-css").onclick = () => {
        parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "css" } }, "*");
        hideSheets();
      };

      document.getElementById("opt-export-csv").onclick = () => {
        parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "csv" } }, "*");
        hideSheets();
      };

      document.getElementById("opt-export-scss").onclick = () => {
        parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "scss" } }, "*");
        hideSheets();
      };

      // --- IMPORT & SAFETY LOGIC ---
      function isStateDirty() {
        return JSON.stringify(appState) !== _demoConfigStr;
      }

      function validateImportData(json) {
        return json && typeof json === "object" && Array.isArray(json.colors) && Array.isArray(json.roles);
      }

      function handleFileSelection(file) {
        if (!file.name.toLowerCase().endsWith(".json")) {
          showOverlay("error-overlay");
          document.getElementById("error-message").textContent = "Please upload a valid .json file.";
          return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const json = JSON.parse(ev.target.result);
            if (!validateImportData(json)) {
              throw new Error("JSON structure is incompatible with ctm316 system.");
            }

            if (isStateDirty()) {
              showConfirmationWorkflow(json);
            } else {
              applyImport(json);
            }
          } catch (err) {
            showOverlay("error-overlay");
            document.getElementById("error-message").textContent = err.message || "Failed to parse JSON.";
          }
        };
        reader.readAsText(file);
      }

      function showConfirmationWorkflow(pendingData) {
        showOverlay("confirm-import-overlay");

        // Save current and then import
        document.getElementById("btn-import-save").onclick = () => {
          document.getElementById("opt-save-config").click(); // Reuse existing save logic
          applyImport(pendingData);
          hideOverlay("confirm-import-overlay");
        };

        // Overwrite directly
        document.getElementById("btn-import-now").onclick = () => {
          applyImport(pendingData);
          hideOverlay("confirm-import-overlay");
        };
      }

      function applyImport(json) {
        // Merge with defaults to ensure missing settings (if any from older versions) are populated
        appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), json);
        // Normalize fields that web app exports as arrays but plugin expects as comma-strings
        if (Array.isArray(appState.colorStepNames)) appState.colorStepNames = appState.colorStepNames.join(", ");
        if (Array.isArray(appState.roleStepNames)) appState.roleStepNames = appState.roleStepNames.join(", ");
        // Normalize theme names to lowercase so variableMaker keys always match
        if (Array.isArray(appState.themes)) appState.themes = appState.themes.map((t) => Object.assign({}, t, { name: t.name.toLowerCase() }));
        ensureIds(appState); // migrate imported configs that predate the _id field
        savedState = null;   // an import is a full replace — no snapshot to diff against
        renderColorGroups();
        renderRoles();
        syncInputsFromState();
        // Clear any stale run-error messages left from a previous sync before showing import result.
        const errBar = document.getElementById("run-errors-bar");
        if (errBar) errBar.innerHTML = "";
        showOverlay("success-overlay");
        document.getElementById("success-results").innerHTML = `<p class="text-sm font-medium">Successfully imported <span class="text-white">${appState.name || "config"}</span></p>`;
      }

      // Drag & Drop Listeners
      // Only activate the file-import overlay for external file drags, not internal card reorders.
      window.addEventListener("dragenter", (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        document.getElementById("drop-overlay").classList.add("active");
      });

      window.addEventListener("dragover", (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
      });

      document.getElementById("drop-overlay").addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      document.getElementById("drop-overlay").addEventListener("dragleave", (e) => {
        document.getElementById("drop-overlay").classList.remove("active");
      });

      document.getElementById("drop-overlay").addEventListener("drop", (e) => {
        e.preventDefault();
        document.getElementById("drop-overlay").classList.remove("active");
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelection(file);
      });

      document.getElementById("file-input").onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelection(file);
        e.target.value = ""; // Clear for next selection
      };

      document.getElementById("opt-clear").onclick = () => {
        if (confirm("Are you sure you want to clear all data? This will reset the system to defaults.")) {
          appState = JSON.parse(JSON.stringify(demoConfig));
          ensureIds(appState); // fresh IDs so a subsequent sync doesn't wrongly rename
          savedState = null;   // no snapshot to diff against after a full reset
          renderColorGroups();
          renderRoles();
          syncInputsFromState();
        }
      };

      /**
       * 7. BACKEND COMMUNICATION HUB (FIGMA BRIDGE)
       * Handles all incoming postMessage traffic from code.js.
       */
      document.getElementById("btn-sync-confirm").onclick = () => {
        hideOverlay("confirm-sync-overlay");
        proceedWithSync();
      };

      document.getElementById("btn-run-confirm").onclick = () => {
        hideOverlay("run-dialog-overlay");
        proceedWithSync();
      };

      // Store last collection check result so refreshRunDialog can re-render without a round-trip
      let lastCollectionCheckResult = [];
      let lastRenameData = null; // rename summary from the last check-collections response

      function setRunScope(scope) {
        pendingScope = scope;
        ["all", "groups", "roles"].forEach((s) => {
          const btn = document.getElementById("rd-scope-" + s);
          if (btn) btn.classList.toggle("active", s === scope);
        });
        refreshRunDialog();
      }

      function refreshRunDialog() {
        const existing = lastCollectionCheckResult;
        const colorName = appState.colorsCollectionName || "_Colors";
        const ctxName = appState.contextualCollectionName || "contextual";
        const skipRamps = appState.skipColorRamps;
        const tg = appState.tokenGrouping || "color";
        const shortC = appState.useShortColorNames;
        const shortR = appState.useShortRoleNames;
        const scope = pendingScope || "all";

        // Sync all toggle states (settings sheet + run dialog)
        syncOutputToggles();

        // Collections
        const colsEl = document.getElementById("rd-collections");
        if (colsEl) {
          const rows = [];
          if (!skipRamps && scope !== "roles") {
            const rampsExists = existing.includes(colorName);
            rows.push(collectionRow(colorName, rampsExists ? "UPDATE" : "CREATE", rampsExists));
          }
          if (scope !== "groups") {
            const ctxExists = existing.includes(ctxName);
            rows.push(collectionRow(ctxName, ctxExists ? "UPDATE" : "CREATE", ctxExists));
          }
          colsEl.innerHTML = rows.length ? rows.join("") : `<p class="text-[12px] text-[var(--text-muted)] px-1">No collections will be modified for this scope.</p>`;
        }

        // Name preview
        const sampleColor = appState.colors[0] || { name: "Primary", shortName: "pr" };
        const sampleRole = appState.roles[0] || { name: "Text", shortName: "tx" };
        const cLabel = shortC ? sampleColor.shortName || sampleColor.name : sampleColor.name;
        const rLabel = shortR ? sampleRole.shortName || sampleRole.name : sampleRole.name;
        const stepLabel = (appState.roleStepNames || "weakest, weak, base").split(",")[2]?.trim() || "base";
        const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
        const previewEl = document.getElementById("rd-name-preview");
        if (previewEl) previewEl.textContent = exName;

        // Renames section
        const renameEl = document.getElementById("rd-renames");
        const renameListEl = document.getElementById("rd-renames-list");
        if (renameEl && renameListEl) {
          const summary = lastRenameData && lastRenameData.summary;
          const rampCount = (summary && summary.rampCount) || 0;
          const ctxCount = (summary && summary.contextualCount) || 0;
          const changes = (summary && summary.changes) || [];
          const totalRenames = rampCount + ctxCount;

          if (totalRenames > 0 && changes.length > 0) {
            renameEl.classList.remove("hidden");
            const typeLabels = { color: "Color", role: "Role", stepNames: "Ramp Steps", roleStepNames: "Role Steps", grouping: "Grouping" };
            let html = "";
            for (const ch of changes) {
              const label = typeLabels[ch.type] || ch.type;
              html += `<div class="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0">
                <span class="text-[11px] text-[var(--text-muted)] w-[68px] shrink-0">${label}</span>
                <span class="text-[11px] font-mono text-[var(--text-primary)] truncate flex-1">${ch.from}</span>
                <span class="text-[11px] text-[var(--accent)] shrink-0 px-0.5">→</span>
                <span class="text-[11px] font-mono text-[var(--accent)] truncate flex-1">${ch.to}</span>
              </div>`;
            }
            html += `<div class="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"></span>
              <span>${[rampCount > 0 ? `${rampCount} ramp var${rampCount > 1 ? "s" : ""}` : "", ctxCount > 0 ? `${ctxCount} token var${ctxCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")} will be renamed</span>
            </div>`;
            renameListEl.innerHTML = html;
          } else {
            renameEl.classList.add("hidden");
          }
        }

        // Summary
        const sumEl = document.getElementById("rd-summary");
        if (sumEl) {
          const colorList = appState.colors.map((c) => `${c.name}${c.shortName ? ` (${c.shortName})` : ""}`).join(", ");
          const roleList = appState.roles.map((r) => `${r.name}${r.shortName ? ` (${r.shortName})` : ""}`).join(", ");
          sumEl.innerHTML = [
            summaryRow("System", appState.name || "—"),
            summaryRow("Colors", `${appState.colors.length}: ${colorList}`),
            summaryRow("Roles", `${appState.roles.length}: ${roleList}`),
            summaryRow("Color Steps", String(appState.colorSteps || 25)),
            summaryRow("Ramp Type", appState.rampType || "Natural"),
          ].join("");
        }

        // Warnings
        const warnEl = document.getElementById("rd-warnings");
        if (warnEl) {
          const relevant = existing.filter((n) => (n === colorName && !skipRamps && scope !== "roles") || (n === ctxName && scope !== "groups"));
          if (relevant.length > 0) {
            warnEl.classList.remove("hidden");
            document.getElementById("rd-warning-text").textContent = `${relevant.map((n) => `"${n}"`).join(" and ")} already exist. Variables will be added or updated — nothing deleted.`;
          } else {
            warnEl.classList.add("hidden");
          }
        }

        function collectionRow(name, label, isExisting) {
          return `<div class="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2">
            <span class="text-[13px] text-[var(--text-primary)] font-mono">${name}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}">${label}</span>
          </div>`;
        }

        function summaryRow(label, value) {
          return `<div class="flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0">
            <span class="text-[var(--text-muted)] shrink-0">${label}</span>
            <span class="text-[var(--text-primary)] text-right text-[11px]">${value}</span>
          </div>`;
        }
      }

      window.onmessage = (event) => {
        const msg = event.data.pluginMessage;

        if (msg.type === "collection-check-result") {
          lastCollectionCheckResult = msg.existing || [];
          lastRenameData = msg.renames || null;
          setRunScope(pendingScope || "all"); // initialises scope buttons + calls refreshRunDialog
          showOverlay("run-dialog-overlay");
          return;
        }

        if (msg.type === "load-config") {
          // Silently restore saved state without showing any overlay.
          // ensureIds migrates older snapshots that predate the _id field.
          ensureIds(msg.state);
          savedState = JSON.parse(JSON.stringify(msg.state)); // deep-freeze for rename detection
          appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), msg.state);
          ensureIds(appState);
          renderColorGroups();
          renderRoles();
          syncInputsFromState();
          return;
        }

        if (msg.type === "processed-data-response") {
          const { content, exportType } = msg;
          const mimeMap = { json: "application/json", css: "text/css", csv: "text/csv", scss: "text/plain" };
          const extMap = { json: "json", css: "css", csv: "csv", scss: "scss" };
          const typeLabel = { json: "tokens", css: "variables", csv: "token_list", scss: "tokens" };
          triggerDownload(content, exportFileName(typeLabel[exportType] || exportType, extMap[exportType] || exportType), mimeMap[exportType] || "text/plain");
        }

        if (msg.type === "finish") {
          hideOverlay("loading-overlay");
          document.getElementById("run-errors-body").classList.remove("open");
          showOverlay("success-overlay");
          document.getElementById("success-results").innerHTML = `
            <p class="text-sm">Created: <span class="text-white font-bold">${msg.tally.created}</span></p>
            <p class="text-sm">Updated: <span class="text-white font-bold">${msg.tally.updated}</span></p>
            ${msg.tally.renamed > 0 ? `<p class="text-sm">Renamed: <span class="text-blue-300 font-bold">${msg.tally.renamed}</span></p>` : ""}
            <p class="text-sm">Failed: <span class="text-red-400 font-bold">${msg.tally.failed}</span></p>
          `;
          renderRunErrors(msg.errors || null);
        }
        if (msg.type === "error") {
          hideOverlay("loading-overlay");
          showOverlay("error-overlay");
          document.getElementById("error-message").textContent = msg.message;
        }
      };

      /**
       * 8. RESIZE & BOOT
       */

      // Resize Logic
      let isResizing = false;
      document.getElementById("resize-handle").onmousedown = (e) => {
        isResizing = true;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };
      function onMouseMove(e) {
        if (!isResizing) return;
        parent.postMessage({ pluginMessage: { type: "resize", width: Math.max(480, e.clientX), height: Math.max(600, e.clientY) } }, "*");
      }
      function onMouseUp() {
        isResizing = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      // Main Boot
      renderColorGroups();
      renderRoles();
      syncInputsFromState();
