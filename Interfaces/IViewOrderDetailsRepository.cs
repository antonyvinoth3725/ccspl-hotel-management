using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IViewOrderDetailsRepository
{
    ViewOrderDetails? GetByOrderId(int orderId);
}
