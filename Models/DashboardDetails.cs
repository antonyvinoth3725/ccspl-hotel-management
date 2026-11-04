namespace GayatriCateringPortal.Models
{
    public class DashboardDetails
    {
        public int Id { get; set; }
        public string OrderNumber {  get; set; }
        public string CustomerName { get; set; }
        public string MobileNo { get; set; }
        public string EmailId { get; set; }
        public string PackageName { get; set; }
        public string LocationName { get; set; }
        public DateTime EventDate { get; set; }
        public string MealPeriodName { get; set; }
        public int Pax { get; set; }
        public int OrderStatus { get; set; }
        public string OrderStatusName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public int PaymentStatus { get; set; }
        public string PaymentStatusName { get; set; }
        public string DeliveryAddress { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}
