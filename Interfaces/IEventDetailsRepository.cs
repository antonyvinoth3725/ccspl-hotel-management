using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IEventDetailsRepository
{
    List<EventDetails> GetByEventId(int eventId);
    bool Save(List<EventDetails> items);
    bool Update(EventDetails item);
    bool Delete(int id);
}
