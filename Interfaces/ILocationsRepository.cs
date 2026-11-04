using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface ILocationsRepository
{
    List<LocationMaster> GetAll();

    LocationMaster? GetById(int id);

    int Create(LocationMaster item);

    bool Update(LocationMaster item);

    bool Delete(int id);

    bool ActiveInActive(int id, bool status);
}
