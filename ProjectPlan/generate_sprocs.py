import re
from pathlib import Path

path = Path(__file__).parent / 'Gayatri-Portal-DB-script.txt'
text = path.read_text(encoding='utf-8')
blocks = re.split(r'GO\s*\r?\n', text)
tables = []
for block in blocks:
    m = re.search(r'CREATE TABLE \[dbo\]\.\[([^\]]+)\]\((.*?)\)\s*ON \[PRIMARY\]', block, re.S)
    if m:
        name = m.group(1)
        cols_text = m.group(2)
        cols = []
        for line in cols_text.splitlines():
            line = line.strip()
            if not line or line.startswith('PRIMARY KEY') or line.startswith('CONSTRAINT') or line.startswith(')'):
                continue
            line = line.rstrip(',')
            colm = re.match(r'\[([^\]]+)\]\s+([^\s]+(?:\([^\)]*\))?)(.*)$', line)
            if colm:
                colname = colm.group(1)
                ctype = colm.group(2)
                rest = colm.group(3)
                is_identity = 'IDENTITY' in rest
                is_nullable = 'NOT NULL' not in rest
                cols.append((colname, ctype, is_nullable, is_identity, rest.strip()))
        pk = None
        pkmatch = re.search(r'PRIMARY KEY CLUSTERED \([^\)]*\[([^\]]+)\] ASC', block)
        if pkmatch:
            pk = pkmatch.group(1)
        else:
            for cname, ctype, nullable, ident, rest in cols:
                if ident:
                    pk = cname
                    break
            if not pk and cols:
                pk = cols[0][0]
        tables.append((name, pk, cols, block))


def param_type(coltype):
    t = coltype.upper()
    if t.startswith(('NVARCHAR', 'VARCHAR', 'NCHAR', 'CHAR', 'TEXT')):
        return 'NVARCHAR(MAX)' if 'MAX' in t else t
    if t.startswith(('DECIMAL', 'MONEY', 'FLOAT')):
        return t
    if t.startswith(('DATETIME2', 'DATETIME', 'DATE', 'TIME')):
        return t
    if t.startswith(('INT', 'SMALLINT', 'TINYINT', 'BIGINT')):
        return t
    if t.startswith('BIT'):
        return 'BIT'
    return t

