using System;

namespace GayatriCateringPortal.Models
{
    public class CustomerMaster
    {
        public int Id { get; set; }
        public string? Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? MobileNo { get; set; }
        public string? AlternateMobileNo { get; set; }
        public string? EmailId { get; set; }
        public string? Address { get; set; }
        public string? Pincode { get; set; }
        public string? Remarks { get; set; }
        public bool IsActive { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public bool IsDeleted { get; set; }
        public int? EntityNo { get; set; }

    }
}
