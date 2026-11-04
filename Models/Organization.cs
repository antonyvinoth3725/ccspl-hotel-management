using System;

namespace GayatriCateringPortal.Models
{
    public class Organization
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string UEN { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string Email { get; set; } = null!;        
        public string Hotline { get; set; } = null!;
        public string Whatsapp { get; set; } = null!;
        public string UPIId { get; set; } = null!;
        public int QuotationValidity { get; set; }
        public decimal GSTRate { get; set; }
        public decimal? UpcomingGSTRate { get; set; }
        public DateTime? GSTEffectiveFrom { get; set; }
        public string PortalMode { get; set; } = null!;
        public string GSTNO { get; set; } = null!;
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? CreatedDate { get; set; } = null!;
        public int CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public int UpdatedBy { get; set; }
        public string PaymentGatwayDetails { get; set; }
        public string? AuthoriseSignature { get; set; }

    }
}
