/*
  Reporting schema + starter procedures for GayatriCateringPortal
  Date: 2026-07-20
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* =========================
   REPORT TABLES
   ========================= */
IF OBJECT_ID('dbo.ReportPermission', 'U') IS NOT NULL DROP TABLE dbo.ReportPermission;
IF OBJECT_ID('dbo.ReportFilters', 'U') IS NOT NULL DROP TABLE dbo.ReportFilters;
IF OBJECT_ID('dbo.ReportMaster', 'U') IS NOT NULL DROP TABLE dbo.ReportMaster;
IF OBJECT_ID('dbo.ReportCategory', 'U') IS NOT NULL DROP TABLE dbo.ReportCategory;
GO

CREATE TABLE dbo.ReportCategory
(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    DisplayOrder INT NOT NULL CONSTRAINT DF_ReportCategory_DisplayOrder DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_ReportCategory_IsActive DEFAULT (1),
    IsDeleted BIT NOT NULL CONSTRAINT DF_ReportCategory_IsDeleted DEFAULT (0),
    CreatedBy INT NULL,
    CreatedDate DATETIME NOT NULL CONSTRAINT DF_ReportCategory_CreatedDate DEFAULT (GETDATE()),
    UpdatedBy INT NULL,
    UpdatedDate DATETIME NULL
);
GO

CREATE TABLE dbo.ReportMaster
(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CategoryId INT NOT NULL,
    ReportCode NVARCHAR(50) NOT NULL,
    ReportName NVARCHAR(150) NOT NULL,
    DisplayName NVARCHAR(150) NOT NULL,
    Description NVARCHAR(500) NULL,
    StoredProcedure NVARCHAR(150) NOT NULL,
    TemplateName NVARCHAR(200) NOT NULL,
    TemplatePath NVARCHAR(500) NOT NULL,
    ReportType NVARCHAR(50) NULL,
    ViewerType NVARCHAR(50) NULL,
    PaperWidth DECIMAL(10,2) NULL,
    PaperHeight DECIMAL(10,2) NULL,
    Orientation NVARCHAR(20) NULL,
    IsThermal BIT NOT NULL CONSTRAINT DF_ReportMaster_IsThermal DEFAULT (0),
    IsLandscape BIT NOT NULL CONSTRAINT DF_ReportMaster_IsLandscape DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_ReportMaster_IsActive DEFAULT (1),
    IsDeleted BIT NOT NULL CONSTRAINT DF_ReportMaster_IsDeleted DEFAULT (0),
    DisplayOrder INT NOT NULL CONSTRAINT DF_ReportMaster_DisplayOrder DEFAULT (0),
    Icon NVARCHAR(100) NULL,
    CreatedBy INT NULL,
    CreatedDate DATETIME NOT NULL CONSTRAINT DF_ReportMaster_CreatedDate DEFAULT (GETDATE()),
    UpdatedBy INT NULL,
    UpdatedDate DATETIME NULL,
    IsShow BIT NULL CONSTRAINT DF_ReportMaster_IsShow DEFAULT (0)
);
GO

CREATE TABLE dbo.ReportFilters
(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReportId INT NOT NULL,
    FieldName NVARCHAR(100) NOT NULL,
    DisplayName NVARCHAR(150) NOT NULL,
    ControlType NVARCHAR(50) NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    IsRequired BIT NOT NULL CONSTRAINT DF_ReportFilters_IsRequired DEFAULT (0),
    DisplayOrder INT NOT NULL CONSTRAINT DF_ReportFilters_DisplayOrder DEFAULT (0),
    IsActive BIT NULL CONSTRAINT DF_ReportFilters_IsActive DEFAULT (1),
    IsShow BIT NULL CONSTRAINT DF_ReportFilters_IsShow DEFAULT (1)
);
GO

