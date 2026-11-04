namespace GayatriCateringPortal.Models.Customer
{
    public class AdditionalMenuCategory
    {
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public List<AdditionalMenuItem> Items { get; set; } = new();
    }

    public class AdditionalMenuItem
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int? FoodType { get; set; } 
        public decimal Price { get; set; }
        public string Unit { get; set; } = "item";
    }
}
 