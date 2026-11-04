using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces
{
    public interface IChefRepository
    {
        List<ChefMaster> GetAll();
        ChefMaster? GetById(int id);
        int Create(ChefMaster item);
        int Update(ChefMaster item);
        bool Delete(int id);
        bool ActiveInActive(int id, bool status);
    }
}
