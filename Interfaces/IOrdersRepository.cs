using System.Collections.Generic;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IOrdersRepository
{
    List<OrderListItem> GetOrderList(DateTime? fromDate = null, DateTime? toDate = null, string Indicator = "", int? status = null, string eventFilter = null);
    bool UpdateOrderStatus(int OrderId, int Status);
    int UpdateOrderPaymentStatus(int OrderId, int Status);
    OrderPaymentStatus? GetOrderPaymentStatus(int orderId);
    int CreateReOrder(int OrderId);
    int CreateCompleteOrder(CreateOrderRequest request);
    int UpdateCompleteOrder(CreateOrderRequest request);

    public int CreateAmendmentOrder(CreateOrderRequest request);
    bool UpdateDigitalSignature(int orderId, byte[] digitalSignature);


}
