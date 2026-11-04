using System;
using System.Collections.Generic;
using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class OrdersRepository : IOrdersRepository
{
    private readonly IEventMasterRepository _events;

    public OrdersRepository(IEventMasterRepository events)
    {
        _events = events;
    }

    public List<OrderListItem> GetOrderList(DateTime? fromDate = null, DateTime? toDate = null, string Indicator = "", int? status = null, string eventFilter = null)
    {
        List<OrderListItem> list = new List<OrderListItem>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("dbo.GetOrders", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", fromDate.HasValue ? (object)fromDate.Value.Date : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", toDate.HasValue ? (object)toDate.Value.Date : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Indicator", Indicator));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Status", status));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EventFilter", string.IsNullOrWhiteSpace(eventFilter) ? DBNull.Value : eventFilter.Trim()));

                    reader = DataFactory.ExecuteReader(cmd);
                    list = ListOrderItems(reader);
                }
            }

            if (list == null)
            {
                return new List<OrderListItem>();
            }

            return list;
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public bool UpdateOrderStatus(int OrderId, int Status)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand("SP_UpdateOrderStatus", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", OrderId));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Status", Status));

                    bool rowsAffected = DataFactory.ExecuteNonQuerybool(cmd);
                    return rowsAffected;
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public bool UpdateDigitalSignature(int orderId, byte[] digitalSignature)
    {
        if (orderId <= 0 || digitalSignature == null || digitalSignature.Length == 0)
            return false;

        IDbConnection? conn = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using var cmd = DataFactory.CreateCommand("dbo.SP_UpdateOrderDigitalSignature", conn);
                ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
                cmd.Parameters.Add(DataFactory.CreateParameter("@DigitalSignature", SqlDbType.VarBinary, digitalSignature));

                var result = DataFactory.ExecuteScalar(cmd);
                return result != null && result != DBNull.Value && Convert.ToInt32(result) == 1;
            }
        }
        catch (SqlException ex)
        {
            throw new Exception("Unable to update the order digital signature.", ex);
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while updating the order digital signature.", ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public int UpdateOrderPaymentStatus(int OrderId, int Status)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand("SP_UpdateOrderPaymentStatus", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", OrderId));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Status", Status));

                    var rowsAffected = DataFactory.ExecuteNonQuery(cmd);
                    return rowsAffected > 0 ? Status : -1;
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public int CreateReOrder(int OrderId)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateReOrder", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", OrderId));
                    reader = DataFactory.ExecuteReader(cmd);
                    var reOrderId = reader.Read() && reader["OrderId"] != DBNull.Value
                        ? Convert.ToInt32(reader["OrderId"])
                        : 0;
                    reader.Close();

                    if (reOrderId > 0)
                    {
                        using var signatureCmd = DataFactory.CreateCommand("dbo.SP_UpdateOrderDigitalSignature", conn);
                        ((SqlCommand)signatureCmd).CommandType = CommandType.StoredProcedure;
                        signatureCmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", reOrderId));
                        signatureCmd.Parameters.Add(DataFactory.CreateParameter("@DigitalSignature", SqlDbType.VarBinary, null));
                        DataFactory.ExecuteNonQuery(signatureCmd);
                    }

                    return reOrderId;
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }
        finally
        {
            if (reader != null) reader.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
    }

    public OrderPaymentStatus? GetOrderPaymentStatus(int orderId)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SELECT Id, TotalAmount, PaidAmount, PaymentStatus FROM Orders WHERE Id = @OrderId AND IsDeleted = 0", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
                    reader = DataFactory.ExecuteReader(cmd);

                    if (!reader.Read())
                        return null;

                    return new OrderPaymentStatus
                    {
                        OrderId = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : orderId,
                        TotalAmount = reader["TotalAmount"] != DBNull.Value ? Convert.ToDecimal(reader["TotalAmount"]) : 0,
                        PaidAmount = reader["PaidAmount"] != DBNull.Value ? Convert.ToDecimal(reader["PaidAmount"]) : 0,
                        PaymentStatus = reader["PaymentStatus"] != DBNull.Value ? Convert.ToInt32(reader["PaymentStatus"]) : 0
                    };
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

      public int CreateCompleteOrder(CreateOrderRequest request)
    {
        ValidateAndPrepareOrder(request);
        SqlConnection conn = null;
        SqlTransaction transaction = null;

        try
        {
            conn = (SqlConnection)DataFactory.CreateConnection();
            conn.Open();
            transaction = conn.BeginTransaction();

            var now = DateTime.Now;
            var customer = request.Customer;
            const int systemUserId = 0;
            var createdBy = customer.CreatedBy > 0
                ? customer.CreatedBy
                : request.Order.CreatedBy.GetValueOrDefault() > 0
                    ? request.Order.CreatedBy.Value
                    : systemUserId;

            using (var cmd = CreateTransactionCommand("SP_CreateCustomerMaster", conn, transaction))
            {
                
                AddParameter(cmd, "@Code", string.IsNullOrWhiteSpace(customer.Code) ? $"C{now:yyMMddHHmmssff}" : customer.Code.Trim());
                AddParameter(cmd, "@Name", customer.Name.Trim());
                AddParameter(cmd, "@MobileNo", customer.MobileNo?.Trim());
                AddParameter(cmd, "@AlternateMobileNo", customer.AlternateMobileNo?.Trim());
                AddParameter(cmd, "@EmailId", customer.EmailId?.Trim() ?? string.Empty);
                AddParameter(cmd, "@Address", customer.Address?.Trim() ?? string.Empty);
                AddParameter(cmd, "@Remarks", customer.Remarks);
                AddParameter(cmd, "@IsActive", true);
                AddParameter(cmd, "@IsDeleted", false);
                AddParameter(cmd, "@CreatedBy", createdBy);
                AddParameter(cmd, "@CreatedDate", now);
                AddParameter(cmd, "@UpdatedBy", null);
                AddParameter(cmd, "@UpdatedDate", null);
                customer.Id = ExecuteId(cmd, "customer");
            }

            var order = request.Order;
            order.CustomerId = customer.Id;

            using (var cmd = CreateTransactionCommand("SP_CreateOrders", conn, transaction))
            {
                AddParameter(cmd, "@OrderNumber", order.OrderNumber);
                AddParameter(cmd, "@CustomerId", order.CustomerId);
                AddParameter(cmd, "@PackageId", order.PackageId);
                AddParameter(cmd, "@EventId", order.EventId);
                AddParameter(cmd, "@MealPeriodId", order.MealPeriodId);
                AddParameter(cmd, "@LocationId", order.LocationId);
                AddParameter(cmd, "@EventDate", order.EventDate);
                AddParameter(cmd, "@DeliveryAddress", order.DeliveryAddress);
                AddParameter(cmd, "@Notes", order.Notes);
                AddParameter(cmd, "@Pax", order.Pax);
                AddParameter(cmd, "@PackageBaseAmount", order.PackageBaseAmount);
                AddParameter(cmd, "@AdditionalMenuAmount", order.AdditionalMenuAmount);
                AddParameter(cmd, "@AddOnsAmount", order.AddOnsAmount);
                AddParameter(cmd, "@UtensilsAmount", order.UtensilsAmount);
                AddParameter(cmd, "@ServiceCharge", order.ServiceCharge);
                AddParameter(cmd, "@SubTotal", order.SubTotal);
                AddParameter(cmd, "@Discount", order.Discount);
                AddParameter(cmd, "@DeliveryFee", order.DeliveryFee);
                AddParameter(cmd, "@TaxAmount", order.TaxAmount);
                AddParameter(cmd, "@TotalAmount", order.TotalAmount);
                AddParameter(cmd, "@TaxPercentage", order.TaxPercentage);
                AddParameter(cmd, "@PaidAmount", order.PaidAmount);
                AddParameter(cmd, "@BalanceAmount", order.BalanceAmount);
                AddParameter(cmd, "@PaymentStatus", order.PaymentStatus);
                AddParameter(cmd, "@OrderStatus", order.OrderStatus);
                AddVarBinaryParameter(cmd, "@DigitalSignature", ConvertDigitalSignatureToBytes(order.DigitalSignature));
                AddParameter(cmd, "@CreatedDate", now);
                AddParameter(cmd, "@CreatedBy", createdBy);
                AddParameter(cmd, "@UpdatedDate", null);
                AddParameter(cmd, "@UpdatedBy", null);
                order.Id = ExecuteId(cmd, "order");
            }

            foreach (var item in request.PackageDetails)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderPackageDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@CategoryId", item.CategoryId);
                AddParameter(cmd, "@MenuId", item.MenuId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@Notes", item.Notes);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "package detail");
            }

            foreach (var item in request.ExtraItems)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderExtraItems", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@CategoryId", item.CategoryId);
                AddParameter(cmd, "@Notes", item.Notes);
                AddParameter(cmd, "@MenuId", item.MenuId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "extra item");
            }

            foreach (var item in request.AddOns)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderAddOnsDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@AddOnsId", item.AddOnsId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "add-on");
            }

            foreach (var item in request.Utensils)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderUtensilsDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@UtensilsId", item.UtensilsId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddParameter(cmd, "@RefundableDeposit", item.RefundableDeposit);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "utensil");
            }

            var details = request.Event;



            using (var cmd = CreateTransactionCommand("SP_CreateOrderEventDetails", conn, transaction))
            {
                AddParameter(cmd, "@CustomerId", customer.Id);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@EventDate", details.EventDate ?? order.EventDate);
                AddParameter(cmd, "@ConsumingTime", details.ConsumingTime);
                AddParameter(cmd, "@DeliveryType", details.DeliveryType);
                AddParameter(cmd, "@DeliveryAddress", string.IsNullOrWhiteSpace(details.DeliveryAddress) ? order.DeliveryAddress : details.DeliveryAddress);
                AddParameter(cmd, "@CustomerAddress", string.IsNullOrWhiteSpace(details.CustomerAddress) ? customer.Address : details.CustomerAddress);
                AddParameter(cmd, "@LocationId", details.LocationId ?? order.LocationId);
                AddParameter(cmd, "@Notes", details.Notes);
                AddParameter(cmd, "@DeliveryPincode", details.DeliveryPincode);
                AddParameter(cmd, "@MobileNo", details.MobileNo?.Trim());
                AddParameter(cmd, "@AlternateMobileNo", details.AlternateMobileNo?.Trim());
                AddParameter(cmd, "@MealPeriodId", details.MealPeriodId);
                AddAudit(cmd, details.CreatedBy > 0 ? details.CreatedBy : createdBy, now);
                ExecuteRequired(cmd, "event detail");
            }

            transaction.Commit();
            return order.Id;
        }
        catch (SqlException ex)
        {
            if (transaction != null) transaction.Rollback();
            throw new Exception("Unable to submit order: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            if (transaction != null) transaction.Rollback();
            throw new Exception("Unable to submit order: " + ex.Message, ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public int UpdateCompleteOrder(CreateOrderRequest request)
    {
        ValidateAndPrepareOrder(request);
        SqlConnection conn = null;
        SqlTransaction transaction = null;

        try
        {
            conn = (SqlConnection)DataFactory.CreateConnection();
            conn.Open();

            transaction = conn.BeginTransaction();

            var now = DateTime.Now;
            var customer = request.Customer;
            var order = request.Order;
            var details = request.Event;

            const int systemUserId = 0;

            var updatedBy = customer.UpdatedBy.GetValueOrDefault() > 0  ? customer.UpdatedBy.Value : order.UpdatedBy.GetValueOrDefault() > 0
                    ? order.UpdatedBy.Value: order.CreatedBy.GetValueOrDefault() > 0 ? order.CreatedBy.Value: systemUserId;

           

           
            using (var cmd = CreateTransactionCommand(
                       "SP_UpdateCustomerMaster",
                       conn,
                       transaction))
            {
                AddParameter(cmd, "@Id", customer.Id);
                AddParameter(cmd, "@Code", customer.Code?.Trim());
                AddParameter(cmd, "@Name", customer.Name?.Trim());
                AddParameter(cmd, "@MobileNo", customer.MobileNo?.Trim());
                AddParameter(
                    cmd,
                    "@AlternateMobileNo",
                    customer.AlternateMobileNo?.Trim());

                AddParameter(
                    cmd,
                    "@EmailId",
                    customer.EmailId?.Trim() ?? string.Empty);

                AddParameter(
                    cmd,
                    "@Address",
                    customer.Address?.Trim() ?? string.Empty);

               
                AddParameter(cmd, "@Remarks", customer.Remarks);
                AddParameter(cmd, "@IsActive", customer.IsActive);
                AddParameter(cmd, "@IsDeleted", customer.IsDeleted);
                AddParameter(cmd, "@UpdatedBy", updatedBy);
                AddParameter(cmd, "@UpdatedDate", now);

                ExecuteRequired(cmd, "customer");
            }

            /*
             * UPDATE ORDER
             */
            using (var cmd = CreateTransactionCommand(
                       "SP_UpdateOrders",
                       conn,
                       transaction))
            {
                AddParameter(cmd, "@Id", order.Id);
                AddParameter(cmd, "@OrderNumber", order.OrderNumber);
                AddParameter(cmd, "@CustomerId", customer.Id);
                AddParameter(cmd, "@PackageId", order.PackageId);
                AddParameter(cmd, "@EventId", order.EventId);
                AddParameter(cmd, "@MealPeriodId", order.MealPeriodId);
                AddParameter(cmd, "@LocationId", order.LocationId);
                AddParameter(cmd, "@EventDate", order.EventDate);
                AddParameter(cmd, "@DeliveryAddress", order.DeliveryAddress);
                AddParameter(cmd, "@Notes", order.Notes);
                AddParameter(cmd, "@Pax", order.Pax);
                AddParameter( cmd,  "@PackageBaseAmount",order.PackageBaseAmount);
                AddParameter(cmd, "@AdditionalMenuAmount",      order.AdditionalMenuAmount);
                AddParameter(cmd, "@AddOnsAmount", order.AddOnsAmount);
                AddParameter(cmd, "@UtensilsAmount", order.UtensilsAmount);
                AddParameter(cmd, "@ServiceCharge", order.ServiceCharge);
                AddParameter(cmd, "@SubTotal", order.SubTotal);
                AddParameter(cmd, "@Discount", order.Discount);
                AddParameter(cmd, "@DeliveryFee", order.DeliveryFee);
                AddParameter(cmd, "@TaxAmount", order.TaxAmount);
                AddParameter(cmd, "@TotalAmount", order.TotalAmount);
                AddParameter(cmd, "@TaxPercentage", order.TaxPercentage);
                AddParameter(cmd, "@PaidAmount", order.PaidAmount);
                AddParameter(cmd, "@BalanceAmount", order.BalanceAmount);
                AddParameter(cmd, "@PaymentStatus", order.PaymentStatus);
                AddParameter(cmd, "@OrderStatus", order.OrderStatus);
                AddVarBinaryParameter(cmd, "@DigitalSignature", ConvertDigitalSignatureToBytes(order.DigitalSignature));
                AddParameter(cmd, "@UpdatedDate", now);
                AddParameter(cmd, "@UpdatedBy", updatedBy);

                ExecuteRequired(cmd, "order");
            }

            /*
             * UPDATE OR INSERT PACKAGE DETAILS
             */
            foreach (var item in request.PackageDetails ?? [])
            {
                if (item.Id > 0)
                {
                    using var cmd = CreateTransactionCommand(
                        "SP_UpdateOrderPackageDetails",
                        conn,
                        transaction);

                    AddParameter(cmd, "@Id", item.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@CategoryId", item.CategoryId);
                    AddParameter(cmd, "@MenuId", item.MenuId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@Notes", item.Notes);
                    AddParameter(cmd, "@IsActive", item.IsActive);
                    AddParameter(cmd, "@IsDeleted", item.IsDeleted);
                    AddParameter(cmd, "@UpdatedBy", updatedBy);
                    AddParameter(cmd, "@UpdatedDate", now);

                    ExecuteRequired(cmd, "package detail");
                }
                else
                {
                    using var cmd = CreateTransactionCommand(
                        "SP_CreateOrderPackageDetails",
                        conn,
                        transaction);

                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@CategoryId", item.CategoryId);
                    AddParameter(cmd, "@MenuId", item.MenuId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@Notes", item.Notes);

                    AddAudit(
                        cmd,
                        item.CreatedBy ?? updatedBy,
                        now);

                    ExecuteRequired(cmd, "package detail");
                }
            }

            
            foreach (var item in request.ExtraItems ?? [])
            {
                if (item.Id > 0)
                {
                    using var cmd = CreateTransactionCommand( "SP_UpdateOrderExtraItems",  conn, transaction);

                    AddParameter(cmd, "@Id", item.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@CategoryId", item.CategoryId);
                    AddParameter(cmd, "@MenuId", item.MenuId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                    AddParameter(cmd, "@IsActive", item.IsActive);
                    AddParameter(cmd, "@IsDeleted", item.IsDeleted);
                    AddParameter(cmd, "@UpdatedBy", updatedBy);
                    AddParameter(cmd, "@UpdatedDate", now);

                    ExecuteRequired(cmd, "extra item");
                }
                else
                {
                    using var cmd = CreateTransactionCommand( "SP_CreateOrderExtraItems", conn, transaction);

                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@CategoryId", item.CategoryId);
                    AddParameter(cmd, "@MenuId", item.MenuId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);

                    AddAudit(cmd,item.CreatedBy ?? updatedBy,now);

                    ExecuteRequired(cmd, "extra item");
                }
            }

            
            foreach (var item in request.AddOns ?? [])
            {
                if (item.Id > 0)
                {
                    using var cmd = CreateTransactionCommand("SP_UpdateOrderAddOnsDetails", conn,transaction);

                    AddParameter(cmd, "@Id", item.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@AddOnsId", item.AddOnsId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                    AddParameter(cmd, "@IsActive", item.IsActive);
                    AddParameter(cmd, "@IsDeleted", item.IsDeleted);
                    AddParameter(cmd, "@UpdatedBy", updatedBy);
                    AddParameter(cmd, "@UpdatedDate", now);

                    ExecuteRequired(cmd, "add-on");
                }
                else
                {
                    using var cmd = CreateTransactionCommand("SP_CreateOrderAddOnsDetails",conn,transaction);

                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@AddOnsId", item.AddOnsId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);

                    AddAudit(cmd,item.CreatedBy ?? updatedBy,now);

                    ExecuteRequired(cmd, "add-on");
                }
            }

            
            foreach (var item in request.Utensils ?? [])
            {
                if (item.Id > 0)
                {
                    using var cmd = CreateTransactionCommand("SP_UpdateOrderUtensilsDetails",conn,transaction);

                    AddParameter(cmd, "@Id", item.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@UtensilsId", item.UtensilsId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                    AddParameter(cmd, "@RefundableDeposit",item.RefundableDeposit);
                    AddParameter(cmd, "@IsActive", item.IsActive);
                    AddParameter(cmd, "@IsDeleted", item.IsDeleted);
                    AddParameter(cmd, "@UpdatedBy", updatedBy);
                    AddParameter(cmd, "@UpdatedDate", now);

                    ExecuteRequired(cmd, "utensil");
                }
                else
                {
                    using var cmd = CreateTransactionCommand("SP_CreateOrderUtensilsDetails", conn,transaction);

                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@UtensilsId", item.UtensilsId);
                    AddParameter(cmd, "@Qty", item.Qty);
                    AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                    AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                    AddParameter(cmd,"@RefundableDeposit",item.RefundableDeposit);

                    AddAudit(cmd,item.CreatedBy ?? updatedBy,now);

                    ExecuteRequired(cmd, "utensil");
                }
            }

           
            if (details != null)
            {
                if (details.Id > 0)
                {
                    using var cmd = CreateTransactionCommand("SP_UpdateOrderEventDetails", conn,transaction);

                    AddParameter(cmd, "@Id", details.Id);
                    AddParameter(cmd, "@CustomerId", customer.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd,"@EventDate", details.EventDate ?? order.EventDate);
                    AddParameter(cmd, "@DeliveryType", details.DeliveryType);
                    AddParameter( cmd,"@DeliveryAddress",string.IsNullOrWhiteSpace(details.DeliveryAddress) ? order.DeliveryAddress : details.DeliveryAddress.Trim());
                    AddParameter( cmd, "@CustomerAddress", string.IsNullOrWhiteSpace(details.CustomerAddress) ? customer.Address: details.CustomerAddress.Trim());
                    AddParameter(cmd, "@LocationId", details.LocationId ?? order.LocationId);
                    AddParameter(cmd, "@MobileNo", details.MobileNo?.Trim());
                    AddParameter(cmd,"@AlternateMobileNo",details.AlternateMobileNo?.Trim());
                    AddParameter(cmd, "@Notes", details.Notes);
                    AddParameter(cmd, "@MealPeriodId", details.MealPeriodId);
                    AddParameter(cmd, "@IsActive", details.IsActive);
                    AddParameter(cmd, "@IsDeleted", details.IsDeleted);
                    AddParameter(cmd, "@UpdatedBy", updatedBy);
                    AddParameter(cmd, "@UpdatedDate", now);

                    ExecuteRequired(cmd, "event detail");
                }
                else
                {
                    using var cmd = CreateTransactionCommand( "SP_CreateOrderEventDetails",conn,transaction);

                    AddParameter(cmd, "@CustomerId", customer.Id);
                    AddParameter(cmd, "@OrderId", order.Id);
                    AddParameter(cmd, "@EventDate", details.EventDate ?? order.EventDate);
                    AddParameter(cmd, "@DeliveryType", details.DeliveryType);
                    AddParameter(cmd,"@DeliveryAddress",string.IsNullOrWhiteSpace(details.DeliveryAddress)? order.DeliveryAddress: details.DeliveryAddress.Trim());
                    AddParameter(cmd,"@CustomerAddress", string.IsNullOrWhiteSpace(details.CustomerAddress)? customer.Address : details.CustomerAddress.Trim());
                    AddParameter(cmd, "@LocationId", details.LocationId ?? order.LocationId);
                    AddParameter(cmd, "@Notes", details.Notes);
                    AddParameter(cmd, "@MobileNo", details.MobileNo?.Trim());
                    AddParameter(cmd,"@AlternateMobileNo", details.AlternateMobileNo?.Trim());
                    AddParameter(cmd, "@MealPeriodId", details.MealPeriodId);

                    AddAudit(cmd,details.CreatedBy > 0? details.CreatedBy: updatedBy, now);

                    ExecuteRequired(cmd, "event detail");
                }
            }

            transaction.Commit();

            return order.Id;
        }
        catch (SqlException ex)
        {
            try
            {
                transaction?.Rollback();
            }
            catch
            {
                // Avoid replacing the original SQL exception.
            }

            throw new Exception(
                "Unable to update order: " + ex.Message,
                ex);
        }
        catch (Exception ex)
        {
            try
            {
                transaction?.Rollback();
            }
            catch
            {
                // Avoid replacing the original exception.
            }

            throw new Exception(
                "Unable to update order: " + ex.Message,
                ex);
        }
        finally
        {
            transaction?.Dispose();

            if (conn != null)
            {
                if (conn.State != ConnectionState.Closed)
                    conn.Close();

                conn.Dispose();
            }
        }
    }




    public int CreateAmendmentOrder(CreateOrderRequest request)
    {
        SqlConnection conn = null;
        SqlTransaction transaction = null;

        try
        {
            conn = (SqlConnection)DataFactory.CreateConnection();
            conn.Open();
            transaction = conn.BeginTransaction();

            var now = DateTime.Now;
            var customer = request.Customer;
            const int systemUserId = 0;
            var createdBy = customer.CreatedBy > 0
                ? customer.CreatedBy
                : request.Order.CreatedBy.GetValueOrDefault() > 0
                    ? request.Order.CreatedBy.Value
                    : systemUserId;

            using (var cmd = CreateTransactionCommand("SP_CreateCustomerMaster", conn, transaction))
            {

                AddParameter(cmd, "@Code", string.IsNullOrWhiteSpace(customer.Code) ? $"C{now:yyMMddHHmmssff}" : customer.Code.Trim());
                AddParameter(cmd, "@Name", customer.Name.Trim());
                AddParameter(cmd, "@MobileNo", customer.MobileNo?.Trim());
                AddParameter(cmd, "@AlternateMobileNo", customer.AlternateMobileNo?.Trim());
                AddParameter(cmd, "@EmailId", customer.EmailId?.Trim() ?? string.Empty);
                AddParameter(cmd, "@Address", customer.Address?.Trim() ?? string.Empty);
                AddParameter(cmd, "@Remarks", customer.Remarks);
                AddParameter(cmd, "@IsActive", true);
                AddParameter(cmd, "@IsDeleted", false);
                AddParameter(cmd, "@CreatedBy", createdBy);
                AddParameter(cmd, "@CreatedDate", now);
                AddParameter(cmd, "@UpdatedBy", null);
                AddParameter(cmd, "@UpdatedDate", null);
                customer.Id = ExecuteId(cmd, "customer");
            }

            var order = request.Order;

            // Preserve the amount already paid against the original order. An amendment
            // may reduce the total, in which case PaidAmount can legitimately be greater
            // than TotalAmount and the difference must remain visible as refund due.
            order.PaidAmount = Math.Max(order.PaidAmount, 0);
            order.BalanceAmount = Math.Max(
                order.TotalAmount - order.PaidAmount,
                0);
            order.PaymentStatus = order.PaidAmount <= 0
                ? 0
                : order.BalanceAmount > 0 ? 1 : 2;

            
            int originalOrderId = order.Id;

            if (originalOrderId <= 0)
            {
                throw new Exception("Original order ID is required.");
            }

            order.CustomerId = customer.Id;

            using (var cmd = CreateTransactionCommand(  "[dbo].[SP_CreateAmendmentOrders]", conn,  transaction))
            {
                AddParameter(cmd, "@OrderNumber", order.OrderNumber);
                AddParameter(cmd, "@CustomerId", order.CustomerId);
                AddParameter(cmd, "@PackageId", order.PackageId);
                AddParameter(cmd, "@EventId", order.EventId);
                AddParameter(cmd, "@MealPeriodId", order.MealPeriodId);
                AddParameter(cmd, "@LocationId", order.LocationId);
                AddParameter(cmd, "@EventDate", order.EventDate);
                AddParameter(cmd, "@DeliveryAddress", order.DeliveryAddress);
                AddParameter(cmd, "@Notes", order.Notes);
                AddParameter(cmd, "@Pax", order.Pax);
                AddParameter(cmd, "@PackageBaseAmount", order.PackageBaseAmount);
                AddParameter(cmd, "@AdditionalMenuAmount", order.AdditionalMenuAmount);
                AddParameter(cmd, "@AddOnsAmount", order.AddOnsAmount);
                AddParameter(cmd, "@UtensilsAmount", order.UtensilsAmount);
                AddParameter(cmd, "@ServiceCharge", order.ServiceCharge);
                AddParameter(cmd, "@SubTotal", order.SubTotal);
                AddParameter(cmd, "@Discount", order.Discount);
                AddParameter(cmd, "@DeliveryFee", order.DeliveryFee);
                AddParameter(cmd, "@TaxAmount", order.TaxAmount);
                AddParameter(cmd, "@TotalAmount", order.TotalAmount);
                AddParameter(cmd, "@TaxPercentage", order.TaxPercentage);
                AddParameter(cmd, "@PaidAmount", order.PaidAmount);
                AddParameter(cmd, "@BalanceAmount", order.BalanceAmount);
                AddParameter(cmd, "@PaymentStatus", order.PaymentStatus);
                AddParameter(cmd, "@OrderStatus", order.OrderStatus);
                AddVarBinaryParameter(cmd, "@DigitalSignature", null);
                AddParameter(cmd, "@CreatedDate", now);
                AddParameter(cmd, "@CreatedBy", createdBy);
                AddParameter(cmd, "@UpdatedDate", null);
                AddParameter(cmd, "@UpdatedBy", null);                               
                AddParameter(cmd, "@RefId", originalOrderId);
             
                int amendmentOrderId = ExecuteId(cmd, "amendment order");

                if (amendmentOrderId <= 0)
                {
                    throw new Exception("Amendment order could not be created.");
                }

               
                order.Id = amendmentOrderId;
            }

            var amendmentRefundDue = Math.Max(order.PaidAmount - order.TotalAmount, 0);
            using (var cmd = CreateTransactionCommand("dbo.SP_Orders_SetAmendmentRefundDue", conn, transaction))
            {
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@RefundedAmount", amendmentRefundDue);
                AddParameter(cmd, "@RefundStatus", amendmentRefundDue > 0 ? 2 : 1);
                AddParameter(cmd, "@UpdatedBy", createdBy);
                ExecuteRequired(cmd, "amendment refund due");
            }

            foreach (var item in request.PackageDetails)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderPackageDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@CategoryId", item.CategoryId);
                AddParameter(cmd, "@MenuId", item.MenuId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@Notes", item.Notes);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "package detail");
            }

            foreach (var item in request.ExtraItems)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderExtraItems", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@CategoryId", item.CategoryId);
                AddParameter(cmd, "@Notes", item.Notes);
                AddParameter(cmd, "@MenuId", item.MenuId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "extra item");
            }

            foreach (var item in request.AddOns)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderAddOnsDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@AddOnsId", item.AddOnsId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "add-on");
            }

            foreach (var item in request.Utensils)
            {
                using var cmd = CreateTransactionCommand("SP_CreateOrderUtensilsDetails", conn, transaction);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@UtensilsId", item.UtensilsId);
                AddParameter(cmd, "@Qty", item.Qty);
                AddParameter(cmd, "@UnitPrice", item.UnitPrice);
                AddParameter(cmd, "@TotalAmount", item.TotalAmount);
                AddParameter(cmd, "@RefundableDeposit", item.RefundableDeposit);
                AddAudit(cmd, item.CreatedBy ?? createdBy, now);
                ExecuteRequired(cmd, "utensil");
            }

            var details = request.Event;



            using (var cmd = CreateTransactionCommand("SP_CreateOrderEventDetails", conn, transaction))
            {
                AddParameter(cmd, "@CustomerId", customer.Id);
                AddParameter(cmd, "@OrderId", order.Id);
                AddParameter(cmd, "@EventDate", details.EventDate ?? order.EventDate);
                AddParameter(cmd, "@ConsumingTime", details.ConsumingTime);
                AddParameter(cmd, "@DeliveryType", details.DeliveryType);
                AddParameter(cmd, "@DeliveryAddress", string.IsNullOrWhiteSpace(details.DeliveryAddress) ? order.DeliveryAddress : details.DeliveryAddress);
                AddParameter(cmd, "@CustomerAddress", string.IsNullOrWhiteSpace(details.CustomerAddress) ? customer.Address : details.CustomerAddress);
                AddParameter(cmd, "@LocationId", details.LocationId ?? order.LocationId);
                AddParameter(cmd, "@Notes", details.Notes);
                AddParameter(cmd, "@DeliveryPincode", details.DeliveryPincode);
                AddParameter(cmd, "@MobileNo", details.MobileNo?.Trim());
                AddParameter(cmd, "@AlternateMobileNo", details.AlternateMobileNo?.Trim());
                AddParameter(cmd, "@MealPeriodId", details.MealPeriodId);
                AddAudit(cmd, details.CreatedBy > 0 ? details.CreatedBy : createdBy, now);
                ExecuteRequired(cmd, "event detail");
            }

            transaction.Commit();
            return order.Id;
        }
        catch (SqlException ex)
        {
            if (transaction != null) transaction.Rollback();
            throw new Exception("Unable to submit order: " + ex.Message, ex);
        }
        catch (Exception ex)
        {
            if (transaction != null) transaction.Rollback();
            throw new Exception("Unable to submit order: " + ex.Message, ex);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }



    #region Private Methods
    private void ValidateAndPrepareOrder(CreateOrderRequest request)
    {
        if (request?.Customer == null || request.Order == null)
            throw new ArgumentException("Customer and order details are required.");

        if (string.IsNullOrWhiteSpace(request.Customer.Name))
            throw new ArgumentException("Customer name is required.");

        var rawMobileNo = (request.Event?.MobileNo ?? request.Customer.MobileNo ?? string.Empty).Trim();
        var mobileNo = new string(rawMobileNo
            .Where(char.IsDigit)
            .ToArray());
        if (mobileNo.Length < 7 || mobileNo.Length > 15)
            throw new ArgumentException("Mobile / WhatsApp number must contain 7 to 15 digits including the country code.");

        mobileNo = "+" + mobileNo;
        request.Customer.MobileNo = mobileNo;
        if (request.Event != null)
            request.Event.MobileNo = mobileNo;

        var isDelivery = request.Event?.DeliveryType == 3;
        var postalCode = (request.Event?.DeliveryPincode ?? request.Customer.Pincode)?.Trim() ?? string.Empty;
        if (isDelivery)
        {
            if (postalCode.Length != 6 || !postalCode.All(char.IsDigit))
                throw new ArgumentException("A valid 6-digit postal code is required for delivery.");

            request.Customer.Pincode = postalCode;
            if (request.Event != null)
                request.Event.DeliveryPincode = postalCode;
        }
        else
        {
            request.Customer.Pincode = null;
            if (request.Event != null)
                request.Event.DeliveryPincode = null;
        }

        var order = request.Order;
        if (!order.EventId.HasValue || !order.EventDate.HasValue)
            throw new ArgumentException("Event and event date are required.");

        var isQuotation = order.OrderStatus == 5;
        if (!isQuotation && !IsValidDigitalSignature(order.DigitalSignature))
            throw new ArgumentException("A valid digital signature is required before submitting the order.");

        var selectedEvent = _events.GetById(order.EventId.Value);
        if (selectedEvent == null || !selectedEvent.IsActive || selectedEvent.IsDeleted)
            throw new ArgumentException("The selected event is not available.");

        var minimumEventDate = DateTime.Today.AddDays(Math.Max(0, selectedEvent.AdvanceBookingDays));
        if (order.EventDate.Value.Date < minimumEventDate)
        {
            throw new ArgumentException(
                $"{selectedEvent.Name} must be booked at least {selectedEvent.AdvanceBookingDays} day(s) in advance. " +
                $"Please select {minimumEventDate:dd-MM-yyyy} or later.");
        }

        order.ServiceCharge = 0;
        order.SubTotal =
            (order.PackageBaseAmount ?? 0) +
            (order.AdditionalMenuAmount ?? 0) +
            (order.AddOnsAmount ?? 0) +
            (order.UtensilsAmount ?? 0);
        order.TaxAmount = order.SubTotal * ((order.TaxPercentage ?? 0) / 100m);
        var calculatedTotal = order.SubTotal - order.Discount + order.DeliveryFee + order.TaxAmount;
        order.TotalAmount = decimal.Round(calculatedTotal, 0, MidpointRounding.AwayFromZero);
        order.PaidAmount = Math.Min(Math.Max(order.PaidAmount, 0), order.TotalAmount);
        order.BalanceAmount = Math.Max(order.TotalAmount - order.PaidAmount, 0);
        order.PaymentStatus = order.PaidAmount <= 0 ? 0 : order.BalanceAmount > 0 ? 1 : 2;
    }

    private static bool IsValidDigitalSignature(string? signature)
    {
        const string pngDataUrlPrefix = "data:image/png;base64,";
        if (string.IsNullOrWhiteSpace(signature) ||
            !signature.StartsWith(pngDataUrlPrefix, StringComparison.OrdinalIgnoreCase) ||
            signature.Length > 1_500_000)
        {
            return false;
        }

        try
        {
            var base64 = signature[pngDataUrlPrefix.Length..];
            return Convert.FromBase64String(base64).Length > 100;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private List<OrderListItem> ListOrderItems(IDataReader reader)
    {
        var list = new List<OrderListItem>();
        try
        {
            var availableColumns = Enumerable.Range(0, reader.FieldCount)
                .Select(reader.GetName)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            while (reader.Read())
            {
                var item = new OrderListItem();

                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["OrderNumber"] != DBNull.Value)
                    item.OrderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty;
                if (reader["CustomerName"] != DBNull.Value)
                    item.CustomerName = Convert.ToString(reader["CustomerName"]) ?? string.Empty;
                if (reader["MobileNo"] != DBNull.Value)
                    item.MobileNo = Convert.ToString(reader["MobileNo"]) ?? string.Empty;
                if (reader["EmailId"] != DBNull.Value)
                    item.EmailId = Convert.ToString(reader["EmailId"]) ?? string.Empty;
                if (reader["PackageName"] != DBNull.Value)
                    item.PackageName = Convert.ToString(reader["PackageName"]) ?? string.Empty;
                if (reader["LocationName"] != DBNull.Value)
                    item.LocationName = Convert.ToString(reader["LocationName"]) ?? string.Empty;
                if (reader["EventDate"] != DBNull.Value)
                    item.EventDate = Convert.ToDateTime(reader["EventDate"]);
                if (reader["MealPeriodName"] != DBNull.Value)
                    item.MealPeriodName = Convert.ToString(reader["MealPeriodName"]) ?? string.Empty;
                if (reader["Pax"] != DBNull.Value)
                    item.Pax = Convert.ToInt32(reader["Pax"]);
                if (reader["OrderStatus"] != DBNull.Value)
                    item.OrderStatus = Convert.ToInt32(reader["OrderStatus"]);
                if (reader["OrderStatusName"] != DBNull.Value)
                    item.OrderStatusName = Convert.ToString(reader["OrderStatusName"]) ?? string.Empty;
                if (reader["TotalAmount"] != DBNull.Value)
                    item.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                if (reader["PaidAmount"] != DBNull.Value)
                    item.PaidAmount = Convert.ToDecimal(reader["PaidAmount"]);
                if (reader["PaymentStatus"] != DBNull.Value)
                    item.PaymentStatus = Convert.ToInt32(reader["PaymentStatus"]);
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["RefNo"] != DBNull.Value)
                    item.RefNo = Convert.ToString(reader["RefNo"]) ?? string.Empty;

                if (reader["HasDigitalSignature"] != DBNull.Value)
                    item.HasDigitalSignature = Convert.ToBoolean(reader["HasDigitalSignature"]);

                list.Add(item);
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception ex)
        {
            throw new Exception(ex.StackTrace);
        }

        return list;
    }

    private SqlCommand CreateTransactionCommand(string name, SqlConnection conn, SqlTransaction transaction)
    {
        return new SqlCommand(name, conn, transaction)
        {
            CommandType = CommandType.StoredProcedure
        };
    }

    private static byte[]? ConvertDigitalSignatureToBytes(string? signatureDataUrl)
    {
        if (string.IsNullOrWhiteSpace(signatureDataUrl))
            return null;

        const string prefix = "data:image/png;base64,";
        if (!signatureDataUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("The digital signature must be a PNG image.");

        try
        {
            return Convert.FromBase64String(signatureDataUrl[prefix.Length..]);
        }
        catch (FormatException ex)
        {
            throw new ArgumentException("The digital signature image is invalid.", ex);
        }
    }

    private void AddParameter(SqlCommand command, string name, object value)
    {
        command.Parameters.AddWithValue(name, value ?? DBNull.Value);
    }

    private static void AddVarBinaryParameter(SqlCommand command, string name, byte[]? value)
    {
        var parameter = command.Parameters.Add(name, SqlDbType.VarBinary, -1);
        parameter.Value = value is { Length: > 0 } ? value : DBNull.Value;
    }

    private int ExecuteId(SqlCommand command, string entity)
    {
        var result = command.ExecuteScalar();
        var id = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
        if (id <= 0)
            throw new InvalidOperationException("The " + entity + " was not created.");

        return id;
    }

    private void ExecuteRequired(SqlCommand command, string entity)
    {
        var result = command.ExecuteScalar();
        if (result != null && result != DBNull.Value && Convert.ToInt32(result) <= 0)
            throw new InvalidOperationException("The " + entity + " was not created.");
    }

    private void AddAudit(SqlCommand command, int? createdBy, DateTime createdDate)
    {
        AddParameter(command, "@IsActive", true);
        AddParameter(command, "@IsDeleted", false);
        AddParameter(command, "@CreatedDate", createdDate);
        AddParameter(command, "@CreatedBy", createdBy);
        AddParameter(command, "@UpdatedDate", null);
        AddParameter(command, "@UpdatedBy", null);
    }

    private static Orders MapOrder(IDataRecord reader)
    {
        return new Orders
        {
            Id = Convert.ToInt32(reader["Id"]),
            OrderNumber = reader["OrderNumber"] == DBNull.Value ? null : Convert.ToString(reader["OrderNumber"]),
            CustomerId = Convert.ToInt32(reader["CustomerId"]),
            PackageId = reader["PackageId"] == DBNull.Value ? null : Convert.ToInt32(reader["PackageId"]),
            MealPeriodId = reader["MealPeriodId"] == DBNull.Value ? null : Convert.ToInt32(reader["MealPeriodId"]),
            LocationId = reader["LocationId"] == DBNull.Value ? null : Convert.ToInt32(reader["LocationId"]),
            EventDate = reader["EventDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["EventDate"]),
            DeliveryAddress = reader["DeliveryAddress"] == DBNull.Value ? null : Convert.ToString(reader["DeliveryAddress"]),
            Notes = reader["Notes"] == DBNull.Value ? null : Convert.ToString(reader["Notes"]),
            Pax = Convert.ToInt32(reader["Pax"]),
            PackageBaseAmount = reader["PackageBaseAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["PackageBaseAmount"]),
            AdditionalMenuAmount = reader["AdditionalMenuAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["AdditionalMenuAmount"]),
            AddOnsAmount = reader["AddOnsAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["AddOnsAmount"]),
            UtensilsAmount = reader["UtensilsAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["UtensilsAmount"]),
            ServiceCharge = reader["ServiceCharge"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["ServiceCharge"]),
            SubTotal = Convert.ToDecimal(reader["SubTotal"]),
            Discount = Convert.ToDecimal(reader["Discount"]),
            DeliveryFee = Convert.ToDecimal(reader["DeliveryFee"]),
            TaxAmount = Convert.ToDecimal(reader["TaxAmount"]),
            TotalAmount = Convert.ToDecimal(reader["TotalAmount"]),
            TaxPercentage = reader["TaxPercentage"] == DBNull.Value ? null : Convert.ToDecimal(reader["TaxPercentage"]),
            PaidAmount = Convert.ToDecimal(reader["PaidAmount"]),
            OrderStatus = Convert.ToInt32(reader["OrderStatus"]),
            PaymentStatus = Convert.ToInt32(reader["PaymentStatus"]),
            CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
            CreatedBy = reader["CreatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["CreatedBy"]),
            UpdatedDate = reader["UpdatedDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["UpdatedDate"]),
            UpdatedBy = reader["UpdatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["UpdatedBy"])
        };
    }
    #endregion
}
