const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'Gayatri-Portal-DB-script.txt');
const text = fs.readFileSync(file, 'utf8');
const blocks = text.split(/GO\s*\r?\n/);
console.log('blocks', blocks.length);
const matches = blocks.map(b => {
  const m = b.match(/CREATE TABLE \[dbo\]\.\[([^\]]+)\]\(/);
  return m ? m[1] : null;
});
console.log('matches', matches.filter(m => m).length);
console.log('sample', matches.filter(m => m).slice(0, 10));
