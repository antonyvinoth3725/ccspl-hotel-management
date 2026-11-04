using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IOrderRefundRepository
{
    OrderRefundSummary? GetRefundSummary(int orderId);
    Task<OrderRefundResult> ProcessRefundAsync(CreateOrderRefundRequest request, int? createdBy);
    OrderRefundResult CancelWithoutRefund(CreateOrderRefundRequest request, int? createdBy);
}
