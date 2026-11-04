using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace GayatriCateringPortal.Models
{
    public class FoodMenu
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public int CategoryId { get; set; }
        public decimal? Price { get; set; }
        
        public int? FoodType { get; set; }
        
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; } = null!;
        public int UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        [NotMapped]
        public string Category { get; set; }
        [NotMapped]
        public int SNo { get; set; }
        public int? EntityNo { get; set; }

    }
}
