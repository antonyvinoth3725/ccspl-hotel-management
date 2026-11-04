namespace GayatriCateringPortal.Models
{
    public class PopularFreebieMaster
    {
        public int Id { get; set; }
             

        public string Name { get; set; } = string.Empty;

        public int? PackageId { get; set; }

        public int? MinPax { get; set; }

        public int? FreeQty { get; set; }

        public int? LocationId { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsActive { get; set; }

        public DateTime? ValidFrom { get; set; }

        public DateTime? ValidTo { get; set; }

        public string? Remarks { get; set; }

        public bool IsDeleted { get; set; }

        public int? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; }

        public int? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }
    }
}
