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
    const normalizedType = ctype.toUpperCase();
    if (!/^(INT|BIGINT|SMALLINT|TINYINT|BIT|DECIMAL|MONEY|FLOAT|DATETIME2?|DATE|TIME|NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(normalizedType)) continue;
    const isNullable = !rest.includes('NOT NULL');
    cols.push({ colname, ctype, isNullable });
  }
  tables.push({ name, cols });
}
function csharpType(sqlType, nullable) {
  const t = sqlType.toUpperCase();
  let baseType;
  if (/^(NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(t)) baseType = 'string';
  else if (/^DECIMAL/.test(t) || /^MONEY/.test(t)) baseType = 'decimal';
  else if (/^FLOAT/.test(t)) baseType = 'double';
  else if (/^DATETIME2?/.test(t) || /^DATE/.test(t)) baseType = 'DateTime';
  else if (/^TIME/.test(t)) baseType = 'TimeSpan';
  else if (/^INT$/.test(t)) baseType = 'int';
  else if (/^SMALLINT$/.test(t)) baseType = 'short';
  else if (/^TINYINT$/.test(t)) baseType = 'byte';
  else if (/^BIGINT$/.test(t)) baseType = 'long';
  else if (/^BIT$/.test(t)) baseType = 'bool';
  else baseType = 'string';
  if (baseType === 'string') return nullable ? 'string?' : 'string';
  return nullable ? `${baseType}?` : baseType;
}
for (const table of tables) {
  const className = table.name;
  const props = table.cols.map(col => {
    const type = csharpType(col.ctype, col.isNullable);
    const name = col.colname;
    if (type === 'string') return `        public ${type} ${name} { get; set; } = null!;`;
    return `        public ${type} ${name} { get; set; }`;
  });
  const content = `using System;\n\nnamespace GayatriCateringPortal.Models\n{\n    public class ${className}\n    {\n${props.join('\n')}\n    }\n}\n`;
  const outPath = path.resolve(modelDir, `${className}.cs`);
  fs.writeFileSync(outPath, content, 'utf8');
}
console.log('Wrote', tables.length, 'model classes to', modelDir);