using System;

namespace GayatriCateringPortal.Models
{
    public class KitchenQueueOrder
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string PackageName { get; set; } = string.Empty;
        public DateTime? OrderDate { get; set; }
        public DateTime? EventDate { get; set; }
        public string MealPeriod { get; set; } = string.Empty;
        public int Pax { get; set; }
        public int OrderStatus { get; set; }
    }
}