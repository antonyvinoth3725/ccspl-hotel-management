namespace GayatriCateringPortal.Models;

public class CreateOrderRequest
{
    public CustomerMaster Customer { get; set; } = new();
    public Orders Order { get; set; } = new();
    public OrderEventDetails Event { get; set; } = new();
    public List<OrderPackageDetails> PackageDetails { get; set; } = new();
    public List<OrderExtraItems> ExtraItems { get; set; } = new();
    public List<OrderAddOnsDetails> AddOns { get; set; } = new();
    public List<OrderUtensilsDetails> Utensils { get; set; } = new();
}
