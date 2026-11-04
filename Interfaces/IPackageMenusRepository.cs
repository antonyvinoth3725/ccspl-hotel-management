using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IPackageMenusRepository
{
    List<PackageMenus> GetByPackageId(int packageId);
    bool CreatePackageMenus(List<PackageMenus> items);
    bool DeletePackageMenu(int id);
}