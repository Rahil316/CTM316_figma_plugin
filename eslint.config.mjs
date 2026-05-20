import js from "@eslint/js";

// ── GLOBALS ───────────────────────────────────────────────────────────────────

const nodeGlobals = {
  require: "readonly", module: "readonly", exports: "readonly",
  __dirname: "readonly", __filename: "readonly",
  process: "readonly", Buffer: "readonly",
  setTimeout: "readonly", clearTimeout: "readonly",
  setInterval: "readonly", clearInterval: "readonly",
  console: "readonly",
};

const figmaGlobals = {
  figma: "readonly",
  console: "readonly",
  __html__: "readonly", // Figma plugin HTML string injected at build time
};

// ── CONFIG ────────────────────────────────────────────────────────────────────
export default [
  // Ignore source files and generated HTML (JS inside HTML can't be linted here)
  // Only dist/scripts.js is linted — it's the fully concatenated build.
  {
    ignores: [
      "src/",
      "dist/ui.html",
      "node_modules/",
      "scratch_tests/",
      "**/*.scratch.*",
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // Node.js scripts
  {
    files: ["build.js", "watch.js", "tailwind.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },

  // dist/scripts.js — all source files concatenated, all globals resolved.
  // File boundary markers (/* code/color/clrUtils.js */) make errors traceable.
  {
    files: ["dist/scripts.js"],
    languageOptions: {
      globals: figmaGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-duplicate-case": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "warn",
      "no-debugger": "error",
      "eqeqeq": ["warn", "always", { "null": "ignore" }],
    },
  },
];