CREATE TABLE dbo.ReportPermission
(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReportId INT NOT NULL,
    RoleId INT NOT NULL,
    CanView BIT NOT NULL CONSTRAINT DF_ReportPermission_CanView DEFAULT (0),
    CanPrint BIT NOT NULL CONSTRAINT DF_ReportPermission_CanPrint DEFAULT (0),
    ExportPdf BIT NOT NULL CONSTRAINT DF_ReportPermission_ExportPdf DEFAULT (0),
    ExportExcel BIT NOT NULL CONSTRAINT DF_ReportPermission_ExportExcel DEFAULT (0)
);
GO

ALTER TABLE dbo.ReportMaster WITH CHECK
ADD CONSTRAINT FK_ReportMaster_ReportCategory FOREIGN KEY (CategoryId) REFERENCES dbo.ReportCategory(Id);
GO

ALTER TABLE dbo.ReportFilters WITH CHECK
ADD CONSTRAINT FK_ReportFilters_ReportMaster FOREIGN KEY (ReportId) REFERENCES dbo.ReportMaster(Id);
GO

ALTER TABLE dbo.ReportPermission WITH CHECK
ADD CONSTRAINT FK_ReportPermission_ReportMaster FOREIGN KEY (ReportId) REFERENCES dbo.ReportMaster(Id);
GO

/* =========================
   SEED DATA
   ========================= */
