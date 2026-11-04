namespace GayatriCateringPortal.Models;

public class ChefMenuOrderOption
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public int Pax { get; set; }
    public int OrderStatus { get; set; }
}

public class ChefMenuSummary
{
    public int MenuId { get; set; }
    public string MenuName { get; set; } = string.Empty;
    public int OrderedQty { get; set; }
    public int AlreadyAssignedQty { get; set; }
    public int RemainingQty { get; set; }
}

public class ChefMenuAssignmentSaveRequest
{
    public int? HeaderId { get; set; }
    public int ChefId { get; set; }
    public DateTime EventDate { get; set; }
    public string OrderIds { get; set; } = string.Empty;
    public string MenuIds { get; set; } = string.Empty;
}

public class ChefMenuAssignmentEdit
{
    public int HeaderId { get; set; }
    public int ChefId { get; set; }
    public DateTime EventDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? EventFrom { get; set; }
    public DateTime? EventTo { get; set; }
    public List<int> OrderIds { get; set; } = new();
    public List<string> OrderNumbers { get; set; } = new();
    public List<int> MenuIds { get; set; } = new();
    public List<ChefMenuAssignmentDetailItem> Menus { get; set; } = new();
}

public class ChefMenuAssignmentDetailItem
{
    public int MenuId { get; set; }
    public string MenuName { get; set; } = string.Empty;
    public int AssignedQty { get; set; }
}

public class ChefMenuAssignmentListItem
{
    public int HeaderId { get; set; }
    public int ChefId { get; set; }
    public DateTime EventDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool IsActive { get; set; }
    public string OrderNumbers { get; set; } = string.Empty;
    public string MenuNames { get; set; } = string.Empty;
    public int MenuCount { get; set; }
    public int TotalQty { get; set; }
}
