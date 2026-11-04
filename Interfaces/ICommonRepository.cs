using System.Collections.Generic;
using System.Threading.Tasks;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Http;

namespace GayatriCateringPortal.Interfaces
{
    public interface ICommonRepository
    {
        List<MenuGroup> GetMenuGroups(int roleId);
        List<EntityMaster> GetEntityMaster();
        List<RolePermissionItem> GetRolePermissionsByRoleId(int roleId);
        RolePermissionItem GetMenuRights(int roleId, int entityNo);
        int CreateRolePermission(List<CreateRolePermissionRequest> requests);
        List<Country> GetCountry();
        List<State> GetStateByCountryId(int countryId);
        List<City> GetCityByStateId(int stateId);
        Task<FileUploadResult> FileUpload(IFormFile postedFile, string folderName);
        Task SendEmail(string toEmail, string? ccEmail, string subject, string body, byte[]? fileBytes = null, string? fileName = null, string? contentType = null);
    }
}
