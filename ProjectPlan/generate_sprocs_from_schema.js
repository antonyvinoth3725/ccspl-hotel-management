const fs = require('fs');
const path = require('path');
const base = __dirname;
const text = fs.readFileSync(path.join(base, 'Gayatri-Portal-DB-script.txt'), 'utf8');

function findTableBlocks(sql) {
  const blocks = [];
  const createRegex = /^CREATE TABLE \[dbo\]\.\[([^\]]+)\]\s*\(/i;
  const lines = sql.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(createRegex);
    if (!m) continue;

    const name = m[1];
    const blockLines = [lines[i]];
    let depth = 0;
    let foundStart = false;

    for (let j = i; j < lines.length; j++) {
      const currentLine = lines[j];
      const openCount = (currentLine.match(/\(/g) || []).length;
      const closeCount = (currentLine.match(/\)/g) || []).length;

      if (!foundStart) {
        if (currentLine.includes('(')) {
          foundStart = true;
          depth += openCount;
          depth -= closeCount;
        }
      } else {
        depth += openCount;
        depth -= closeCount;
      }

      blockLines.push(currentLine);
      if (foundStart && depth <= 0) {
        i = j;
        break;
      }
    }

    blocks.push([name, blockLines.join('\n')]);
  }
  return blocks;
}

function normalizeType(coltype) {
  const t = coltype.toUpperCase().trim();
  if (t.startsWith('NVARCHAR') || t.startsWith('VARCHAR') || t.startsWith('NCHAR') || t.startsWith('CHAR') || t.startsWith('TEXT')) {
    return t.includes('MAX') ? 'NVARCHAR(MAX)' : t;
  }
  if (t.startsWith('DECIMAL') || t.startsWith('MONEY') || t.startsWith('FLOAT')) return t;
  if (t.startsWith('DATETIME2') || t.startsWith('DATETIME') || t.startsWith('DATE') || t.startsWith('TIME')) return t;
  if (t.startsWith('INT') || t.startsWith('SMALLINT') || t.startsWith('TINYINT') || t.startsWith('BIGINT')) return t;
  if (t.startsWith('BIT')) return 'BIT';
  return t;
}

const blocks = findTableBlocks(text);
const tables = [];
for (const [name, blockText] of blocks) {
  const firstParen = blockText.indexOf('(');
  const lastParen = blockText.lastIndexOf(')');
  const body = firstParen >= 0 && lastParen > firstParen ? blockText.slice(firstParen + 1, lastParen) : '';
  const cols = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('PRIMARY KEY') || line.startsWith('CONSTRAINT') || line.startsWith(')')) continue;
    const m = line.replace(/,$/, '').match(/\[([^\]]+)\]\s+([^\s]+(?:\([^\)]*\))?)(.*)$/i);
    if (!m) {
      const fallback = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([^\s]+(?:\([^\)]*\))?)(.*)$/);
      if (!fallback) continue;
      const colname = fallback[1].replace(/^\[/, '').replace(/\]$/, '');
      const ctype = fallback[2].replace(/^\[/, '').replace(/\]$/, '');
      const rest = fallback[3].trim();
      const dtype = ctype.toUpperCase();
      if (!/^(INT|BIGINT|SMALLINT|TINYINT|BIT|DECIMAL|MONEY|FLOAT|DATETIME2?|DATE|TIME|NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(dtype)) continue;
      cols.push({ colname, ctype, isIdentity: rest.includes('IDENTITY'), isNullable: !rest.includes('NOT NULL') });
      continue;
    }
    const colname = m[1];
    const ctype = m[2].replace(/^\[/, '').replace(/\]$/, '');
    const rest = m[3].trim();
    const dtype = ctype.toUpperCase();
    if (!/^(INT|BIGINT|SMALLINT|TINYINT|BIT|DECIMAL|MONEY|FLOAT|DATETIME2?|DATE|TIME|NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)/.test(dtype)) continue;
    cols.push({ colname, ctype, isIdentity: rest.includes('IDENTITY'), isNullable: !rest.includes('NOT NULL') });
  }
  let pk = null;
  const pkm = blockText.match(/PRIMARY KEY CLUSTERED \([^\)]*\[([^\]]+)\] ASC/);
  if (pkm) pk = pkm[1];
  else {
    const identityCol = cols.find(c => c.isIdentity);
    pk = identityCol ? identityCol.colname : (cols[0] ? cols[0].colname : null);
  }
  if (pk) tables.push({ name, pk, cols });
}

const out = [];
out.push('USE [GayatriCateringPortal];\nGO\n\nSET ANSI_NULLS ON\nGO\nSET QUOTED_IDENTIFIER ON\nGO\n');
for (const { name, pk, cols } of tables) {
  const nonIdCols = cols.filter(c => !c.isIdentity);
  const params = nonIdCols.map(c => {
    const ptype = normalizeType(c.ctype);
    const defaultVal = c.isNullable ? ' = NULL' : '';
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
  const updParams = [`    @${pk} ${normalizeType(cols.find(c => c.colname === pk).ctype)}`, ...params];
  out.push(`CREATE PROCEDURE SP_Update${name}`);
  out.push(`(${updParams.join(',\n')})`);
  out.push('AS');
  out.push('BEGIN');
  out.push('    SET NOCOUNT ON;');
  if (params.length) {
    const setList = nonIdCols.map(c => `    [${c.colname}] = @${c.colname}`).join('\n');
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
  out.push(`    @${pk} ${normalizeType(cols.find(c => c.colname === pk).ctype)}`);
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
  out.push(`    @${pk} ${normalizeType(cols.find(c => c.colname === pk).ctype)}`);
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
  out.push(`    @${pk} ${normalizeType(cols.find(c => c.colname === pk).ctype)},`);
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
fs.writeFileSync(path.join(base, 'Gayatri-Portal-DB-sprocs.sql'), out.join('\n'), 'utf8');
console.log('Wrote', path.join(base, 'Gayatri-Portal-DB-sprocs.sql'), 'for', tables.length, 'tables.');
