using System;
using Microsoft.AspNetCore.Http;

namespace GayatriCateringPortal.Models
{
    public class UserMaster
    {
        public int Id { get; set; }
        public string Code { get; set; } 
        public string Name { get; set; }
        public string? Remarks { get; set; }
        public bool IsAdmin { get; set; } 
        public string Email { get; set; } = null!;
        public string? Password { get; set; }
        public string? ContactNo { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string? Image { get; set; }
        public int? Gender { get; set; }
        public string? Address { get; set; }
        public int? PostalCode { get; set; }
        public int? EntityNo { get; set; }

    }

    public class SaveUserRequest : UserMaster
    {
        public IFormFile? ImageFile { get; set; }
    }
}
