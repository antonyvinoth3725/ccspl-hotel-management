using System;

namespace GayatriCateringPortal.Models
{
    public class PackageItems
    {
        public int Id { get; set; }
        public int PackageId { get; set; }
        public int CategoryId { get; set; }
        public int Quantity { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDeleted { get; set; }
    }
}
