using Microsoft.AspNetCore.Http.HttpResults;
using System.Net;

namespace GayatriCateringPortal.Models
{
    public class ChefMaster
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;        
        public string MobileNo { get; set; } = string.Empty;
        public string EmailId { get; set; } = string.Empty;
        public string ChefType { get; set; } = string.Empty;
        public string Specialization {  get; set; } = string.Empty;
        public string? KitchenBranch { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string? EmploymentStatus { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int? EntityNo { get; set; }
    }
}
