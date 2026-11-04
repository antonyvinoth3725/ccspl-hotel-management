using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces;

public interface IOrderPaymentRepository
{
    OrderPaymentConfigResult GetConfig();
    Task<OrderPaymentResult> ProcessPaymentAsync(CreateOrderPaymentRequest request, int? createdBy, string returnBaseUrl);
    Task<OrderPaymentResult> GetPaymentStatusAsync(string chargeId);
    Task<OrderPaymentResult> GetPaymentStatusByPaymentIdAsync(long paymentId);
}
