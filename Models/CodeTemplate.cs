namespace GayatriCateringPortal.Models;

public class CodeTemplate
{
    public int Id { get; set; }
    public int EntityNo { get; set; }
    public string? Name { get; set; }
    public int StartValue { get; set; }
    public string? Prefix { get; set; }
    public int CurrentValue { get; set; }
    public string? Suffix { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsActive { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public int UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public int NoOfDigit { get; set; }
    public bool IsDateMonthYearWise { get; set; }
    public string? LatestCode { get; set; }
}
