using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IFreebiesRepository
{
    
        List<PopularFreebieMaster> GetAll();

        PopularFreebieMaster? GetById(int id);

        int Create(PopularFreebieMaster item);

        bool Update(PopularFreebieMaster item);

        bool Delete(int id);

        bool ActiveInActive(int id, bool status);
    
}
