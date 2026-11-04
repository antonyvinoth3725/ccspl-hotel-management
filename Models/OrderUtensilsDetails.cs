using System;

namespace GayatriCateringPortal.Models
{
    public class OrderUtensilsDetails
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int UtensilsId { get; set; }
        public int Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal RefundableDeposit { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int? UpdatedBy { get; set; }
    }
}
