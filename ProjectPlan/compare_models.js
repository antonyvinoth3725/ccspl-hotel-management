const fs = require('fs');
const path = require('path');
const scriptPath = path.resolve(__dirname, 'Gayatri-Portal-DB-script.txt');
const modelDir = path.resolve(__dirname, '..', 'Models');
const text = fs.readFileSync(scriptPath, 'utf8');
const blocks = text.split(/GO\s*\r?\n/);
const tables = [];
for (const block of blocks) {
  const m = block.match(/CREATE TABLE \[dbo\]\.\[([^\]]+)\]\(([^]*)\)\s*ON \[PRIMARY\]/);
  if (!m) continue;
  const name = m[1];
  const colsText = m[2];
  const cols = [];
  for (const rawLine of colsText.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('PRIMARY KEY') || line.startsWith('CONSTRAINT') || line === ')') continue;
    line = line.replace(/,$/, '');
    const colm = line.match(/^\[([^\]]+)\]\s+([^\s]+(?:\([^\)]*\))?)(.*)$/);
    if (!colm) continue;
    const colname = colm[1];
    const ctype = colm[2];
    const rest = colm[3];
    const isIdentity = rest.includes('IDENTITY');
    const isNullable = !rest.includes('NOT NULL');
    tables.push({ name, colname, ctype, isNullable, isIdentity });
  }
}
const schema = tables.reduce((acc, { name, colname, ctype, isNullable, isIdentity }) => {
  acc[name] = acc[name] || [];
  acc[name].push({ colname, ctype, isNullable, isIdentity });
  return acc;
}, {});
const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.cs'));
const tableNames = Object.keys(schema).sort();
const missingModels = tableNames.filter(t => !modelFiles.includes(`${t}.cs`));
const extraModels = modelFiles.filter(f => !tableNames.includes(f.replace(/\.cs$/, ''))).sort();
console.log('Missing model classes:', missingModels);
console.log('Extra model classes:', extraModels);
for (const table of tableNames) {
  const modelPath = path.resolve(modelDir, `${table}.cs`);
  if (!fs.existsSync(modelPath)) continue;
  const content = fs.readFileSync(modelPath, 'utf8');
  const propNames = [...content.matchAll(/public\s+[A-Za-z0-9_<>\?]+\s+([A-Za-z0-9_]+)\s*\{\s*get;\s*set;\s*\}/g)].map(m => m[1]);
  const cols = schema[table].map(c => c.colname);
  const missing = cols.filter(c => !propNames.includes(c));
  const extra = propNames.filter(p => !cols.includes(p));
  if (missing.length || extra.length) {
    console.log(`\nTable ${table}:`);
    if (missing.length) console.log('  missing properties:', missing);
    if (extra.length) console.log('  extra properties:', extra);
  }
}
