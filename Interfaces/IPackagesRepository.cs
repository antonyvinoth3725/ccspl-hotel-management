using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IPackagesRepository
{
    List<Packages> GetAll();
    Packages? GetById(int id);
    int Create(Packages item);
    int Update(Packages item);
    bool Delete(int id);
    bool ActiveInActive(int id, bool status);
}
