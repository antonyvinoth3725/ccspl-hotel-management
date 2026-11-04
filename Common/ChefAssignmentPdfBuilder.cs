using System.Globalization;
using System.Text;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Common;

public static class ChefAssignmentPdfBuilder
{
    private const float PageWidth = 595f;
    private const float PageHeight = 842f;
    private const float Left = 38f;
    private const float Right = 557f;

    public static byte[] Build(ChefMaster chef, ChefMenuAssignmentEdit assignment, byte[]? logoBytes)
    {
        var menus = assignment.Menus.OrderBy(x => x.MenuName).ToList();
        var pages = new List<string>();
        const int firstPageRows = 18;
        const int otherPageRows = 27;
        var offset = 0;

        pages.Add(BuildPage(chef, assignment, menus.Take(firstPageRows).ToList(), 1, offset, true, menus));
        offset += firstPageRows;
        while (offset < menus.Count)
        {
            var pageRows = menus.Skip(offset).Take(otherPageRows).ToList();
            pages.Add(BuildPage(chef, assignment, pageRows, pages.Count + 1, offset, false, menus));
            offset += pageRows.Count;
        }

        return BuildDocument(pages, logoBytes);
    }

    private static string BuildPage(ChefMaster chef, ChefMenuAssignmentEdit assignment,
        List<ChefMenuAssignmentDetailItem> rows, int pageNumber, int rowOffset, bool firstPage,
        List<ChefMenuAssignmentDetailItem> allMenus)
    {
        var stream = new StringBuilder();
        FillRect(stream, 0, PageHeight - 8, PageWidth, 8, 0.02f, 0.43f, 0.24f);
        FillRect(stream, PageWidth - 150, PageHeight - 8, 150, 8, 0.96f, 0.58f, 0.08f);
        DrawLogo(stream, Left, 744, 112, 64);
        Text(stream, Right, 790, "CHEF MENU", 20, true, Align.Right, 0.03f, 0.25f, 0.15f);
        Text(stream, Right, 767, "ASSIGNMENT", 20, true, Align.Right, 0.03f, 0.25f, 0.15f);
        Text(stream, Right, 747, "Kitchen production brief", 9, false, Align.Right, 0.40f, 0.45f, 0.42f);
        Line(stream, Left, 727, Right, 727, 0.84f, 0.88f, 0.85f);

        var y = 704f;
        if (firstPage)
        {
            SummaryCard(stream, Left, y - 62, 165, 62, "CHEF", chef.Name, chef.Code);
            SummaryCard(stream, Left + 177, y - 62, 165, 62, "EVENT DATE", assignment.EventDate.ToString("dd MMM yyyy", CultureInfo.InvariantCulture), assignment.EventDate.ToString("dddd", CultureInfo.InvariantCulture));
            SummaryCard(stream, Left + 354, y - 62, 165, 62, "ASSIGNED ON", assignment.CreatedDate.ToString("dd MMM yyyy", CultureInfo.InvariantCulture), assignment.CreatedDate.ToString("HH:mm", CultureInfo.InvariantCulture));
            y -= 84;
            Text(stream, Left, y, "ORDER REFERENCES", 9, true, Align.Left, 0.42f, 0.47f, 0.44f);
            y -= 17;
            var orderLines = Wrap(string.Join(", ", assignment.OrderNumbers), 88).ToList();
            FillRect(stream, Left, y - 12 - (orderLines.Count * 13), Right - Left, 20 + (orderLines.Count * 13), 0.96f, 0.98f, 0.97f);
            foreach (var orderLine in orderLines)
            {
                Text(stream, Left + 12, y, orderLine, 10, true, Align.Left, 0.03f, 0.30f, 0.18f);
                y -= 13;
            }
            y -= 25;
        }
        else
        {
            Text(stream, Left, y, "Menu assignment continued", 11, true, Align.Left, 0.03f, 0.30f, 0.18f);
            y -= 28;
        }

        Text(stream, Left, y, "ASSIGNED MENUS", 11, true, Align.Left, 0.03f, 0.30f, 0.18f);
        Text(stream, Right, y, allMenus.Count + " items  |  Qty " + allMenus.Sum(x => x.AssignedQty), 9, true, Align.Right, 0.42f, 0.47f, 0.44f);
        y -= 19;
        const float noRight = Left + 48;
        const float qtyLeft = Right - 82;
        FillRect(stream, Left, y - 27, Right - Left, 27, 0.03f, 0.38f, 0.21f);
        Text(stream, Left + 14, y - 18, "NO.", 8, true, Align.Left, 1, 1, 1);
        Text(stream, noRight + 12, y - 18, "MENU ITEM", 8, true, Align.Left, 1, 1, 1);
        Text(stream, Right - 18, y - 18, "QTY", 8, true, Align.Right, 1, 1, 1);
        y -= 27;

        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            if (index % 2 == 1) FillRect(stream, Left, y - 25, Right - Left, 25, 0.97f, 0.98f, 0.97f);
            Line(stream, Left, y - 25, Right, y - 25, 0.89f, 0.91f, 0.90f);
            Text(stream, Left + 15, y - 17, (rowOffset + index + 1).ToString(), 9, false, Align.Left, 0.35f, 0.39f, 0.37f);
            Text(stream, noRight + 12, y - 17, Truncate(row.MenuName, 62), 10, true, Align.Left, 0.06f, 0.20f, 0.13f);
            Text(stream, Right - 18, y - 17, row.AssignedQty.ToString(), 10, true, Align.Right, 0.03f, 0.38f, 0.21f);
            Line(stream, noRight, y, noRight, y - 25, 0.89f, 0.91f, 0.90f);
            Line(stream, qtyLeft, y, qtyLeft, y - 25, 0.89f, 0.91f, 0.90f);
            y -= 25;
        }

