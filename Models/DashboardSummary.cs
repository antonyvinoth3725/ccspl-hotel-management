namespace GayatriCateringPortal.Models
{
    public class DashboardSummary
    {
        public int TotalOrders { get; set; }
        public int ActiveOrders { get; set; }
        public decimal TotalSales { get; set; }
        public decimal Outstanding { get; set; }
        public decimal TotalWOGST { get; set; }
        public decimal UtensilsAmount { get; set;  }
        public int NotDeliveredOrders { get; set; }
        public int DeliveredOrders { get; set; }
    }
}
