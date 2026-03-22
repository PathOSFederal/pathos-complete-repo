/* eslint-disable @typescript-eslint/no-require-imports -- Node CJS script; require() required */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

let electronDir;
try {
  electronDir = path.dirname(require.resolve('electron/package.json'));
} catch {
  process.exit(0);
}

const pathTxt = path.join(electronDir, 'path.txt');
if (fs.existsSync(pathTxt)) {
  process.exit(0);
}

const installJs = path.join(electronDir, 'install.js');
const result = spawnSync(process.execPath, [installJs], {
  stdio: 'inherit',
  cwd: electronDir,
});
process.exit(result.status !== null ? result.status : 0);
