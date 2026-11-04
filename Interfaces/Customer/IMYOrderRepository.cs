using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces.Customer;

public interface IMYOrderRepository
{
    List<OrderListItem> GetMyOrders(string phoneNo);
    int ConvertQuotationToOrder(int quotationId);
}
