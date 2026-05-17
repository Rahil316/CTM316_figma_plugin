const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const outDir = "dist/";
const srcDir = "src/";

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

console.log("Building Tailwind CSS...");
try {
  execSync("npx tailwindcss -i src/input.css -o src/output.css --minify");
} catch (err) {
  console.error("Tailwind build failed:", err);
}

console.log("Building scripts.js...");
const jsFiles = ["code/color/clrUtils.js", "code/color/clrEngine.js", "code/figma/docGen.js", "code/figma/config.js", "code/figma/figmaVars.js", "code/figma/main.js"];
const jsContent = jsFiles
  .map((f) => {
    const content = fs
      .readFileSync(path.join(srcDir, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return `/* ${f} */\n${content}`;
  })
  .join("\n\n");
fs.writeFileSync(path.join(outDir, "scripts.js"), jsContent);

console.log("Building ui.html...");
let html = fs.readFileSync(path.join(srcDir, "ui.html"), "utf8");
const htmlHdr = "<!-- AUTO-GENERATED — do not edit. Source: src/ui.html + src/**/*.js  Run: npm run build -->\n";

// 1. Inline scripts (matches src/path/to/file.js)
html = html.replace(/<script src="src\/([^"]+)"><\/script>/g, (_, f) => {
  const content = fs
    .readFileSync(path.join(srcDir, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .replace(/^\s*\/\/.*$/gm, "") // strip line comments
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();
  return `<script>/* ${f} */\n${content}\n</script>`;
});

// 2. Replace Tailwind CDN with inlined output.css
const cssContent = fs.readFileSync(path.join(srcDir, "output.css"), "utf8");
html = html.replace(/<script src="https:\/\/cdn.tailwindcss.com"><\/script>/g, () => {
  return "<style>\n" + cssContent + "\n</style>";
});

fs.writeFileSync(path.join(outDir, "ui.html"), htmlHdr + html);
console.log("Build complete!");
