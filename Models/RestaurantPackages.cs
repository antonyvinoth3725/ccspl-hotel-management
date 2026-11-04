using System;

namespace GayatriCateringPortal.Models
{
    public class RestaurantPackages
    {
        public int PackageID { get; set; }
        public string PackageName { get; set; } = null!;
        public string? PackageDescription { get; set; }
        public string? PackageType { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }
}