        Line(stream, Left, 52, Right, 52, 0.84f, 0.88f, 0.85f);
        Text(stream, Left, 34, "Gayatri Catering  |  Kitchen Operations", 8, true, Align.Left, 0.12f, 0.35f, 0.23f);
        Text(stream, Right, 34, "Page " + pageNumber, 8, false, Align.Right, 0.42f, 0.47f, 0.44f);
        return stream.ToString();
    }

    private static void SummaryCard(StringBuilder stream, float x, float y, float width, float height, string label, string value, string detail)
    {
        FillRect(stream, x, y, width, height, 0.95f, 0.98f, 0.96f);
        StrokeRect(stream, x, y, width, height, 0.82f, 0.90f, 0.85f);
        Text(stream, x + 12, y + 43, label, 8, true, Align.Left, 0.42f, 0.47f, 0.44f);
        Text(stream, x + 12, y + 25, Truncate(value, 24), 12, true, Align.Left, 0.03f, 0.30f, 0.18f);
        Text(stream, x + 12, y + 10, Truncate(detail, 26), 8, false, Align.Left, 0.43f, 0.48f, 0.45f);
    }

    private static byte[] BuildDocument(List<string> pageStreams, byte[]? logoBytes)
    {
        var hasLogo = logoBytes is { Length: > 0 };
        var pageCount = pageStreams.Count;
        var pageObjectStart = 3;
        var contentObjectStart = pageObjectStart + pageCount;
        var fontRegularObject = contentObjectStart + pageCount;
        var fontBoldObject = fontRegularObject + 1;
        var logoObject = hasLogo ? fontBoldObject + 1 : 0;
        var objects = new List<byte[]> { Ascii("<< /Type /Catalog /Pages 2 0 R >>") };
        objects.Add(Ascii("<< /Type /Pages /Kids [" + string.Join(" ", Enumerable.Range(0, pageCount).Select(i => (pageObjectStart + i) + " 0 R")) + "] /Count " + pageCount + " >>"));
        for (var index = 0; index < pageCount; index++)
        {
            var xObject = hasLogo ? " /XObject << /Im1 " + logoObject + " 0 R >>" : string.Empty;
            objects.Add(Ascii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + fontRegularObject + " 0 R /F2 " + fontBoldObject + " 0 R >>" + xObject + " >> /Contents " + (contentObjectStart + index) + " 0 R >>"));
        }
        foreach (var page in pageStreams)
        {
            var bytes = Ascii(page);
            objects.Add(Combine(Ascii("<< /Length " + bytes.Length + " >>\nstream\n"), bytes, Ascii("\nendstream")));
        }
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
        if (hasLogo) objects.Add(Combine(Ascii("<< /Type /XObject /Subtype /Image /Width 553 /Height 317 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + logoBytes!.Length + " >>\nstream\n"), logoBytes, Ascii("\nendstream")));

        using var output = new MemoryStream(); Write(output, "%PDF-1.4\n"); var offsets = new List<long> { 0 };
        for (var index = 0; index < objects.Count; index++) { offsets.Add(output.Position); Write(output, (index + 1) + " 0 obj\n"); output.Write(objects[index]); Write(output, "\nendobj\n"); }
        var xref = output.Position; Write(output, "xref\n0 " + (objects.Count + 1) + "\n0000000000 65535 f \n");
        for (var index = 1; index < offsets.Count; index++) Write(output, offsets[index].ToString("0000000000") + " 00000 n \n");
        Write(output, "trailer\n<< /Size " + (objects.Count + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF"); return output.ToArray();
    }

    private static void DrawLogo(StringBuilder s, float x, float y, float w, float h) => s.Append(CultureInfo.InvariantCulture, $"q {w} 0 0 {h} {x} {y} cm /Im1 Do Q\n");
    private static void FillRect(StringBuilder s, float x, float y, float w, float h, float r, float g, float b) => s.Append(CultureInfo.InvariantCulture, $"{r} {g} {b} rg {x} {y} {w} {h} re f\n");
    private static void StrokeRect(StringBuilder s, float x, float y, float w, float h, float r, float g, float b) => s.Append(CultureInfo.InvariantCulture, $"{r} {g} {b} RG {x} {y} {w} {h} re S\n");
    private static void Line(StringBuilder s, float x1, float y1, float x2, float y2, float r, float g, float b) => s.Append(CultureInfo.InvariantCulture, $"{r} {g} {b} RG {x1} {y1} m {x2} {y2} l S\n");
    private static void Text(StringBuilder s, float x, float y, string value, float size, bool bold, Align align, float r, float g, float b) { value = PdfText(value); if (align == Align.Right) x -= value.Length * size * 0.5f; s.Append(CultureInfo.InvariantCulture, $"BT {r} {g} {b} rg /{(bold ? "F2" : "F1")} {size} Tf {x} {y} Td ({Escape(value)}) Tj ET\n"); }
    private static IEnumerable<string> Wrap(string value, int length) { if (string.IsNullOrWhiteSpace(value)) { yield return "-"; yield break; } var words = value.Split(' '); var line = new StringBuilder(); foreach (var word in words) { if (line.Length > 0 && line.Length + word.Length + 1 > length) { yield return line.ToString(); line.Clear(); } if (line.Length > 0) line.Append(' '); line.Append(word); } if (line.Length > 0) yield return line.ToString(); }
    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..(max - 3)] + "...";
    private static string PdfText(string value) => new((value ?? string.Empty).Select(c => c is >= ' ' and <= '~' ? c : '?').ToArray());
    private static string Escape(string value) => value.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
    private static byte[] Ascii(string value) => Encoding.ASCII.GetBytes(value);
    private static void Write(Stream stream, string value) => stream.Write(Ascii(value));
    private static byte[] Combine(params byte[][] arrays) { var result = new byte[arrays.Sum(x => x.Length)]; var offset = 0; foreach (var array in arrays) { Buffer.BlockCopy(array, 0, result, offset, array.Length); offset += array.Length; } return result; }
    private enum Align { Left, Right }
}
