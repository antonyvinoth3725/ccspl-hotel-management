using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IUsersRepository
{
    List<UserMaster> GetAll();
    UserMaster? GetById(int id);
    int Create(UserMaster item);
    int Update(UserMaster item);
    bool Delete(int id);
    bool ActiveInActive(int id, bool status);
}
