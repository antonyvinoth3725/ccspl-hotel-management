using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IFinanceRepository
{
    List<Orders> GetAll();
    Orders? GetById(int id);
    int Create(Orders item);
    bool Update(Orders item);
    bool Delete(int id);
    bool ActiveInActive(int id);
}
