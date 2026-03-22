/* eslint-disable @typescript-eslint/no-require-imports -- Node CJS script; require() required */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distElectron = path.join(root, 'dist', 'electron');

fs.mkdirSync(distElectron, { recursive: true });

// Preload: copy from source (stays .cjs so it's always loaded as CommonJS)
const preloadSrc = path.join(root, 'electron', 'preload.cjs');
fs.copyFileSync(preloadSrc, path.join(distElectron, 'preload.cjs'));

// Main: copy compiled main.js to main.cjs so Node loads it as CommonJS despite package "type": "module"
const mainJs = path.join(distElectron, 'main.js');
if (fs.existsSync(mainJs)) {
  fs.copyFileSync(mainJs, path.join(distElectron, 'main.cjs'));
}
