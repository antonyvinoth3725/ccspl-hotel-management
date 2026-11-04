using System;

namespace GayatriCateringPortal.Models
{
    public class AddOnMaster
    {
        public int Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string AddOnName { get; set; } = string.Empty;

        public string UnitType { get; set; } = string.Empty;

        public decimal Rate { get; set; }

        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }

        public int? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; }

        public int? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }
        public int? EntityNo { get; set; }

    }
}
