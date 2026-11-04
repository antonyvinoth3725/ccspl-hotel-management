using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IPackageItemsRepository
{
    List<PackageItems> GetByPackageId(int packageId);
    bool CreatePackageItems(List<PackageItems> items);
    bool DeletePackageItem(int id);
}
