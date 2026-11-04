namespace GayatriCateringPortal.Models;

public class EventDetails
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public string? PackageName { get; set; }
    public int EventId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
}
