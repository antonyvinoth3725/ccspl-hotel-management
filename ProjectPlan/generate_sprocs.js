const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'Gayatri-Portal-DB-script.txt');
const text = fs.readFileSync(file, 'utf8');
const tables = [];
const tableRegex = /CREATE TABLE \[dbo\]\.\[([^\]]+)\]\(([\s\S]*?)\)\s*ON \[PRIMARY\]/g;
let tableMatch;
while ((tableMatch = tableRegex.exec(text)) !== null) {
  const name = tableMatch[1];
  const colsText = tableMatch[2];
  const cols = [];
  for (const rawLine of colsText.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('PRIMARY KEY') || line.startsWith('CONSTRAINT') || /^\)\s*ON/.test(line)) continue;
    line = line.replace(/,$/, '');
    const colm = line.match(/^\[([^\]]+)\]\s+([^\s]+(?:\([^\)]*\))?)(.*)$/);
    if (!colm) continue;
    const colname = colm[1];
    const ctype = colm[2];
    const rest = colm[3];
    const normalizedType = ctype.toUpperCase();
    if (!/^(INT|BIGINT|SMALLINT|TINYINT|BIT|DECIMAL|MONEY|FLOAT|DATETIME2?|DATE|TIME|NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(normalizedType)) continue;
    const isIdentity = rest.includes('IDENTITY');
    const isNullable = !rest.includes('NOT NULL');
    cols.push({ colname, ctype, isNullable, isIdentity, rest: rest.trim() });
  }
  let pk = null;
  const pkmatch = tableMatch[0].match(/PRIMARY KEY CLUSTERED \([^\)]*\[([^\]]+)\] ASC/);
  if (pkmatch) pk = pkmatch[1];
  else {
    const identityCol = cols.find(c => c.isIdentity);
    pk = identityCol ? identityCol.colname : (cols[0] ? cols[0].colname : null);
  }
  if (pk) tables.push({ name, pk, cols });
}
function paramType(coltype) {
  const t = coltype.toUpperCase();
  if (/^(NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(t)) return t.includes('MAX') ? 'NVARCHAR(MAX)' : t;
  if (/^(DECIMAL|MONEY|FLOAT)/.test(t)) return t;
  if (/^(DATETIME2|DATETIME|DATE|TIME)/.test(t)) return t;
  if (/^(INT|SMALLINT|TINYINT|BIGINT)/.test(t)) return t;
  if (/^BIT/.test(t)) return 'BIT';
  return t;
}
const out = [];
out.push('USE [GayatriCateringPortal];\nGO\n\nSET ANSI_NULLS ON\nGO\nSET QUOTED_IDENTIFIER ON\nGO\n');
for (const { name, pk, cols } of tables) {
  const nonIdCols = cols.filter(c => !c.isIdentity);
  const params = nonIdCols.map(c => {
    const ptype = paramType(c.ctype);
    const defaultVal = c.isNullable && /^(NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT|DATETIME)/i.test(ptype) ? ' = NULL' : (c.isNullable && ptype === 'BIT' ? ' = NULL' : '');
    return `    @${c.colname} ${ptype}${defaultVal}`;
  });
  out.push(`-- Procedures for ${name}`);
  out.push(`IF OBJECT_ID(N'SP_Create${name}', N'P') IS NOT NULL DROP PROCEDURE SP_Create${name};`);
  out.push('GO');
  out.push(`CREATE PROCEDURE SP_Create${name}`);
  if (params.length) out.push(`(${params.join(',\n')})`);
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  if (params.length) {
    const colsList = nonIdCols.map(c => `[${c.colname}]`).join(', ');
    let valsList = nonIdCols.map(c => `@${c.colname}`).join(', ');
    if (nonIdCols.some(c => c.colname.toLowerCase() === 'createddate')) {
      valsList = valsList.replace('@CreatedDate', 'COALESCE(@CreatedDate, GETDATE())');
    }
    out.push(`    INSERT INTO [dbo].[${name}] (${colsList})`);
    out.push(`    VALUES (${valsList});`);
    out.push('    SELECT SCOPE_IDENTITY() AS NewId;');
  } else {
    out.push(`    INSERT INTO [dbo].[${name}] DEFAULT VALUES;`);
    out.push('    SELECT SCOPE_IDENTITY() AS NewId;');
  }
  out.push('END');
  out.push('GO');

  out.push(`IF OBJECT_ID(N'SP_Update${name}', N'P') IS NOT NULL DROP PROCEDURE SP_Update${name};`);
  out.push('GO');
  const updParams = [`    @${pk} ${paramType(cols.find(c => c.colname === pk).ctype)}`, ...params];
  out.push(`CREATE PROCEDURE SP_Update${name}`);
  out.push(`(${updParams.join(',\n')})`);
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  if (params.length) {
    const setList = nonIdCols.map(c => `    [${c.colname}] = @${c.colname}`).join(',\n');
    out.push(`    UPDATE [dbo].[${name}]`);
    out.push('    SET ' + setList);
    out.push(`    WHERE [${pk}] = @${pk};`);
  }
  out.push('    SELECT @@ROWCOUNT AS RowsAffected;');
  out.push('END');
  out.push('GO');

  out.push(`IF OBJECT_ID(N'SP_Get${name}ById', N'P') IS NOT NULL DROP PROCEDURE SP_Get${name}ById;`);
  out.push('GO');
  out.push(`CREATE PROCEDURE SP_Get${name}ById`);
  out.push('(');
  out.push(`    @${pk} ${paramType(cols.find(c => c.colname === pk).ctype)}`);
  out.push(')');
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  out.push(`    SELECT * FROM [dbo].[${name}] WHERE [${pk}] = @${pk};`);
  out.push('END');
  out.push('GO');

  out.push(`IF OBJECT_ID(N'Get${name}', N'P') IS NOT NULL DROP PROCEDURE Get${name};`);
  out.push('GO');
  out.push(`CREATE PROCEDURE Get${name}`);
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  const whereDeleted = cols.some(c => c.colname.toLowerCase() === 'isdeleted');
  out.push(`    SELECT * FROM [dbo].[${name}]${whereDeleted ? ' WHERE [IsDeleted] = 0' : ''};`);
  out.push('END');
  out.push('GO');

  out.push(`IF OBJECT_ID(N'Delete${name}ById', N'P') IS NOT NULL DROP PROCEDURE Delete${name}ById;`);
  out.push('GO');
  out.push(`CREATE PROCEDURE Delete${name}ById`);
  out.push('(');
  out.push(`    @${pk} ${paramType(cols.find(c => c.colname === pk).ctype)}`);
  out.push(')');
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  if (whereDeleted) {
    out.push(`    UPDATE [dbo].[${name}] SET [IsDeleted] = 1 WHERE [${pk}] = @${pk};`);
  } else {
    out.push(`    DELETE FROM [dbo].[${name}] WHERE [${pk}] = @${pk};`);
  }
  out.push('    SELECT @@ROWCOUNT AS RowsAffected;');
  out.push('END');
  out.push('GO');

  out.push(`IF OBJECT_ID(N'ActiveInActive${name}ById', N'P') IS NOT NULL DROP PROCEDURE ActiveInActive${name}ById;`);
  out.push('GO');
  out.push(`CREATE PROCEDURE ActiveInActive${name}ById`);
  out.push('(');
  out.push(`    @${pk} ${paramType(cols.find(c => c.colname === pk).ctype)},`);
  out.push('    @IsActive BIT');
  out.push(')');
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  if (cols.some(c => c.colname.toLowerCase() === 'isactive')) {
    out.push(`    UPDATE [dbo].[${name}] SET [IsActive] = @IsActive WHERE [${pk}] = @${pk};`);
    out.push('    SELECT @@ROWCOUNT AS RowsAffected;');
  } else {
    out.push(`    RAISERROR('Table [${name}] does not contain an IsActive column.', 16, 1);`);
    out.push('    RETURN;');
  }
  out.push('END');
  out.push('GO');
}
const outputPath = path.resolve(__dirname, 'Gayatri-Portal-DB-sprocs.sql');
fs.writeFileSync(outputPath, out.join('\n'), 'utf8');
console.log('Wrote', outputPath, 'for', tables.length, 'tables.');
