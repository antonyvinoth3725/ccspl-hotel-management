using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IUserRoleMappingRepository
{
    List<UserRoleMapping> GetByUserId(int userId);
    bool CreateUserRoleMappings(List<UserRoleMapping> items);
    bool DeleteUserRoleMappingByUserId(int userId);
    bool DeleteUserRoleMappingById(int id);
}
