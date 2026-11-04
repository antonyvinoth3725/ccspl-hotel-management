const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
const modelsDir = path.join(projectRoot, 'Models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.cs'));
let changedFiles = 0;
for (const f of files) {
  const full = path.join(modelsDir, f);
  let text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  let fileChanged = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const propMatch = line.match(/^\s*public\s+[\w<>, \[\]\?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*get;\s*set;.*$/);
    if (propMatch) {
      const prop = propMatch[1];
      if (seen.has(prop)) {
        fileChanged = true;
        continue; // skip duplicate property
      }
      seen.add(prop);
    }
    out.push(line);
  }
  const newText = out.join('\n');
  if (fileChanged) {
    fs.writeFileSync(full, newText, 'utf8');
    changedFiles++;
    console.log('Fixed duplicates in', f);
  }
}
console.log('Completed. Files changed:', changedFiles);