SET IDENTITY_INSERT dbo.ReportCategory ON;
INSERT INTO dbo.ReportCategory (Id, Name, DisplayOrder, IsActive, IsDeleted, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
VALUES
(1, N'Sales Reports', 1, 1, 0, 1, GETDATE(), NULL, NULL),
(2, N'Inventory Reports', 2, 1, 0, 1, GETDATE(), NULL, NULL),
(3, N'Billing', 3, 1, 0, 1, GETDATE(), NULL, NULL);
SET IDENTITY_INSERT dbo.ReportCategory OFF;
GO

SET IDENTITY_INSERT dbo.ReportMaster ON;
INSERT INTO dbo.ReportMaster
(
    Id, CategoryId, ReportCode, ReportName, DisplayName, Description,
    StoredProcedure, TemplateName, TemplatePath, ReportType, ViewerType,
    PaperWidth, PaperHeight, Orientation, IsThermal, IsLandscape,
    IsActive, IsDeleted, DisplayOrder, Icon, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate, IsShow
)
VALUES
(1, 1, N'RPT_DAILY_SALES', N'DailySalesReport', N'Daily Sales', N'Shows day-wise sales summary',
 N'sp_Rpt_DailySales', N'DailySalesReport.html', N'Reports\\Sales\\DailySalesReport.html', N'HtmlTemplate', N'InApp',
 8.27, 11.69, N'Landscape', 0, 0, 1, 0, 1, N'pi pi-chart-line', 1, GETDATE(), NULL, NULL, 1),
(2, 1, N'RPT_BILL_WISE_SALES', N'BillWiseSalesReport', N'Bill Wise Sales', N'Shows bill-wise sales details',
 N'sp_Rpt_BillWiseSales', N'BillWiseSalesReport.html', N'Reports\\Sales\\BillWiseSalesReport.html', N'HtmlTemplate', N'InApp',
 8.27, 11.69, N'Landscape', 0, 1, 1, 0, 2, N'pi pi-receipt', 1, GETDATE(), NULL, NULL, 1),
(3, 2, N'RPT_CURRENT_STOCK', N'CurrentStockReport', N'Current Stock', N'Shows current stock position',
 N'sp_Rpt_CurrentStock', N'CurrentStockReport.html', N'Reports\\Inventory\\CurrentStockReport.html', N'HtmlTemplate', N'InApp',
 8.27, 11.69, N'Portrait', 0, 0, 1, 0, 1, N'pi pi-box', 1, GETDATE(), NULL, NULL, 1),
(4, 3, N'Rpt_BillingPrintById', N'InvoiceBill', N'Invoice Bill', N'Invoice style order report',
 N'sp_Rpt_BillingPrintById', N'InvoiceBill.html', N'Reports\\Billing\\InvoiceBill.html', N'HtmlTemplate', N'InApp',
 8.27, 11.69, N'Portrait', 0, 0, 1, 0, 10, N'pi pi-print', 1, GETDATE(), NULL, NULL, 1);
SET IDENTITY_INSERT dbo.ReportMaster OFF;
GO

SET IDENTITY_INSERT dbo.ReportFilters ON;
INSERT INTO dbo.ReportFilters (Id, ReportId, FieldName, DisplayName, ControlType, DataType, IsRequired, DisplayOrder, IsActive, IsShow)
VALUES
(1, 1, N'FromDate', N'From Date', N'date', N'datetime', 1, 1, 1, 1),
(2, 1, N'ToDate', N'To Date', N'date', N'datetime', 1, 2, 1, 1),
(4, 2, N'FromDate', N'From Date', N'date', N'datetime', 1, 1, 1, 1),
(5, 2, N'ToDate', N'To Date', N'date', N'datetime', 1, 2, 1, 1),
(8, 4, N'BillId', N'Bill Id', N'number', N'int', 0, 1, 1, 1);
SET IDENTITY_INSERT dbo.ReportFilters OFF;
GO

SET IDENTITY_INSERT dbo.ReportPermission ON;
INSERT INTO dbo.ReportPermission (Id, ReportId, RoleId, CanView, CanPrint, ExportPdf, ExportExcel)
VALUES
(1, 1, 1, 1, 1, 1, 1),
(2, 2, 1, 1, 1, 1, 1),
(3, 3, 1, 1, 1, 1, 1),
(4, 4, 1, 1, 1, 1, 0),
(5, 1, 2, 1, 1, 1, 0),
(6, 2, 2, 1, 0, 1, 0),
(7, 3, 2, 1, 0, 0, 0),
(8, 4, 2, 1, 1, 1, 0);
SET IDENTITY_INSERT dbo.ReportPermission OFF;
GO

/* =========================
   CATALOG PROCEDURES
   ========================= */
CREATE OR ALTER PROCEDURE dbo.SP_Report_GetCategories
    @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Id,
        c.Name,
        c.DisplayOrder,
        ReportCount = COUNT(DISTINCT r.Id)
    FROM dbo.ReportCategory c
    INNER JOIN dbo.ReportMaster r ON r.CategoryId = c.Id
    INNER JOIN dbo.ReportPermission p ON p.ReportId = r.Id
        WHERE p.RoleId = @RoleId
      AND p.CanView = 1
      AND c.IsDeleted = 0
      AND c.IsActive = 1
      AND r.IsDeleted = 0
      AND r.IsActive = 1
    GROUP BY c.Id, c.Name, c.DisplayOrder
    ORDER BY c.DisplayOrder, c.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Report_GetReports
    @RoleId INT,
    @CategoryId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.Id,
        r.CategoryId,
        c.Name AS CategoryName,
        r.ReportCode,
        r.ReportName,
        r.DisplayName,
        r.Description,
        r.StoredProcedure,
        r.TemplateName,
        r.TemplatePath,
        r.ReportType,
        r.ViewerType,
        r.PaperWidth,
        r.PaperHeight,
        r.Orientation,
        r.IsThermal,
        r.IsLandscape,
        r.DisplayOrder,
        r.Icon,
        p.CanView,
        p.CanPrint,
        p.ExportPdf,
        p.ExportExcel
    FROM dbo.ReportMaster r
    INNER JOIN dbo.ReportCategory c ON c.Id = r.CategoryId
    INNER JOIN dbo.ReportPermission p ON p.ReportId = r.Id
        WHERE p.RoleId = @RoleId
      AND p.CanView = 1
      AND r.IsDeleted = 0
      AND r.IsActive = 1
      AND c.IsDeleted = 0
      AND c.IsActive = 1
      AND (@CategoryId IS NULL OR @CategoryId <= 0 OR r.CategoryId = @CategoryId)
    ORDER BY c.DisplayOrder, r.DisplayOrder, r.DisplayName;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Report_GetDefinition
    @RoleId INT,
    @ReportId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        r.Id,
        r.CategoryId,
        c.Name AS CategoryName,
        r.ReportCode,
        r.ReportName,
        r.DisplayName,
        r.Description,
        r.StoredProcedure,
        r.TemplateName,
        r.TemplatePath,
        r.ReportType,
        r.ViewerType,
        r.PaperWidth,
        r.PaperHeight,
        r.Orientation,
        r.IsThermal,
        r.IsLandscape,
        r.Icon,
        p.CanView,
        p.CanPrint,
        p.ExportPdf,
        p.ExportExcel
    FROM dbo.ReportMaster r
    INNER JOIN dbo.ReportCategory c ON c.Id = r.CategoryId
    INNER JOIN dbo.ReportPermission p ON p.ReportId = r.Id
    WHERE r.Id = @ReportId
            AND p.RoleId = @RoleId
      AND p.CanView = 1
      AND r.IsDeleted = 0
      AND r.IsActive = 1
      AND c.IsDeleted = 0
      AND c.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Report_GetFilters
    @ReportId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Id,
        ReportId,
        FieldName,
        DisplayName,
        ControlType,
        DataType,
        IsRequired,
        DisplayOrder,
        IsActive,
        IsShow
    FROM dbo.ReportFilters
    WHERE ReportId = @ReportId
      AND ISNULL(IsActive, 1) = 1
    ORDER BY DisplayOrder, Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Report_GetPermissions
    @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.Id,
        r.CategoryId,
        c.Name AS CategoryName,
        r.ReportCode,
        r.ReportName,
        r.DisplayName,
        CanView = ISNULL(p.CanView, 0),
        CanPrint = ISNULL(p.CanPrint, 0),
        ExportPdf = ISNULL(p.ExportPdf, 0),
        ExportExcel = ISNULL(p.ExportExcel, 0)
    FROM dbo.ReportMaster r
    INNER JOIN dbo.ReportCategory c ON c.Id = r.CategoryId
    LEFT JOIN dbo.ReportPermission p
           ON p.ReportId = r.Id
          AND p.RoleId = @RoleId
    WHERE r.IsDeleted = 0
      AND r.IsActive = 1
      AND c.IsDeleted = 0
      AND c.IsActive = 1
    ORDER BY c.Name, r.DisplayOrder, r.DisplayName;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Report_SavePermission
    @RoleId INT,
    @ReportId INT,
    @CanView BIT,
    @CanPrint BIT,
    @ExportPdf BIT,
    @ExportExcel BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.ReportPermission
                WHERE RoleId = @RoleId
          AND ReportId = @ReportId
    )
    BEGIN
        UPDATE dbo.ReportPermission
        SET CanView = @CanView,
            CanPrint = @CanPrint,
            ExportPdf = @ExportPdf,
            ExportExcel = @ExportExcel
        WHERE RoleId = @RoleId
          AND ReportId = @ReportId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.ReportPermission (ReportId, RoleId, CanView, CanPrint, ExportPdf, ExportExcel)
        VALUES (@ReportId, @RoleId, @CanView, @CanPrint, @ExportPdf, @ExportExcel);
    END
