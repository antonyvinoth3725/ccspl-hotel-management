using System.Data;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class ViewOrderDetailsRepository : IViewOrderDetailsRepository
{
    public ViewOrderDetails? GetByOrderId(int orderId)
    {
        ViewOrderDetails? item = null;
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("[dbo].[SP_View_GetOrderDetailsByOrderId]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
                    reader = DataFactory.ExecuteReader(cmd);
                    item = this.List(reader);
                }
            }
            return item;
        }
        catch (SqlException ex) { throw new Exception("Database error: " + ex.Message); }
        catch (Exception ex) { throw new Exception("Order details mapping error: " + ex.Message); }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    private ViewOrderDetails? List(IDataReader reader)
    {
        var result = new ViewOrderDetails();

        try
        {
            // Result Set 1 - Order and customer
            if (reader.Read())
            {
                var order = new ViewOrderHeader();
                if (reader["OrderId"] != DBNull.Value) order.OrderId = Convert.ToInt32(reader["OrderId"]);
                if (reader["OrderNumber"] != DBNull.Value) order.OrderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty;
                if (reader["CustomerName"] != DBNull.Value) order.CustomerName = Convert.ToString(reader["CustomerName"]) ?? string.Empty;
                if (reader["MobileNo"] != DBNull.Value) order.MobileNo = Convert.ToString(reader["MobileNo"]) ?? string.Empty;
                if (reader["EmailId"] != DBNull.Value) order.EmailId = Convert.ToString(reader["EmailId"]) ?? string.Empty;
                if (reader["CustomerAddress"] != DBNull.Value) order.CustomerAddress = Convert.ToString(reader["CustomerAddress"]) ?? string.Empty;
                if (reader["Pincode"] != DBNull.Value) order.Pincode = Convert.ToString(reader["Pincode"]) ?? string.Empty;
                if (reader["PackageId"] != DBNull.Value) order.PackageId = Convert.ToInt32(reader["PackageId"]);
                if (reader["PackageName"] != DBNull.Value) order.PackageName = Convert.ToString(reader["PackageName"]) ?? string.Empty;
                if (reader["EventId"] != DBNull.Value) order.EventId = Convert.ToInt32(reader["EventId"]);
                if (reader["MealPeriodId"] != DBNull.Value) order.MealPeriodId = Convert.ToInt32(reader["MealPeriodId"]);
                if (reader["LocationId"] != DBNull.Value) order.LocationId = Convert.ToInt32(reader["LocationId"]);
                if (reader["EventName"] != DBNull.Value) order.EventName = Convert.ToString(reader["EventName"]) ?? string.Empty;
                if (reader["MealPeriodName"] != DBNull.Value) order.MealPeriodName = Convert.ToString(reader["MealPeriodName"]) ?? string.Empty;
                if (reader["EventDate"] != DBNull.Value) order.EventDate = Convert.ToDateTime(reader["EventDate"]);
                if (reader["Pax"] != DBNull.Value) order.Pax = Convert.ToInt32(reader["Pax"]);
                if (reader["DeliveryAddress"] != DBNull.Value) order.DeliveryAddress = Convert.ToString(reader["DeliveryAddress"]) ?? string.Empty;
                if (reader["Notes"] != DBNull.Value) order.Notes = Convert.ToString(reader["Notes"]) ?? string.Empty;
                if (reader["PackageBaseAmount"] != DBNull.Value) order.PackageBaseAmount = Convert.ToDecimal(reader["PackageBaseAmount"]);
                if (reader["AdditionalMenuAmount"] != DBNull.Value) order.AdditionalMenuAmount = Convert.ToDecimal(reader["AdditionalMenuAmount"]);
                if (reader["AddOnsAmount"] != DBNull.Value) order.AddOnsAmount = Convert.ToDecimal(reader["AddOnsAmount"]);
                if (reader["UtensilsAmount"] != DBNull.Value) order.UtensilsAmount = Convert.ToDecimal(reader["UtensilsAmount"]);
                if (reader["SubTotal"] != DBNull.Value) order.SubTotal = Convert.ToDecimal(reader["SubTotal"]);
                if (reader["Discount"] != DBNull.Value) order.Discount = Convert.ToDecimal(reader["Discount"]);
                if (reader["DeliveryFee"] != DBNull.Value) order.DeliveryFee = Convert.ToDecimal(reader["DeliveryFee"]);
                if (reader["ServiceCharge"] != DBNull.Value) order.ServiceCharge = Convert.ToDecimal(reader["ServiceCharge"]);
                if (reader["TaxPercentage"] != DBNull.Value) order.TaxPercentage = Convert.ToDecimal(reader["TaxPercentage"]);
                if (reader["TaxAmount"] != DBNull.Value) order.TaxAmount = Convert.ToDecimal(reader["TaxAmount"]);
                if (reader["TotalAmount"] != DBNull.Value) order.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                if (reader["PaidAmount"] != DBNull.Value) order.PaidAmount = Convert.ToDecimal(reader["PaidAmount"]);
                if (reader["BalanceAmount"] != DBNull.Value) order.BalanceAmount = Convert.ToDecimal(reader["BalanceAmount"]);
                if (reader["OrderStatus"] != DBNull.Value) order.OrderStatus = Convert.ToInt32(reader["OrderStatus"]);
                if (reader["OrderStatusName"] != DBNull.Value) order.OrderStatusName = Convert.ToString(reader["OrderStatusName"]) ?? string.Empty;
                if (reader["PaymentStatus"] != DBNull.Value) order.PaymentStatus = Convert.ToInt32(reader["PaymentStatus"]);
                if (reader["CreatedDate"] != DBNull.Value) order.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);

                if (reader["HasDigitalSignature"] != DBNull.Value) order.HasDigitalSignature = Convert.ToBoolean(reader["HasDigitalSignature"]);

                result.Order = order;
            }

            // Result Set 2 - Package
            if (reader.NextResult() && reader.Read())
            {
                var package = new ViewOrderPackage();
                if (reader["PackageId"] != DBNull.Value) package.PackageId = Convert.ToInt32(reader["PackageId"]);
                if (reader["PackageName"] != DBNull.Value) package.PackageName = Convert.ToString(reader["PackageName"]) ?? string.Empty;
                if (reader["PackageDescription"] != DBNull.Value) package.PackageDescription = Convert.ToString(reader["PackageDescription"]) ?? string.Empty;
                if (reader["PackagePrice"] != DBNull.Value) package.PackagePrice = Convert.ToDecimal(reader["PackagePrice"]);
                result.Package = package;
            }

            // Result Set 3 - Event
            if (reader.NextResult() && reader.Read())
            {
                var eventDetails = new ViewOrderEvent();
                if (reader["EventDate"] != DBNull.Value) eventDetails.EventDate = Convert.ToDateTime(reader["EventDate"]);
                if (reader["AlternateMobileNo"] != DBNull.Value) eventDetails.AlternateMobileNo = Convert.ToString(reader["AlternateMobileNo"]) ?? string.Empty;
                if (reader["EventAddress"] != DBNull.Value) eventDetails.EventAddress = Convert.ToString(reader["EventAddress"]) ?? string.Empty;
                if (reader["ConsumingTime"] != DBNull.Value) eventDetails.ConsumingTime = (TimeSpan)reader["ConsumingTime"];
                if (reader["DeliveryType"] != DBNull.Value) eventDetails.DeliveryType = Convert.ToInt32(reader["DeliveryType"]);
                result.Event = eventDetails;
            }

            // Result Set 4 - Included package menu items
            if (reader.NextResult())
            {
                while (reader.Read())
                {
                    var menu = new ViewOrderMenuItem { Qty = 1 };
                    if (HasColumn(reader, "CategoryId") && reader["CategoryId"] != DBNull.Value) menu.CategoryId = Convert.ToInt32(reader["CategoryId"]);
                    if (HasColumn(reader, "CategoryName") && reader["CategoryName"] != DBNull.Value) menu.CategoryName = Convert.ToString(reader["CategoryName"]) ?? string.Empty;
                    if (reader["MenuId"] != DBNull.Value) menu.MenuId = Convert.ToInt32(reader["MenuId"]);
                    if (reader["MenuCode"] != DBNull.Value) menu.MenuCode = Convert.ToString(reader["MenuCode"]) ?? string.Empty;
                    if (reader["MenuName"] != DBNull.Value) menu.MenuName = Convert.ToString(reader["MenuName"]) ?? string.Empty;
                    if (reader["Qty"] != DBNull.Value) menu.Qty = Convert.ToInt32(reader["Qty"]);
                    if (reader["Notes"] != DBNull.Value) menu.Notes = Convert.ToString(reader["Notes"]) ?? string.Empty;
                    result.IncludedItems.Add(menu);
                }
            }

            // Result Set 5 - Additional menu items
            if (reader.NextResult())
            {
                while (reader.Read())
                {
                    var menu = new ViewOrderMenuItem();
                    if (HasColumn(reader, "CategoryId") && reader["CategoryId"] != DBNull.Value) menu.CategoryId = Convert.ToInt32(reader["CategoryId"]);
                    if (HasColumn(reader, "CategoryName") && reader["CategoryName"] != DBNull.Value) menu.CategoryName = Convert.ToString(reader["CategoryName"]) ?? string.Empty;
                    if (reader["MenuId"] != DBNull.Value) menu.MenuId = Convert.ToInt32(reader["MenuId"]);
                    if (reader["MenuCode"] != DBNull.Value) menu.MenuCode = Convert.ToString(reader["MenuCode"]) ?? string.Empty;
                    if (reader["MenuName"] != DBNull.Value) menu.MenuName = Convert.ToString(reader["MenuName"]) ?? string.Empty;
                    if (reader["Qty"] != DBNull.Value) menu.Qty = Convert.ToInt32(reader["Qty"]);
                    if (reader["UnitPrice"] != DBNull.Value) menu.UnitPrice = Convert.ToDecimal(reader["UnitPrice"]);
                    if (reader["TotalAmount"] != DBNull.Value) menu.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                    if (HasColumn(reader, "Notes") && reader["Notes"] != DBNull.Value) menu.Notes = Convert.ToString(reader["Notes"]) ?? string.Empty;
                    result.ExtraItems.Add(menu);
                }
            }

            // Result Set 6 - Add-ons
            if (reader.NextResult())
            {
                while (reader.Read())
                {
                    var addOn = new ViewOrderAddOn();
                    if (reader["AddOnsId"] != DBNull.Value) addOn.AddOnsId = Convert.ToInt32(reader["AddOnsId"]);
                    if (reader["AddOnCode"] != DBNull.Value) addOn.AddOnCode = Convert.ToString(reader["AddOnCode"]) ?? string.Empty;
                    if (reader["AddOnName"] != DBNull.Value) addOn.AddOnName = Convert.ToString(reader["AddOnName"]) ?? string.Empty;
                    if (reader["Qty"] != DBNull.Value) addOn.Qty = Convert.ToInt32(reader["Qty"]);
                    if (reader["UnitPrice"] != DBNull.Value) addOn.UnitPrice = Convert.ToDecimal(reader["UnitPrice"]);
                    if (reader["TotalAmount"] != DBNull.Value) addOn.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                    result.AddOns.Add(addOn);
                }
            }

            // Result Set 7 - Utensils
            if (reader.NextResult())
            {
                while (reader.Read())
                {
                    var utensil = new ViewOrderUtensil();
                    if (reader["UtensilsId"] != DBNull.Value) utensil.UtensilsId = Convert.ToInt32(reader["UtensilsId"]);
                    if (reader["UtensilName"] != DBNull.Value) utensil.UtensilName = Convert.ToString(reader["UtensilName"]) ?? string.Empty;
                    if (reader["Qty"] != DBNull.Value) utensil.Qty = Convert.ToInt32(reader["Qty"]);
                    if (reader["UnitPrice"] != DBNull.Value) utensil.UnitPrice = Convert.ToDecimal(reader["UnitPrice"]);
                    if (reader["TotalAmount"] != DBNull.Value) utensil.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                    result.Utensils.Add(utensil);
                }
            }
        }

        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception("Order details mapping error: " + ex.Message);
        }

        return result.Order == null ? null : result;
    }

    private bool HasColumn(IDataRecord reader, string columnName)
    {
        for (int index = 0; index < reader.FieldCount; index++)
        {
            if (reader.GetName(index).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

}
