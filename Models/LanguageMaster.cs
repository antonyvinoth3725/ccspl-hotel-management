using System;

namespace GayatriCateringPortal.Models
{
    public class LanguageMaster
    {
        public string Id { get; set; } = null!;
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? NativeName { get; set; }
        public string IsDefault { get; set; } = null!;
        public string IsActive { get; set; } = null!;
        public string IsDeleted { get; set; } = null!;
        public string? CreatedBy { get; set; }
        public string CreatedDate { get; set; } = null!;
        public string? UpdatedBy { get; set; }
        public string? UpdatedDate { get; set; }
    }
}
