using GayatriCateringPortal.Models;
using System.Collections.Generic;

namespace GayatriCateringPortal.Interfaces;

public interface IDashboardRepository
{
    Dashboard GetDashboard(DateTime? fromDate, DateTime? toDate);
}
