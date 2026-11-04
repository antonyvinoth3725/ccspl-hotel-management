using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces
{
    public interface IFoodMenuRepository
    {
        List<FoodMenu> GetAll();
        List<MenuCategoryResult> GetAllMenusByCategory();
        List<FoodMenu> GetByCategoryId(int categoryId);
        FoodMenu? GetById(int id);
        int Create(FoodMenu item);
        int Update(FoodMenu item);
        bool Delete(int id);
        bool ActiveInActive(int id, bool status);
    }
}
