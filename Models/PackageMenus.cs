using System;

namespace GayatriCateringPortal.Models
{
    public class PackageMenus
    {
        public int Id { get; set; }
        public int PackageId { get; set; }
        public int FoodMenuId { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDeleted { get; set; }
        public string? FoodMenuName { get; set; }
        public decimal? FoodMenuPrice { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? ChoiceGroupName { get; set; }
        public int DisplayOrder { get; set; }

    }
}
