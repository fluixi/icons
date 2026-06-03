#!/usr/bin/env node
const { execSync } = require('child_process');
const pkgs = ['icon-lucide','icon-heroicons','icon-tabler','icon-remix'];
for (const p of pkgs) {
  console.log('Generating for', p);
  execSync('node scripts/generate.js ' + p, { stdio: 'inherit' });
}
console.log('Done generating all icon maps.');
