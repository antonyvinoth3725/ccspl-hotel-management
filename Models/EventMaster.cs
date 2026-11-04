namespace GayatriCateringPortal.Models
{
    public class EventMaster
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public int MinPax { get; set; } = 0;
        public decimal ServiceCharge { get; set; } = 0;
        public int AdvanceBookingDays { get; set; }
        public string? PackageIds { get; set; }
        public List<EventDetails> PackageDetails { get; set; } = new();

        public bool IsDeleted { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public int? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; }

        public int? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }
    }
}
