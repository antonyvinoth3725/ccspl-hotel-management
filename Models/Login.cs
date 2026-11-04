using System;

namespace GayatriCateringPortal.Models
{
    public class LoginSendCodeRequest
    {
        public string? Email { get; set; }
    }

    public class LoginVerifyCodeRequest
    {
        public string? Email { get; set; }
        public string? Code { get; set; }
    }

    public class LoginCompleteRequest
    {
        public string? Email { get; set; }
        public int RoleId { get; set; }
    }

    public class LoginRoleItem
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
    }

    public class LoginUserInfo
    {
        public int Id { get; set; }
        public string? Code { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Image { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class OtpIssueResult
    {
        public string Code { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public int ExpiresInSeconds { get; set; }
    }

    public class OtpVerifyResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
