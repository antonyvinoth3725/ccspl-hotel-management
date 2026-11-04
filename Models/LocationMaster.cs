using System;

namespace GayatriCateringPortal.Models
{
    public class LocationMaster
    {
        public int Id { get; set; }
        public string? Code { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string? DeliveryZone { get; set; }
        public decimal DeliveryFee { get; set; }
        public bool IsActive { get; set; }
        public string? Remarks { get; set; }
        public bool IsDeleted { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }
}
