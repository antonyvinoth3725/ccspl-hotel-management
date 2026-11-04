using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface ICommsRepository
{
    List<CommunicationLog> GetAll();
    CommunicationLog? GetById(int id);
    int Create(CommunicationLog item);
    int Update(CommunicationLog item);
    bool Delete(int id);
    bool ActiveInActive(int id, bool status);
}
