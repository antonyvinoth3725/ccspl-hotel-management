using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Interfaces
{
    public interface IDriverDeliveryRepository
    {
        DriverVerificationVM? VerifyDriverToken(string token);

        bool VerifyOtp(string token, string otp);

        bool IsDriverSessionValid(int driverId, string token);

        bool IsLogisticsAssignedToDriver(int logisticsId, int driverId);

        bool CanDriverStartDelivery(int logisticsId, int driverId);

        List<DriverInvoiceVM> GetAssignedInvoices(int? driverId);

        DriverDeliveryVM? GetInvoiceDetails(int logisticsId);

        int SaveDeliveryProof(DeliveryProofVM model);

        //bool ExpireToken(string token);
    }
}
