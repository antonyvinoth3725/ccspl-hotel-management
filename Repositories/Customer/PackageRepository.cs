using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Interfaces.Customer;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Models.Customer;

namespace GayatriCateringPortal.Repositories.Customer
{
    public class PackageRepository : IPackageRepository
    {
        private readonly IPackagesRepository _packages;
        private readonly IPackageItemsRepository _packageItems;
        private readonly IPackageMenusRepository _packageMenus;
        private readonly IFoodMenuCategoryRepository _categories;
        private readonly IFoodMenuRepository _menus;
        private readonly IEventDetailsRepository _eventDetails;

        public PackageRepository(
            IPackagesRepository packages,
            IPackageItemsRepository packageItems,
            IPackageMenusRepository packageMenus,
            IFoodMenuCategoryRepository categories,
            IFoodMenuRepository menus,
            IEventDetailsRepository eventDetails)
        {
            _packages = packages;
            _packageItems = packageItems;
            _packageMenus = packageMenus;
            _categories = categories;
            _menus = menus;
            _eventDetails = eventDetails;
        }

        public List<Packages> GetAll() => _packages.GetAll();

        public List<Packages> GetByEventId(int eventId)
        {
            if (eventId <= 0) return new List<Packages>();
            var packageIds = _eventDetails.GetByEventId(eventId)
                .Where(item => item.IsActive && !item.IsDeleted)
                .Select(item => item.PackageId)
                .ToHashSet();
            return _packages.GetAll()
                .Where(item => packageIds.Contains(item.Id) && item.IsActive && !item.IsDeleted)
                .ToList();
        }

        public Packages? GetById(int id) => _packages.GetById(id);

        public bool Delete(int id) => _packages.Delete(id);

        public List<CategoryMenuChoice> GetMenusByCategoryId(int categoryId)
        {
            if (categoryId <= 0)
                return new List<CategoryMenuChoice>();

            return _menus.GetByCategoryId(categoryId)
                .Select(menu => new CategoryMenuChoice
                {
                    Id = menu.Id,
                    Name = menu.Name
                })
                .OrderBy(menu => menu.Name)
                .ToList();
        }

        public List<PackageMenus> GetFixedMenusByPackageId(int packageId)
        {
            if (packageId <= 0)
                return new List<PackageMenus>();

            return _packageMenus.GetByPackageId(packageId);
        }

        //public List<AdditionalMenuCategory> GetAdditionalMenuCategories()
        //{
        //    var categories = _categories.GetAll()
        //        .Where(category => category.IsActive && !category.IsDeleted)
        //        .ToDictionary(category => category.Id);

        //    return _menus.GetAll()
        //        .Where(menu => menu.IsActive
        //            && !menu.IsDeleted
        //            && int.TryParse(menu.CategoryId, out var categoryId)
        //            && categories.ContainsKey(categoryId))
        //        .GroupBy(menu => menu.CategoryId)
        //        .Select(group => new AdditionalMenuCategory
        //        {
        //            CategoryId = group.Key,
        //            CategoryName = categories[group.Key].Name,
        //            Items = group.OrderBy(menu => menu.Name).Select(menu => new AdditionalMenuItem
        //            {
        //                Id = menu.Id,
        //                Code = menu.Code,
        //                Name = menu.Name,
        //                FoodType = menu.FoodType == 1 ? "Veg" : menu.FoodType == 2 ? "Non-Veg" : "Mixed",
        //                Price = menu.Price ?? 0,
        //                Unit = categories[group.Key].Name.Contains("Live", StringComparison.OrdinalIgnoreCase) ? "station" : "item"
        //            }).ToList()
        //        })
        //        .OrderBy(category => category.CategoryName)
        //        .ToList();
        //}

        public List<AdditionalMenuCategory> GetAdditionalMenuCategories()
        {
            var categories = _categories.GetAll()
                .Where(category => category.IsActive && !category.IsDeleted)
                .ToDictionary(category => category.Id);

            return _menus.GetAll()
                .Where(menu => menu.IsActive
                    && !menu.IsDeleted
                    && categories.ContainsKey(menu.CategoryId))
                .GroupBy(menu => menu.CategoryId)
                .Select(group => new AdditionalMenuCategory
                {
                    CategoryId = group.Key,
                    CategoryName = categories[group.Key].Name,
                    Items = group.OrderBy(menu => menu.Name)
                        .Select(menu => new AdditionalMenuItem
                        {
                            Id = menu.Id,
                            Code = menu.Code,
                            Name = menu.Name,
                            FoodType = menu.FoodType,
                            Price = menu.Price ?? 0,
                            Unit = categories[group.Key].Name.Contains("Live", StringComparison.OrdinalIgnoreCase)
                                ? "station"
                                : "item"
                        })
                        .ToList()
                })
                .OrderBy(category => category.CategoryName)
                .ToList();
        }

        public List<PackageCategoryChoice> GetCategoriesByPackageId(int packageId)
        {
            if (packageId <= 0)
                return new List<PackageCategoryChoice>();

            var packageItems = _packageItems.GetByPackageId(packageId)
                .Where(item => item.IsActive != false && item.IsDeleted != true)
                .ToList();

            var categoryIds = packageItems
                .Select(item => item.CategoryId)
                .ToHashSet();

            var categoriesById = _categories.GetAll()
                .Where(category => categoryIds.Contains(category.Id)
                    && category.IsActive
                    && !category.IsDeleted)
                .GroupBy(category => category.Id)
                .ToDictionary(group => group.Key, group => group.First());

            return packageItems
                .Where(item => categoriesById.ContainsKey(item.CategoryId))
                .Select(item =>
                {
                    var category = categoriesById[item.CategoryId];
                    return new PackageCategoryChoice
                    {
                        CategoryId = item.CategoryId,
                        CategoryName = category.Name,
                        RequiredQuantity = Math.Max(category.MaxChoice, 1)
                    };
                })
                .ToList();
        }

    }
}