out = []
out.append('USE [GayatriCateringPortal];\nGO\n\nSET ANSI_NULLS ON\nGO\nSET QUOTED_IDENTIFIER ON\nGO\n')
for table, pk, cols, block in tables:
    non_id_cols = [c for c in cols if not c[3]]
    params = []
    for colname, ctype, nullable, ident, rest in non_id_cols:
        ptype = param_type(ctype)
        default = ' = NULL' if nullable else ''
        if ptype.upper() in ('BIT',) and nullable:
            default = ' = NULL'
        elif ptype.upper().startswith(('NVARCHAR', 'VARCHAR')):
            default = ' = NULL' if nullable else ''
        params.append(f'    @{colname} {ptype}{default}')
    out.append(f'-- Procedures for {table}\n')
    out.append(f'IF OBJECT_ID(N''SP_Create{table}'', N''P'') IS NOT NULL DROP PROCEDURE SP_Create{table};\nGO')
    out.append(f'CREATE PROCEDURE SP_Create{table}')
    if params:
        out.append('(' + '\n' + ',\n'.join(params) + '\n)')
    out.append('AS\nBEGIN\n    SET NOCOUNT ON;\n')
    if params:
        cols_list = ', '.join(f'[{c[0]}]' for c in non_id_cols)
        vals_list = ', '.join(f'@{c[0]}' for c in non_id_cols)
        if any(c[0].lower() == 'createddate' for c in non_id_cols):
            vals_list = vals_list.replace('@CreatedDate', 'COALESCE(@CreatedDate, GETDATE())')
        out.append(f'    INSERT INTO [dbo].[{table}] ({cols_list})\n    VALUES ({vals_list});\n    SELECT SCOPE_IDENTITY() AS NewId;\n')
    else:
        out.append(f'    INSERT INTO [dbo].[{table}] DEFAULT VALUES;\n    SELECT SCOPE_IDENTITY() AS NewId;\n')
    out.append('END\nGO\n')

    out.append(f'IF OBJECT_ID(N''SP_Update{table}'', N''P'') IS NOT NULL DROP PROCEDURE SP_Update{table};\nGO')
    upd_params = [f'    @{pk} {param_type(next(c[1] for c in cols if c[0] == pk))}']
    upd_params += params
    out.append(f'CREATE PROCEDURE SP_Update{table}')
    out.append('(' + '\n' + ',\n'.join(upd_params) + '\n)')
    out.append('AS\nBEGIN\n    SET NOCOUNT ON;\n')
    if params:
        set_list = ',\n        '.join(f'[{c[0]}] = @{c[0]}' for c in non_id_cols)
        out.append(f'    UPDATE [dbo].[{table}]\n    SET {set_list}\n    WHERE [{pk}] = @{pk};\n')
    out.append('    SELECT @@ROWCOUNT AS RowsAffected;\nEND\nGO\n')

    out.append(f'IF OBJECT_ID(N''SP_Get{table}ById'', N''P'') IS NOT NULL DROP PROCEDURE SP_Get{table}ById;\nGO')
    out.append(f'CREATE PROCEDURE SP_Get{table}ById\n(\n    @{pk} {param_type(next(c[1] for c in cols if c[0] == pk))}\n)\nAS\nBEGIN\n    SET NOCOUNT ON;\n    SELECT * FROM [dbo].[{table}] WHERE [{pk}] = @{pk};\nEND\nGO\n')

    out.append(f'IF OBJECT_ID(N''Get{table}'', N''P'') IS NOT NULL DROP PROCEDURE Get{table};\nGO')
    out.append(f'CREATE PROCEDURE Get{table}\nAS\nBEGIN\n    SET NOCOUNT ON;\n    SELECT * FROM [dbo].[{table}]')
    if any(c[0].lower() == 'isdeleted' for c in cols):
        out.append(' WHERE [IsDeleted] = 0;')
    else:
        out.append(';')
    out.append('\nEND\nGO\n')

    out.append(f'IF OBJECT_ID(N''Delete{table}ById'', N''P'') IS NOT NULL DROP PROCEDURE Delete{table}ById;\nGO')
    out.append(f'CREATE PROCEDURE Delete{table}ById\n(\n    @{pk} {param_type(next(c[1] for c in cols if c[0] == pk))}\n)\nAS\nBEGIN\n    SET NOCOUNT ON;\n')
    if any(c[0].lower() == 'isdeleted' for c in cols):
        out.append(f'    UPDATE [dbo].[{table}] SET [IsDeleted] = 1 WHERE [{pk}] = @{pk};\n')
    else:
        out.append(f'    DELETE FROM [dbo].[{table}] WHERE [{pk}] = @{pk};\n')
    out.append('    SELECT @@ROWCOUNT AS RowsAffected;\nEND\nGO\n')

    out.append(f'IF OBJECT_ID(N''ActiveInActive{table}ById'', N''P'') IS NOT NULL DROP PROCEDURE ActiveInActive{table}ById;\nGO')
    if any(c[0].lower() == 'isactive' for c in cols):
        out.append(f'CREATE PROCEDURE ActiveInActive{table}ById\n(\n    @{pk} {param_type(next(c[1] for c in cols if c[0] == pk))},\n    @IsActive BIT\n)\nAS\nBEGIN\n    SET NOCOUNT ON;\n    UPDATE [dbo].[{table}] SET [IsActive] = @IsActive WHERE [{pk}] = @{pk};\n    SELECT @@ROWCOUNT AS RowsAffected;\nEND\nGO\n')
    else:
        out.append(f'CREATE PROCEDURE ActiveInActive{table}ById\n(\n    @{pk} {param_type(next(c[1] for c in cols if c[0] == pk))},\n    @IsActive BIT\n)\nAS\nBEGIN\n    SET NOCOUNT ON;\n    RAISERROR(''Table [{table}] does not contain an IsActive column.'', 16, 1);\n    RETURN;\nEND\nGO\n')

output = '\n'.join(out)
output_path = Path(__file__).parent / 'Gayatri-Portal-DB-sprocs.sql'
output_path.write_text(output, encoding='utf-8')
print(f'Wrote {output_path.resolve()} with {len(tables)} tables.')
