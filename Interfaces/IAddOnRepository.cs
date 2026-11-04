using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces
{
    public interface IAddOnRepository
    {
        List<AddOnMaster> GetAll();
        AddOnMaster? GetById(int id);
        int Create(AddOnMaster item);
        int Update(AddOnMaster item);
        bool Delete(int id);
        bool ActiveInActive(int id, bool status);
    }
}
