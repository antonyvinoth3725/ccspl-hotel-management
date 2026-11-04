namespace GayatriCateringPortal.Models
{
    public class MenuCategoryResult
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int MaxChoice { get; set; }
        public List<MenuItemResult> Items { get; set; } = new();
    }

    public class MenuItemResult
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Price { get; set; }
        public int? FoodType { get; set; }
        //public string? PreparationTime { get; set; }
        //public string? ServiceCharge { get; set; }
    }
}
