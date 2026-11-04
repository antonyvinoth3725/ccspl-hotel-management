import re
import pathlib

base = pathlib.Path(__file__).parent
text = (base / 'Gayatri-Portal-DB-script.txt').read_text(encoding='utf-8')


def find_table_blocks(sql):
    blocks = []
    pos = 0
    while True:
        m = re.search(r'CREATE TABLE \[dbo\]\.\[([^\]]+)\]\s*\(', sql[pos:], re.I)
        if not m:
            break
        start = pos + m.start()
        name = m.group(1)
        paren_idx = start + m.end() - 1
        depth = 1
        i = paren_idx + 1
        while i < len(sql):
            ch = sql[i]
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    break
            i += 1
        if i >= len(sql):
            break
        block_text = sql[start:i+1]
        blocks.append((name, block_text))
        pos = i + 1
    return blocks


def normalize_type(coltype):
    t = coltype.upper().strip()
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


def main():
    blocks = find_table_blocks(text)
    tables = []
    for name, block_text in blocks:
        body = block_text[block_text.index('(')+1: len(block_text)-1]
        cols = []
        for raw in body.splitlines():
            line = raw.strip()
            if not line or line.startswith('PRIMARY KEY') or line.startswith('CONSTRAINT') or line.startswith(')'):
                continue
            line = line.rstrip(',')
            m = re.match(r'\[([^\]]+)\]\s+([^\s]+(?:\([^\)]*\))?)(.*)$', line)
            if not m:
                continue
            colname, ctype, rest = m.groups()
            rest = rest.strip()
            dtype = ctype.upper()
            if not re.match(r'^(INT|BIGINT|SMALLINT|TINYINT|BIT|DECIMAL|MONEY|FLOAT|DATETIME2?|DATE|TIME|NVARCHAR|VARCHAR|NCHAR|CHAR|TEXT)', dtype):
                continue
            cols.append({
                'colname': colname,
                'ctype': ctype,
                'is_identity': 'IDENTITY' in rest,
                'is_nullable': 'NOT NULL' not in rest,
            })
        pk = None
        pkm = re.search(r'PRIMARY KEY CLUSTERED \([^\)]*\[([^\]]+)\] ASC', block_text)
        if pkm:
            pk = pkm.group(1)
        else:
            for c in cols:
                if c['is_identity']:
                    pk = c['colname']
                    break
            if not pk and cols:
                pk = cols[0]['colname']
        if pk:
            tables.append((name, pk, cols))

    out = []
    out.append('USE [GayatriCateringPortal];\nGO\n\nSET ANSI_NULLS ON\nGO\nSET QUOTED_IDENTIFIER ON\nGO\n')
    for name, pk, cols in tables:
        non_id_cols = [c for c in cols if not c['is_identity']]
        params = []
        for c in non_id_cols:
            ptype = normalize_type(c['ctype'])
            default = ' = NULL' if c['is_nullable'] else ''
            if ptype.upper() == 'BIT' and c['is_nullable']:
                default = ' = NULL'
            params.append(f"    @{c['colname']} {ptype}{default}")

        out.append(f'-- Procedures for {name}')
        out.append(f"IF OBJECT_ID(N'SP_Create{name}', N'P') IS NOT NULL DROP PROCEDURE SP_Create{name};")
        out.append('GO')
        out.append(f'CREATE PROCEDURE SP_Create{name}')
        if params:
            out.append('(' + ',\n'.join(params) + ')')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        if params:
            cols_list = ', '.join(f'[{c["colname"]}]' for c in non_id_cols)
            vals_list = ', '.join(f'@{c["colname"]}' for c in non_id_cols)
            if any(c['colname'].lower() == 'createddate' for c in non_id_cols):
                vals_list = vals_list.replace('@CreatedDate', 'COALESCE(@CreatedDate, GETDATE())')
            out.append(f'    INSERT INTO [dbo].[{name}] ({cols_list})')
            out.append(f'    VALUES ({vals_list});')
            out.append('    SELECT SCOPE_IDENTITY() AS NewId;')
        else:
            out.append(f'    INSERT INTO [dbo].[{name}] DEFAULT VALUES;')
            out.append('    SELECT SCOPE_IDENTITY() AS NewId;')
        out.append('END')
        out.append('GO')

        out.append(f"IF OBJECT_ID(N'SP_Update{name}', N'P') IS NOT NULL DROP PROCEDURE SP_Update{name};")
        out.append('GO')
        upd_params = [f"    @{pk} {normalize_type(next(c['ctype'] for c in cols if c['colname'] == pk))}"]
        upd_params += params
        out.append(f'CREATE PROCEDURE SP_Update{name}')
        out.append('(' + ',\n'.join(upd_params) + ')')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        if params:
            set_list = ',\n'.join(f'    [{c["colname"]}] = @{c["colname"]}' for c in non_id_cols)
            out.append(f'    UPDATE [dbo].[{name}]')
            out.append('    SET ' + set_list)
            out.append(f'    WHERE [{pk}] = @{pk};')
        out.append('    SELECT @@ROWCOUNT AS RowsAffected;')
        out.append('END')
        out.append('GO')

        out.append(f"IF OBJECT_ID(N'SP_Get{name}ById', N'P') IS NOT NULL DROP PROCEDURE SP_Get{name}ById;")
        out.append('GO')
        out.append(f'CREATE PROCEDURE SP_Get{name}ById')
        out.append('(')
        out.append(f'    @{pk} {normalize_type(next(c["ctype"] for c in cols if c["colname"] == pk))}')
        out.append(')')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        out.append(f'    SELECT * FROM [dbo].[{name}] WHERE [{pk}] = @{pk};')
        out.append('END')
        out.append('GO')

        out.append(f"IF OBJECT_ID(N'Get{name}', N'P') IS NOT NULL DROP PROCEDURE Get{name};")
        out.append('GO')
        out.append(f'CREATE PROCEDURE Get{name}')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        where_deleted = any(c['colname'].lower() == 'isdeleted' for c in cols)
        out.append(f'    SELECT * FROM [dbo].[{name}]' + (' WHERE [IsDeleted] = 0' if where_deleted else '') + ';')
        out.append('END')
        out.append('GO')

        out.append(f"IF OBJECT_ID(N'Delete{name}ById', N'P') IS NOT NULL DROP PROCEDURE Delete{name}ById;")
        out.append('GO')
        out.append(f'CREATE PROCEDURE Delete{name}ById')
        out.append('(')
        out.append(f'    @{pk} {normalize_type(next(c["ctype"] for c in cols if c["colname"] == pk))}')
        out.append(')')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        if any(c['colname'].lower() == 'isdeleted' for c in cols):
            out.append(f'    UPDATE [dbo].[{name}] SET [IsDeleted] = 1 WHERE [{pk}] = @{pk};')
        else:
            out.append(f'    DELETE FROM [dbo].[{name}] WHERE [{pk}] = @{pk};')
        out.append('    SELECT @@ROWCOUNT AS RowsAffected;')
        out.append('END')
        out.append('GO')

        out.append(f"IF OBJECT_ID(N'ActiveInActive{name}ById', N'P') IS NOT NULL DROP PROCEDURE ActiveInActive{name}ById;")
        out.append('GO')
        out.append(f'CREATE PROCEDURE ActiveInActive{name}ById')
        out.append('(')
        out.append(f'    @{pk} {normalize_type(next(c["ctype"] for c in cols if c["colname"] == pk))},')
        out.append('    @IsActive BIT')
        out.append(')')
        out.append('AS')
        out.append('BEGIN')
        out.append('    SET NOCOUNT ON;')
        if any(c['colname'].lower() == 'isactive' for c in cols):
            out.append(f'    UPDATE [dbo].[{name}] SET [IsActive] = @IsActive WHERE [{pk}] = @{pk};')
            out.append('    SELECT @@ROWCOUNT AS RowsAffected;')
        else:
            out.append(f'    RAISERROR(\'Table [{name}] does not contain an IsActive column.\', 16, 1);')
            out.append('    RETURN;')
        out.append('END')
        out.append('GO')

    output_path = base / 'Gayatri-Portal-DB-sprocs.sql'
    output_path.write_text('\n'.join(out), encoding='utf-8')
    print(f'Wrote {output_path} with {len(tables)} tables.')


if __name__ == '__main__':
    main()
