using System;

namespace GayatriCateringPortal.Models
{
    public class UtensilMaster
    {
        public int Id { get; set; }
        public string UtensilName { get; set; } = null!;
        public string RuleType { get; set; } = string.Empty;
        public string RuleOperator { get; set; } = string.Empty;
        public decimal RuleValue { get; set; }
        public decimal RulePercentage { get; set; }
        public int MinimumQty { get; set; }
        public string? RuleDescription { get; set; }
        public decimal Price { get; set; }
        public decimal DepositAmount { get; set; }
        public bool IsDeleted { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; } = null!;
        public int UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public bool IsActive { get; set; }
    }
}
