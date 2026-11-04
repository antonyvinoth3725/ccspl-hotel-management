using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface ICodeTemplateRepository
{
    List<CodeTemplate> GetAll();
    int Save(List<CodeTemplate> items);
    bool UpdateCurrentValue(int entityNo);
    string GetLatestCode(int entityNo);
}
