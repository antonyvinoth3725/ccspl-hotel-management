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
