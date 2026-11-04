using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface ISettingsRepository
{
    //object GetSettings();
    //bool Save(object settings);
    List<Organization> GetAll();
    int Create(Organization settings);
    int Update(Organization settings);
}
