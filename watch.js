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

fs.watch(SRC_DIR, { recursive: true }, (_, filename) => {
  // Only watch .js, .html, and .css files
  if (!filename || (!filename.endsWith(".js") && !filename.endsWith(".html") && !filename.endsWith(".css"))) return;

  // Ignore changes to output.css to prevent infinite loops (since build.js writes to it)
  if (filename === "output.css") return;

  // Debounce: if multiple files are saved within 400ms, only build once.
  // This helps when you hit Cmd+S rapidly or when the IDE saves multiple files at once.
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Change detected in src/${filename} — rebuilding...`);
    build();
  }, 400);
});
