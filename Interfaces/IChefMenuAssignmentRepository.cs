using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IChefMenuAssignmentRepository
{
    List<ChefMenuOrderOption> GetOrdersForSelection(DateTime eventDate, int? assignmentHeaderId = null);
    List<ChefMenuAssignmentListItem> GetByChef(int chefId);
    List<ChefMenuSummary> GetMenuSummaryByOrders(string orderIds, int? assignmentHeaderId = null);
    ChefMenuAssignmentEdit? GetById(int headerId);
    int Save(ChefMenuAssignmentSaveRequest request, int? updatedBy);
    bool Delete(int headerId, int? updatedBy);
    bool DeleteMenu(int headerId, int menuId, int? updatedBy);
}
