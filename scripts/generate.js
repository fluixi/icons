const fs = require('fs');
const path = require('path');
let SVGO;
try { SVGO = require('svgo'); } catch(e) { SVGO = null; }

// Get package name from command line arguments
const packageName = process.argv[2];
if (!packageName) {
  console.error('Usage: node generate.js <package-name>');
  console.error('Available packages: icon-lucide, icon-heroicons, icon-tabler, icon-remix');
  process.exit(1);
}

const pkgRoot = path.join(__dirname, '..', 'packages', 'icons', packageName);
const iconsDir = path.join(pkgRoot, 'icons');
const outFile = path.join(pkgRoot, 'src', 'generated.ts');

// Verify package exists
if (!fs.existsSync(pkgRoot)) {
  console.error(`Package ${packageName} not found at ${pkgRoot}`);
  process.exit(1);
}

// Helper function to recursively find all SVG files
function findSvgFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findSvgFiles(fullPath));
    } else if (item.endsWith('.svg')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const files = findSvgFiles(iconsDir);
const icons = {};

async function run() {
  console.log(`Generating icons for ${packageName}...`);
  console.log(`Found ${files.length} SVG files in ${iconsDir}`);
  
  for (const f of files) {
    const fp = f;
    let svg = fs.readFileSync(fp, 'utf8');
    try {
      if (SVGO && SVGO.optimize) {
        const res = SVGO.optimize(svg, { path: fp });
        svg = res.data || svg;
      }
    } catch (e) {
      // ignore svgo errors
    }
    const name = path.basename(f, '.svg');
    svg = svg.replace(/`/g, '\`');
    icons[name] = svg;
  }
  
  const entries = Object.entries(icons).map(([k,v]) => `  "${k}": \`${v}\``).join(',\n');
  const out = `export const icons = {\n${entries}\n};\n\nexport type IconName = keyof typeof icons;\n`;
  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${Object.keys(icons).length} icons to ${outFile}`);
}
run().catch(e => { console.error(e); process.exit(1); });