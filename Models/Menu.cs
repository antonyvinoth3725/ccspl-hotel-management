using System;

namespace GayatriCateringPortal.Models
{
    public class Menu
    {
        public string Id { get; set; } = null!;
        public string? Name { get; set; }
        public string? IsActive { get; set; }
        public string? IsDeleted { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedDate { get; set; }
        public string? UpdatedBy { get; set; }
        public string? UpdatedDate { get; set; }
        public string? DisplayOrder { get; set; }
        public string? MenuIcon { get; set; }
    }
}
