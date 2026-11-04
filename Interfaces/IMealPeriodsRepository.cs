using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IMealPeriodsRepository
{
    List<MealPeriodMaster> GetAll();

    MealPeriodMaster? GetById(int id);

    int Create(MealPeriodMaster item);

    int Update(MealPeriodMaster item);

    bool Delete(int id);

    bool ActiveInActive(int id, bool status);
}
