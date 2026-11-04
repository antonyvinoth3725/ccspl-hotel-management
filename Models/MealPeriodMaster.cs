using System;

namespace GayatriCateringPortal.Models
{
    public class MealPeriodMaster
    {
        public int Id { get; set; } 
        public string Code { get; set; } = null!;
        public string MealPeriodName { get; set; } = null!;
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public int DisplayOrder { get; set; } 
        public bool IsActive { get; set; } 
        public int? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; } 
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public bool? IsDeleted { get; set; }
        public int? EntityNo { get; set; }
    }
}
