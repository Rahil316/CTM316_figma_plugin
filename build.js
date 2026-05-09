const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const outDir = 'Output_DoNotEdit/';
const srcDir = 'src/';

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

console.log('Building Tailwind CSS...');
try {
    execSync('npx tailwindcss -i src/input.css -o src/output.css --minify');
} catch (err) {
    console.error('Tailwind build failed:', err);
}

console.log('Building scripts.js...');
const jsHdr = '/* AUTO-GENERATED — do not edit. Source: src/*.js  Run: npm run build */\n';
const jsFiles = ['utils', 'clrSpaces', 'clrSolver', 'clrGen', 'docGen', 'figmaVars', 'config', 'main'];
const jsContent = jsFiles.map(f => fs.readFileSync(path.join(srcDir, f + '.js'), 'utf8')).join('\n');
fs.writeFileSync(path.join(outDir, 'scripts.js'), jsHdr + jsContent);

console.log('Building ui.html...');
let html = fs.readFileSync(path.join(srcDir, 'ui.html'), 'utf8');
const htmlHdr = '<!-- AUTO-GENERATED — do not edit. Source: src/ui.html + src/*.js  Run: npm run build -->\n';

// 1. Inline scripts
html = html.replace(/<script src="src\/([^"]+)"><\/script>/g, (_, f) => {
    return '<script>\n' + fs.readFileSync(path.join(srcDir, f), 'utf8') + '\n</script>';
});

// 2. Replace Tailwind CDN with inlined output.css
const cssContent = fs.readFileSync(path.join(srcDir, 'output.css'), 'utf8');
html = html.replace(/<script src="https:\/\/cdn.tailwindcss.com"><\/script>/g, () => {
    return '<style>\n' + cssContent + '\n</style>';
});

fs.writeFileSync(path.join(outDir, 'ui.html'), htmlHdr + html);
console.log('Build complete!');
