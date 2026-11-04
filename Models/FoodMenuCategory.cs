using System;

namespace GayatriCateringPortal.Models
{
    public class FoodMenuCategory
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public int MaxChoice { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; } = null!;
        public int UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int? EntityNo { get; set; }

    }
}
