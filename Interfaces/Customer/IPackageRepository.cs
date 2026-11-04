using GayatriCateringPortal.Models;
using GayatriCateringPortal.Models.Customer;

namespace GayatriCateringPortal.Interfaces.Customer
{
    public interface IPackageRepository
    {
        List<Packages> GetAll();
        List<Packages> GetByEventId(int eventId);
        Packages? GetById(int id);
        List<PackageCategoryChoice> GetCategoriesByPackageId(int packageId);
        List<CategoryMenuChoice> GetMenusByCategoryId(int categoryId);
        List<AdditionalMenuCategory> GetAdditionalMenuCategories();
        bool Delete(int id);
        List<PackageMenus> GetFixedMenusByPackageId(int packageId);

    }
}
