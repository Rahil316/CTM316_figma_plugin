/**
 * ============================================================================
 * CTM316 — Automated Test Suite
 * Set TESTS_ENABLED = true to run on plugin load (output goes to DevTools console).
 * Covers: color math, tonal scale generator, contrast solver, token pipeline,
 *         config translator.
 * All tested functions are pure — no Figma API or DOM required.
 * ============================================================================
 */

const TESTS_ENABLED = true;

(function () {
  if (!TESTS_ENABLED) return;

  // ── RUNNER ──────────────────────────────────────────────────────────────────

  let _passed = 0, _failed = 0;
  const _groups = [];

  function group(name, fn) {
    const before = { p: _passed, f: _failed };
    fn();
    const p = _passed - before.p, f = _failed - before.f;
    _groups.push({ name, p, f });
  }

  function assert(label, condition, detail) {
    if (condition) {
      _passed++;
    } else {
      _failed++;
      console.error(`  FAIL  ${label}${detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ""}`);
    }
  }

  function eq(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) console.error(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    ok ? _passed++ : _failed++;
  }

  function close(label, actual, expected, tol) {
    tol = tol || 0.01;
    const ok = typeof actual === "number" && !isNaN(actual) && Math.abs(actual - expected) <= tol;
    if (!ok) console.error(`  FAIL  ${label} — expected ~${expected} (±${tol}), got ${actual}`);
    ok ? _passed++ : _failed++;
  }

  // ── SECTION 1: clrUtils ───────────────────────────────────────────────────

  group("validHex", () => {
    assert("accepts 6-char with hash",    validHex("#3B82F6"));
    assert("accepts 6-char without hash", validHex("3B82F6"));
    assert("accepts 3-char with hash",    validHex("#FFF"));
    assert("accepts 3-char without hash", validHex("ABC"));
    assert("rejects 5-char",              !validHex("#12345"));
    assert("rejects non-hex chars",       !validHex("#GGGGGG"));
    assert("rejects empty string",        !validHex(""));
    assert("rejects number",              !validHex(123));
  });

  group("normalizeHex", () => {
    eq("expands 3-char to 6-char",     normalizeHex("#FFF"),     "#FFFFFF");
    eq("expands lowercase 3-char",     normalizeHex("#abc"),     "#AABBCC");
    eq("strips hash and uppercases",   normalizeHex("3b82f6"),   "#3B82F6");
    eq("already-normalized is stable", normalizeHex("#3B82F6"),  "#3B82F6");
    eq("returns null for invalid",     normalizeHex("ZZZZZZ"),   null);
    eq("returns null for empty",       normalizeHex(""),         null);
  });

  group("hexToRgb", () => {
    const black = hexToRgb("#000000");
    const white = hexToRgb("#FFFFFF");
    const red   = hexToRgb("#FF0000");
    assert("black → [0,0,0]",           black && black[0] === 0 && black[1] === 0 && black[2] === 0);
    assert("white → [255,255,255]",     white && white[0] === 255 && white[1] === 255 && white[2] === 255);
    assert("red → [255,0,0]",           red && red[0] === 255 && red[1] === 0 && red[2] === 0);
    assert("returns null for invalid",  hexToRgb("ZZZZZZ") === null);
  });

  group("relLum", () => {
    close("black → 0",   relLum("#000000"), 0,      0.001);
    close("white → 1",   relLum("#FFFFFF"), 1,      0.001);
    close("red → 0.2126", relLum("#FF0000"), 0.2126, 0.005);
    eq("returns null for invalid", relLum("INVALID"), null);
  });

  group("contrastRatio", () => {
    close("black/white → 21",   contrastRatio("#000000", "#FFFFFF"), 21,   0.05);
    close("white/black → 21",   contrastRatio("#FFFFFF", "#000000"), 21,   0.05);
    close("same color → 1",     contrastRatio("#888888", "#888888"), 1,    0.05);
    eq("null on invalid input", contrastRatio("INVALID", "#FFFFFF"), null);
  });

  group("contrastRating", () => {
    eq("near-white on white → Fail", contrastRating("#EEEEEE", "#FFFFFF"), "Fail");
    assert("ratio ≥ 3 < 4.5 → AA Large", ["AA Large", "AA", "AAA"].includes(contrastRating("#888888", "#FFFFFF")));
    eq("black/white → AAA",          contrastRating("#000000", "#FFFFFF"), "AAA");
    eq("null on truly invalid",      contrastRating("ZZZZZZ", "#FFFFFF"), null);
  });

  group("sanitizeHex", () => {
    eq("strips hash",          sanitizeHex("#3b82f6"), "3B82F6");
    eq("uppercases",           sanitizeHex("aabbcc"),  "AABBCC");
    eq("clamps to 6 chars",    sanitizeHex("AABBCCDD"), "AABBCC");
    eq("removes non-hex",      sanitizeHex("ZZ3B82F6"), "3B82F6");
    eq("empty input",          sanitizeHex(""),         "");
    eq("handles undefined",    sanitizeHex(undefined),  "");
  });

  group("rgbToHsl", () => {
    const red   = rgbToHsl(255, 0, 0);
    const white = rgbToHsl(255, 255, 255);
    const black = rgbToHsl(0, 0, 0);
    assert("red → hue 0",       red && red[0] === 0);
    assert("red → sat 100",     red && red[1] === 100);
    assert("red → lum 50",      red && red[2] === 50);
    assert("white → lum 100",   white && white[2] === 100);
    assert("black → lum 0",     black && black[2] === 0);
    eq("null on out-of-range",  rgbToHsl(-1, 0, 0), null);
  });

  group("rgbToHex / hslToHex round-trip", () => {
    const hex   = rgbToHex(59, 130, 246);
    assert("produces valid hex",  hex && /^#[0-9A-F]{6}$/.test(hex));
    const back  = hexToRgb(hex);
    assert("round-trip R",        back && back[0] === 59);
    assert("round-trip G",        back && back[1] === 130);
    assert("round-trip B",        back && back[2] === 246);
    eq("null on out-of-range",    rgbToHex(-1, 0, 0), null);
    eq("hslToHex(0,100,50) → #FF0000",     hslToHex(0, 100, 50), "#FF0000");
  });

  // ── SECTION 2: Color spaces (clrEngine) ──────────────────────────────────

  group("hexToOklch / oklchToHex round-trip", () => {
    const samples = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#000000", "#FFFFFF"];
    samples.forEach((hex) => {
      const { L, C, H } = hexToOklch(hex);
      assert(`L in [0,1] for ${hex}`,  L >= 0 && L <= 1);
      assert(`C >= 0 for ${hex}`,      C >= 0);
      assert(`H in [0,360] for ${hex}`, H >= 0 && H <= 360);
      const back = oklchToHex(L, C, H).toUpperCase();
      assert(`round-trip within 2 channels: ${hex}`, back === hex || (() => {
        const [r1, g1, b1] = hexToRgb(hex);
        const [r2, g2, b2] = hexToRgb(back);
        return Math.abs(r1-r2) <= 2 && Math.abs(g1-g2) <= 2 && Math.abs(b1-b2) <= 2;
      })());
    });
  });

  group("hexToHct / hctToHex round-trip", () => {
    const samples = ["#3B82F6", "#EF4444", "#10B981"];
    samples.forEach((hex) => {
      const { h, c, t } = hexToHct(hex);
      assert(`hue in [0,360] for ${hex}`, h >= 0 && h <= 360);
      assert(`chroma >= 0 for ${hex}`,    c >= 0);
      assert(`tone in [0,100] for ${hex}`, t >= 0 && t <= 100);
    });
    const gray = hexToHct("#808080");
    assert("gray has low chroma", gray.c < 5);
  });

  // ── SECTION 3: tonalScaleMaker ────────────────────────────────────────────

  group("tonalScaleMaker — length and validity", () => {
    const algos = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    algos.forEach((algo) => {
      const scale = tonalScaleMaker("#3B82F6", 11, algo);
      eq(`${algo}: returns 11 steps`, scale.length, 11);
      assert(`${algo}: all valid hex`, scale.every((h) => /^#[0-9A-Fa-f]{6}$/i.test(h)));
    });
  });

  group("tonalScaleMaker — light-to-dark ordering", () => {
    ["Natural", "Uniform", "OKLCH", "Material", "Linear"].forEach((algo) => {
      const scale = tonalScaleMaker("#3B82F6", 11, algo);
      const lums = scale.map((h) => relLum(h));
      const ordered = lums.every((v, i) => i === 0 || v <= lums[i - 1] + 0.05);
      assert(`${algo}: roughly light→dark`, ordered);
    });
  });

  group("tonalScaleMaker — scale length variants", () => {
    [5, 11, 23, 25].forEach((len) => {
      const scale = tonalScaleMaker("#0067DD", len, "Natural");
      eq(`length ${len}: correct count`, scale.length, len);
    });
  });

  // ── SECTION 4: solveColorForContrast ──────────────────────────────────────

  group("solveColorForContrast — achieves target (light bg)", () => {
    const bg = "#FFFFFF";
    const source = "#3B82F6";
    const targets = [3.0, 4.5, 7.0];
    const modes = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
    targets.forEach((t) => {
      modes.forEach((m) => {
        const r = solveColorForContrast(source, t, bg, m);
        assert(`${m} @ ${t}: valid hex output`, /^#[0-9A-Fa-f]{6}$/i.test(r.hex));
        assert(`${m} @ ${t}: achievedContrast >= target`, r.achievedContrast >= t - 0.05);
        assert(`${m} @ ${t}: never undershoots`, !r.clipped || r.achievedContrast >= t - 0.1);
      });
    });
  });

  group("solveColorForContrast — achieves target (dark bg)", () => {
    const bg = "#1A1A2E";
    const source = "#3B82F6";
    [3.0, 4.5].forEach((t) => {
      const r = solveColorForContrast(source, t, bg, "natural");
      assert(`dark bg @ ${t}: valid hex`, /^#[0-9A-Fa-f]{6}$/i.test(r.hex));
      assert(`dark bg @ ${t}: achieved >= target`, r.achievedContrast >= t - 0.05);
    });
  });

  group("solveColorForContrast — impossible target", () => {
    const r = solveColorForContrast("#3B82F6", 25, "#FFFFFF", "natural");
    assert("returns fallback hex for impossible target", r.hex === "#000000" || r.hex === "#FFFFFF");
    assert("warning is set", r.warning !== null);
    assert("clipped flag set", r.clipped === true);
  });

  group("solveColorForContrast — achromatic source stays achromatic", () => {
    const r = solveColorForContrast("#808080", 4.5, "#FFFFFF", "natural");
    const { C } = hexToOklch(r.hex);
    assert("gray source → low chroma result", C < 0.05);
  });

  // ── SECTION 5: validateVariationContrasts ────────────────────────────────

  group("validateVariationContrasts", () => {
    const ok = validateVariationContrasts([1.5, 3.0, 4.5, 7.0, 12.0]);
    assert("ascending targets → valid",    ok.valid === true);
    assert("ascending targets → no errors", ok.errors.length === 0);

    const bad = validateVariationContrasts([1.5, 3.0, 2.0, 7.0]);
    assert("non-ascending → invalid",      bad.valid === false);
    assert("non-ascending → has errors",   bad.errors.length > 0);

    const single = validateVariationContrasts([4.5]);
    assert("single target → valid",        single.valid === true);
  });

  // ── SECTION 6: translateConfig ────────────────────────────────────────────

  group("translateConfig — basic shape", () => {
    const state = {
      name: "Test",
      scaleLength: 11,
      scaleAlgorithm: "Natural",
      pluginMode: "tonalScalesBased",
      colors: [{ name: "Blue", shorthand: "bl", value: "3B82F6", description: "" }],
      roles: [{ name: "Text", shorthand: "tx", spread: 2, minContrast: 4.5, baseIndex: 5, variationTargets: [1.5, 3, 4.5, 7, 12] }],
      themes: [{ name: "Light", bg: "FFFFFF" }, { name: "Dark", bg: "000000" }],
      variations: null,
    };
    const cfg = translateConfig(state);
    eq("scaleLength passed through",  cfg.scaleLength, 11);
    eq("pluginMode passed through",   cfg.pluginMode, "tonalScalesBased");
    eq("color name preserved",        cfg.colors[0].name, "Blue");
    eq("role name preserved",         cfg.roles[0].name, "Text");
    eq("theme count correct",         cfg.themes.length, 2);
    assert("themes deduplicated",     cfg.themes[0].name !== cfg.themes[1].name);
    assert("variations always array", Array.isArray(cfg.variations));
  });

  group("translateConfig — defaults applied", () => {
    const cfg = translateConfig({});
    assert("scaleLength defaults to 23",    cfg.scaleLength === 23);
    assert("pluginMode has default",        typeof cfg.pluginMode === "string");
    assert("colors defaults to array",      Array.isArray(cfg.colors));
    assert("roles defaults to array",       Array.isArray(cfg.roles));
    assert("themes defaults to array",      Array.isArray(cfg.themes) && cfg.themes.length > 0);
    assert("tokenNameOrder is array",       Array.isArray(cfg.tokenNameOrder));
  });

  // ── SECTION 7: variableMaker pipeline ────────────────────────────────────

  const _baseState = {
    scaleLength: 11,
    scaleAlgorithm: "Natural",
    pluginMode: "tonalScalesBased",
    useGlobalAlgo: true,
    colors: [
      { name: "Primary", shorthand: "pr", value: "3B82F6", description: "" },
      { name: "Gray",    shorthand: "gr", value: "808080", description: "" },
    ],
    roles: [
      { name: "Text",       shorthand: "tx", spread: 2, minContrast: 4.5, baseIndex: 7, variationTargets: [1.5, 3, 4.5, 7, 12] },
      { name: "Background", shorthand: "bg", spread: 1, minContrast: 1.2, baseIndex: 2, variationTargets: [1.5, 3, 4.5, 7, 12] },
    ],
    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark",  bg: "1A1A2E" },
    ],
    variations: [
      { _id: "v1", name: "Default",  shorthand: "df" },
      { _id: "v2", name: "Subtle",   shorthand: "sb" },
      { _id: "v3", name: "Strong",   shorthand: "st" },
    ],
  };

  group("variableMaker — tonal mode structure", () => {
    const result = variableMaker(translateConfig(_baseState));
    assert("no critical errors",         result.errors.critical.length === 0);
    assert("tonalScales not empty",      Object.keys(result.tonalScales).length === 2);
    assert("Primary scale exists",       !!result.tonalScales["Primary"]);
    assert("Gray scale exists",          !!result.tonalScales["Gray"]);
    const primaryScale = result.tonalScales["Primary"];
    eq("Primary scale has 11 steps",    Object.keys(primaryScale).length, 11);

    assert("colorTokens has Light key", !!result.colorTokens["light"]);
    assert("colorTokens has Dark key",  !!result.colorTokens["dark"]);
    const lightPrimary = result.colorTokens["light"]["Primary"];
    assert("Light/Primary has roles",   lightPrimary && Object.keys(lightPrimary).length === 2);
  });

  group("variableMaker — tonal mode token values", () => {
    const result = variableMaker(translateConfig(_baseState));
    const lightTokens = result.colorTokens["light"]["Primary"];
    Object.values(lightTokens).forEach((roleTokens) => {
      Object.values(roleTokens).forEach((token) => {
        assert(`token hex is valid: ${token.value}`, /^#[0-9A-Fa-f]{6}$/i.test(token.value));
        assert(`token has contrast ratio`,           typeof token.contrast.ratio === "number");
        assert(`token has tknName`,                  typeof token.tknName === "string");
      });
    });
  });

  group("variableMaker — adaptive engine mode", () => {
    const adaptiveState = Object.assign({}, _baseState, { pluginMode: "adaptiveEngine" });
    const result = variableMaker(translateConfig(adaptiveState));
    assert("no critical errors",       result.errors.critical.length === 0);
    eq("tonalScales is empty",         Object.keys(result.tonalScales).length, 0);
    assert("colorTokens populated",    Object.keys(result.colorTokens).length === 2);
    const lightPrimary = result.colorTokens["light"]["Primary"];
    assert("tokens present",           lightPrimary && Object.keys(lightPrimary).length > 0);
    Object.values(lightPrimary).forEach((roleTokens) => {
      Object.values(roleTokens).forEach((token) => {
        assert(`adaptive token hex valid: ${token.value}`, /^#[0-9A-Fa-f]{6}$/i.test(token.value));
        const ratio = token.contrast.ratio;
        assert(`adaptive contrast is a number`, typeof ratio === "number" && ratio >= 1);
      });
    });
  });

  group("variableMaker — tonal scale hex validity", () => {
    const result = variableMaker(translateConfig(_baseState));
    Object.entries(result.tonalScales).forEach(([colorName, ramp]) => {
      Object.entries(ramp).forEach(([step, data]) => {
        assert(`${colorName}[${step}] is valid hex`, /^#[0-9A-Fa-f]{6}$/i.test(data.value));
        assert(`${colorName}[${step}] has contrast object`, typeof data.contrast === "object");
      });
    });
  });

  group("variableMaker — errors object shape", () => {
    const result = variableMaker(translateConfig(_baseState));
    assert("errors.critical is array",  Array.isArray(result.errors.critical));
    assert("errors.warnings is array",  Array.isArray(result.errors.warnings));
    assert("errors.notices is array",   Array.isArray(result.errors.notices));
  });

  // ── SUMMARY ──────────────────────────────────────────────────────────────

  console.group("CTM316 — Test Results");
  _groups.forEach(({ name, p, f }) => {
    const icon = f === 0 ? "✓" : "✗";
    const log = f === 0 ? console.log : console.error;
    log(`  ${icon}  ${name}  (${p} passed${f ? ", " + f + " failed" : ""})`);
  });
  console.log("");
  if (_failed === 0) {
    console.log(`%c  All ${_passed} tests passed`, "color:green;font-weight:bold");
  } else {
    console.error(`  ${_passed} passed, ${_failed} FAILED`);
  }
  console.groupEnd();
})();
