CREATE OR ALTER PROCEDURE [dbo].[SP_CheckUserByEmail]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedEmail NVARCHAR(255) = LOWER(LTRIM(RTRIM(@Email)));

    SELECT TOP 1
        Id,
        Code,
        Name,
        Email,
        Image,
        IsAdmin,
        IsActive,
        IsDeleted
    FROM dbo.UserMaster
    WHERE LOWER(LTRIM(RTRIM(Email))) = @NormalizedEmail;
END
GO

IF OBJECT_ID(N'dbo.LoginOtpStore', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoginOtpStore
    (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL,
        OtpCode NVARCHAR(10) NOT NULL,
        ExpiresAtUtc DATETIME2(0) NOT NULL,
        Attempts INT NOT NULL CONSTRAINT DF_LoginOtpStore_Attempts DEFAULT(0),
        IsDeleted BIT NOT NULL CONSTRAINT DF_LoginOtpStore_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(0) NULL,
        CreatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_LoginOtpStore_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_LoginOtpStore_UpdatedAtUtc DEFAULT(SYSUTCDATETIME())
    );

    CREATE UNIQUE INDEX UX_LoginOtpStore_Email ON dbo.LoginOtpStore(Email);
END
GO

IF COL_LENGTH('dbo.LoginOtpStore', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.LoginOtpStore
    ADD IsDeleted BIT NOT NULL CONSTRAINT DF_LoginOtpStore_IsDeleted DEFAULT(0) WITH VALUES;
END
GO

IF COL_LENGTH('dbo.LoginOtpStore', 'DeletedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.LoginOtpStore
    ADD DeletedAtUtc DATETIME2(0) NULL;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[SP_UpsertLoginOtp]
    @Email NVARCHAR(255),
    @OtpCode NVARCHAR(10),
    @ExpiresAtUtc DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedEmail NVARCHAR(255) = LOWER(LTRIM(RTRIM(@Email)));

    MERGE dbo.LoginOtpStore AS target
    USING (SELECT @NormalizedEmail AS Email) AS source
    ON target.Email = source.Email
    WHEN MATCHED THEN
        UPDATE SET
            OtpCode = @OtpCode,
            ExpiresAtUtc = @ExpiresAtUtc,
            Attempts = 0,
            IsDeleted = 0,
            DeletedAtUtc = NULL,
            UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (Email, OtpCode, ExpiresAtUtc, Attempts, IsDeleted, DeletedAtUtc, CreatedAtUtc, UpdatedAtUtc)
        VALUES (@NormalizedEmail, @OtpCode, @ExpiresAtUtc, 0, 0, NULL, SYSUTCDATETIME(), SYSUTCDATETIME());
END
GO

CREATE OR ALTER PROCEDURE [dbo].[SP_GetLoginOtpByEmail]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedEmail NVARCHAR(255) = LOWER(LTRIM(RTRIM(@Email)));

    SELECT TOP 1
        Id,
        Email,
        OtpCode,
        ExpiresAtUtc,
        Attempts,
                IsDeleted,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.LoginOtpStore
        WHERE Email = @NormalizedEmail
            AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[SP_IncrementLoginOtpAttempt]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedEmail NVARCHAR(255) = LOWER(LTRIM(RTRIM(@Email)));

    UPDATE dbo.LoginOtpStore
    SET
        Attempts = ISNULL(Attempts, 0) + 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE Email = @NormalizedEmail;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[SP_ClearLoginOtp]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedEmail NVARCHAR(255) = LOWER(LTRIM(RTRIM(@Email)));

    UPDATE dbo.LoginOtpStore
    SET
        IsDeleted = 1,
        DeletedAtUtc = SYSUTCDATETIME(),
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE Email = @NormalizedEmail;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[GetUserRolesByUserId]
(
    @UserId INT = 0
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        rm.Id AS RoleId,
        rm.Name AS RoleName
    FROM dbo.RoleMaster rm
    INNER JOIN dbo.UserRoleMapping ur ON rm.Id = ur.RoleId
    WHERE rm.IsActive = 1
      AND rm.IsDeleted = 0
      AND ur.IsDeleted = 0
      AND ur.UserId = @UserId
    ORDER BY rm.Name;
END
GO
