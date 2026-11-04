using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces
{
    public interface IDriverRepository
    {
        List<DriverMaster> GetAll();
        DriverMaster? GetById(int id);
        int Create(DriverMaster item);
        int Update(DriverMaster item);
        bool Delete(int id);
        bool ActiveInActive(int id, bool status);
    }
}
