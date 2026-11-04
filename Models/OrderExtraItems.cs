using System;

namespace GayatriCateringPortal.Models
{
    public class OrderExtraItems
    {
        public int Id { get; set; }

        public int OrderId { get; set; }

        public int? CategoryId { get; set; }

        public int? MenuId { get; set; }

        public int? Qty { get; set; }
        public string? Notes { get; set; }

        public decimal? UnitPrice { get; set; }

        public decimal? TotalAmount { get; set; }

        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime CreatedDate { get; set; }

        public int? CreatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        public int? UpdatedBy { get; set; }
    }
}
