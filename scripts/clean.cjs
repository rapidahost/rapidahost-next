// scripts/clean.cjs
const fs = require('fs');
const path = require('path');

const targets = ['.next', 'node_modules/.cache', '.turbo'];

for (const t of targets) {
  const p = path.join(process.cwd(), t);
  fs.rm(p, { recursive: true, force: true }, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`[clean] fail: ${p}`, err);
    } else {
      console.log(`[clean] ok: ${p}`);
    }
  });
}
