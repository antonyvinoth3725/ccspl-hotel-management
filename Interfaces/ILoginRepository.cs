using GayatriCateringPortal.Models;
using System.Collections.Generic;

namespace GayatriCateringPortal.Interfaces
{
    public interface ILoginRepository
    {
        LoginUserInfo? GetUserByEmail(string email);
        List<LoginRoleItem> GetUserRolesByUserId(int userId);
        OtpIssueResult CreateOtp(string email, int expirySeconds);
        OtpVerifyResult VerifyOtp(string email, string code);
        void ClearOtp(string email);
    }
}
