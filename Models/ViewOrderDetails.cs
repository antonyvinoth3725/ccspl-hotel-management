namespace GayatriCateringPortal.Models;

public class ViewOrderDetails
{
    public ViewOrderHeader? Order { get; set; }
    public ViewOrderPackage? Package { get; set; }
    public ViewOrderEvent? Event { get; set; }
    public List<ViewOrderMenuItem> IncludedItems { get; set; } = new();
    public List<ViewOrderMenuItem> ExtraItems { get; set; } = new();
    public List<ViewOrderAddOn> AddOns { get; set; } = new();
    public List<ViewOrderUtensil> Utensils { get; set; } = new();
}

public class ViewOrderHeader
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string MobileNo { get; set; } = string.Empty;
    public string EmailId { get; set; } = string.Empty;
    public string CustomerAddress { get; set; } = string.Empty;
    public string Pincode { get; set; } = string.Empty;
    public int? PackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public int? EventId { get; set; }
    public int? MealPeriodId { get; set; }
    public int? LocationId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public string MealPeriodName { get; set; } = string.Empty;
    public DateTime? EventDate { get; set; }
    public int Pax { get; set; }
    public string DeliveryAddress { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public decimal PackageBaseAmount { get; set; }
    public decimal AdditionalMenuAmount { get; set; }
    public decimal AddOnsAmount { get; set; }
    public decimal UtensilsAmount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal TaxPercentage { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public int OrderStatus { get; set; }
    public string OrderStatusName { get; set; } = string.Empty;
    public int PaymentStatus { get; set; }
    public DateTime? CreatedDate { get; set; }
    public bool HasDigitalSignature { get; set; }
}

public class ViewOrderPackage
{
    public int PackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string PackageDescription { get; set; } = string.Empty;
    public decimal PackagePrice { get; set; }
    public bool IsEmpty { get; set; }
}

public class ViewOrderEvent
{
    public DateTime? EventDate { get; set; }
    public string AlternateMobileNo { get; set; } = string.Empty;
    public string EventAddress { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public TimeSpan? ConsumingTime { get; set; }
    public int? DeliveryType { get; set; }
}

public class ViewOrderMenuItem
{
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? MenuId { get; set; }
    public string MenuCode { get; set; } = string.Empty;
    public string MenuName { get; set; } = string.Empty;
    public int Qty { get; set; }
    public string Notes { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}

public class ViewOrderAddOn
{
    public int AddOnsId { get; set; }
    public string AddOnCode { get; set; } = string.Empty;
    public string AddOnName { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}

public class ViewOrderUtensil
{
    public int UtensilsId { get; set; }
    public string UtensilName { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal RefundableDeposit { get; set; }
    public decimal TotalAmount { get; set; }
}
