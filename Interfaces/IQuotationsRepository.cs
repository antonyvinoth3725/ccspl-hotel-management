using GayatriCateringPortal.Models;
using System.Collections.Generic;

namespace GayatriCateringPortal.Interfaces;

public interface IQuotationsRepository
{
    List<OrderListItem> GetAll(DateTime? fromDate = null, DateTime? toDate = null);
    object? GetById(int id);
    int ConvertToOrder(int QuotationId);
    bool Update(object item);
    bool Delete(int id);
    bool ActiveInActive(int id);
}
