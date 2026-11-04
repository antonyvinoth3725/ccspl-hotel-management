const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'Models', 'AddOnMaster.cs');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
let inClass = false;
let braceDepth = 0;
let sawOpenBraceAfterClass = false;
const seen = new Set();
for (const line of lines) {
  if (!inClass) {
    if (/\bclass\b/.test(line)) {
      inClass = true;
      braceDepth = 0;
      sawOpenBraceAfterClass = false;
    }
    continue;
  }
  const open = (line.match(/\{/g) || []).length;
  const close = (line.match(/\}/g) || []).length;
  braceDepth += open - close;
  if (open > 0) sawOpenBraceAfterClass = true;
  const propMatch = line.match(/^\s*public\s+[\w<>, \[\]]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*get;\s*set;.*$/);
  if (propMatch) {
    const prop = propMatch[1];
    console.log('Found property:', prop, JSON.stringify(line));
    if (seen.has(prop)) console.log(' Duplicate:', prop);
    seen.add(prop);
  }
  if (sawOpenBraceAfterClass && braceDepth <= 0) {
    inClass = false;
  }
}
console.log('Done');
