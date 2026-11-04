using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IEventMasterRepository
{
    List<EventMaster> GetAll();
    EventMaster? GetById(int id);
    int Create(EventMaster item);
    int Update(EventMaster item);
    bool Delete(int id);
    bool ActiveInActive(int id, bool status);
}
