namespace GayatriCateringPortal.Models
{
    public class DriverMaster
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string MobileNo { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? LicenseNo { get; set; }
        public DateTime? LicenseExpiryDate { get; set; }
        public DateTime? DateofBirth { get; set; }
        public char? Gender { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? VehicleType { get; set; }
        public string? VehicleNo { get; set; }
        public int? ExperienceYears { get; set; }
        public DateTime? JoiningDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int UpdatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int? EntityNo { get; set; }
        public string EmployeeType { get; set; } = null!;

    }
}
