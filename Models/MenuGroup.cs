using System.Collections.Generic;

namespace GayatriCateringPortal.Models
{
    public class MenuGroup
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? MenuIcon { get; set; }
        public int DisplayOrder { get; set; }
        public List<SubMenu> Menus { get; set; } = new List<SubMenu>();
    }
}