END
GO

/* =========================
   RUNTIME PROCEDURES
   ========================= */
CREATE OR ALTER PROCEDURE dbo.sp_Rpt_DailySales
    @FromDate DATETIME,
    @ToDate DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(o.EventDate AS DATE) AS ReportDate,
        COUNT(1) AS OrderCount,
        SUM(ISNULL(o.TotalAmount, 0)) AS TotalAmount,
        SUM(ISNULL(o.PaidAmount, 0)) AS PaidAmount,
        SUM(ISNULL(o.TotalAmount, 0) - ISNULL(o.PaidAmount, 0)) AS BalanceAmount
    FROM dbo.Orders o
    WHERE ISNULL(o.IsDeleted, 0) = 0
      AND (@FromDate IS NULL OR o.EventDate >= @FromDate)
      AND (@ToDate IS NULL OR o.EventDate < @ToDate)
    GROUP BY CAST(o.EventDate AS DATE)
    ORDER BY ReportDate;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rpt_BillWiseSales
    @FromDate DATETIME,
    @ToDate DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.Id AS BillId,
        o.OrderNumber,
        c.Name AS CustomerName,
        c.MobileNo,
        o.EventDate,
        ISNULL(p.Name, '-') AS PackageName,
        o.Pax,
        o.SubTotal,
        o.TaxAmount,
        o.TotalAmount,
        o.PaidAmount,
        (ISNULL(o.TotalAmount, 0) - ISNULL(o.PaidAmount, 0)) AS BalanceAmount,
        o.OrderStatus,
        o.PaymentStatus
    FROM dbo.Orders o
    INNER JOIN dbo.CustomerMaster c ON c.Id = o.CustomerId
    LEFT JOIN dbo.Packages p ON p.Id = o.PackageId
    WHERE ISNULL(o.IsDeleted, 0) = 0
      AND (@FromDate IS NULL OR o.EventDate >= @FromDate)
      AND (@ToDate IS NULL OR o.EventDate < @ToDate)
    ORDER BY o.Id DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rpt_CurrentStock
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        fm.Id,
        fm.Name AS ItemName,
        fmc.Name AS CategoryName,
        TRY_CONVERT(DECIMAL(18,2), fm.Price) AS Rate,
        CASE WHEN ISNULL(fm.IsActive, 0) = 1 AND ISNULL(fm.IsDeleted, 0) = 0 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM dbo.FoodMenu fm
    LEFT JOIN dbo.FoodMenuCategory fmc ON TRY_CONVERT(INT, fm.CategoryId) = fmc.Id
    WHERE ISNULL(fm.IsDeleted, 0) = 0
    ORDER BY fmc.Name, fm.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Rpt_BillingPrintById
    @BillId INT = NULL,
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH Base AS
    (
        SELECT
            o.Id AS BillId,
            o.OrderNumber,
            o.CreatedDate AS OrderDate,
            o.EventDate,
            o.Pax,
            o.PackageBaseAmount,
            o.AdditionalMenuAmount,
            o.AddOnsAmount,
            o.UtensilsAmount,
            o.SubTotal,
            o.TaxAmount,
            o.TotalAmount,
            o.PaidAmount,
            o.TaxPercentage,
            c.Name AS CustomerName,
            c.MobileNo,
            c.EmailId,
            c.Address,
            c.Pincode,
            p.Name AS PackageName,
            mp.MealPeriodName,
            oed.Address AS EventAddress
        FROM dbo.Orders o
        INNER JOIN dbo.CustomerMaster c ON c.Id = o.CustomerId
        LEFT JOIN dbo.Packages p ON p.Id = o.PackageId
        LEFT JOIN dbo.MealPeriodMaster mp ON mp.Id = o.MealPeriodId
        LEFT JOIN dbo.OrderEventDetails oed ON oed.OrderId = o.Id AND ISNULL(oed.IsDeleted, 0) = 0
        WHERE ISNULL(o.IsDeleted, 0) = 0
          AND (@BillId IS NULL OR @BillId <= 0 OR o.Id = @BillId)
    ),
    InvoiceRows AS
    (
        SELECT
            b.BillId,
            1 AS SortOrder,
            CAST(
                ISNULL(b.PackageName, 'Custom Package') +
                CASE
                    WHEN EXISTS
                    (
                        SELECT 1
                        FROM dbo.OrderPackageDetails opd
                        WHERE opd.OrderId = b.BillId
                          AND ISNULL(opd.IsDeleted, 0) = 0
                    )
                    THEN CHAR(10) +
                        STUFF
                        (
                            (
                                SELECT CHAR(10) + '- ' + ISNULL(fm.Name, 'Item')
                                FROM dbo.OrderPackageDetails opd
                                LEFT JOIN dbo.FoodMenu fm ON fm.Id = opd.MenuId
                                WHERE opd.OrderId = b.BillId
                                  AND ISNULL(opd.IsDeleted, 0) = 0
                                ORDER BY opd.Id
                                FOR XML PATH(''), TYPE
                            ).value('.', 'NVARCHAR(MAX)'),
                            1,
                            1,
                            ''
                        )
                    ELSE ''
                END
                AS NVARCHAR(MAX)
            ) AS ItemName,
            ISNULL(b.Pax, 0) AS Qty,
            CASE WHEN ISNULL(b.Pax, 0) > 0 THEN ISNULL(b.PackageBaseAmount, 0) / NULLIF(b.Pax, 0) ELSE 0 END AS UnitPrice,
            ISNULL(b.PackageBaseAmount, 0) AS LineTotal
        FROM Base b

        UNION ALL

        SELECT
            b.BillId,
            2 AS SortOrder,
            fm.Name AS ItemName,
            ISNULL(oei.Qty, 0) AS Qty,
            ISNULL(oei.UnitPrice, 0) AS UnitPrice,
            ISNULL(oei.TotalAmount, 0) AS LineTotal
        FROM Base b
        INNER JOIN dbo.OrderExtraItems oei ON oei.OrderId = b.BillId AND ISNULL(oei.IsDeleted, 0) = 0
        LEFT JOIN dbo.FoodMenu fm ON fm.Id = oei.MenuId

        UNION ALL

        SELECT
            b.BillId,
            3 AS SortOrder,
            aom.AddOnName AS ItemName,
            ISNULL(oad.Qty, 0) AS Qty,
            ISNULL(oad.UnitPrice, 0) AS UnitPrice,
            ISNULL(oad.TotalAmount, 0) AS LineTotal
        FROM Base b
        INNER JOIN dbo.OrderAddOnsDetails oad ON oad.OrderId = b.BillId AND ISNULL(oad.IsDeleted, 0) = 0
        LEFT JOIN dbo.AddOnMaster aom ON aom.Id = oad.AddOnsId

        UNION ALL

        SELECT
            b.BillId,
            4 AS SortOrder,
            um.UtensilName AS ItemName,
            ISNULL(oud.Qty, 0) AS Qty,
            ISNULL(oud.UnitPrice, 0) AS UnitPrice,
            ISNULL(oud.TotalAmount, 0) AS LineTotal
        FROM Base b
        INNER JOIN dbo.OrderUtensilsDetails oud ON oud.OrderId = b.BillId AND ISNULL(oud.IsDeleted, 0) = 0
        LEFT JOIN dbo.UtensilMaster um ON um.Id = oud.UtensilsId
    )
    SELECT
        b.BillId,
        b.OrderNumber,
        b.OrderDate,
        b.CustomerName,
        b.MobileNo,
        b.EmailId,
        b.Address,
        b.Pincode,
        b.EventDate,
        b.MealPeriodName,
        ISNULL(b.EventAddress, b.Address) AS Location,
        ROW_NUMBER() OVER (PARTITION BY b.BillId ORDER BY ir.SortOrder, ir.ItemName) AS [No],
        ir.ItemName AS [Description],
        ir.Qty AS [NoOfItems],
        ir.UnitPrice,
        ir.LineTotal AS [Total],
        b.SubTotal,
        b.TaxPercentage,
        b.TaxAmount,
        b.TotalAmount,
        (ISNULL(b.TotalAmount, 0) - ISNULL(b.PaidAmount, 0)) AS BalanceRemaining
    FROM Base b
    LEFT JOIN InvoiceRows ir ON ir.BillId = b.BillId
    ORDER BY b.BillId DESC, [No];
END
GO
