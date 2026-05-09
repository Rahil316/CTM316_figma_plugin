const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SRC_DIR = path.join(__dirname, "src");

function build() {
  try {
    execSync("npm run build", { stdio: "inherit" });
    console.log(`[${new Date().toLocaleTimeString()}] Build complete. Reload the plugin in Figma.\n`);
  } catch (_) {
    console.error(`[${new Date().toLocaleTimeString()}] Build failed — check errors above.\n`);
  }
}

// Run once immediately on start
console.log("Watching src/ for changes... (Ctrl+C to stop)\n");
build();

let debounceTimer = null;

fs.watch(SRC_DIR, { recursive: false }, (_, filename) => {
  if (!filename || (!filename.endsWith(".js") && !filename.endsWith(".html"))) return;

  // Debounce: if multiple files are saved within 100ms, only build once
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Change detected in src/${filename} — rebuilding...`);
    build();
  }, 100);
});
