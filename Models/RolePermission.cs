using System;

namespace GayatriCateringPortal.Models
{
    public class RolePermission
    {
        public string Id { get; set; } = null!;
        public string RoleId { get; set; } = null!;
        public string EntityNo { get; set; } = null!;
        public string View { get; set; } = null!;
        public string Create { get; set; } = null!;
        public string Edit { get; set; } = null!;
        public string Delete { get; set; } = null!;
        public string? ActiveInActive { get; set; }
        public string? Print { get; set; }
        public string? Download { get; set; }
        public string CreatedDate { get; set; } = null!;
        public string CreatedBy { get; set; } = null!;
        public string? UpdatedDate { get; set; }
        public string? UpdatedBy { get; set; }
        public string IsActive { get; set; } = null!;
        public string IsDeleted { get; set; } = null!;
    }
}
