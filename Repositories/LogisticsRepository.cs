using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Reflection;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace GayatriCateringPortal.Repositories;

public class LogisticsRepository : ILogisticsRepository
{
    public List<OrderListItem> GetAll(DateTime? fromDate = null, DateTime? toDate = null, string Indicator = "")
    {
        List<OrderListItem> list = new List<OrderListItem>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetOrders", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", fromDate.HasValue ? (object)fromDate.Value.Date : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", toDate.HasValue ? (object)toDate.Value.Date : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Indicator", Indicator));

                    reader = DataFactory.ExecuteReader(cmd);
                    list = ListOrderItems(reader);
                }
            }

            return list ?? new List<OrderListItem>();
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

    public List<LogisticsDetails> GetDelivered()
    {
        List<LogisticsDetails> list = new List<LogisticsDetails>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetLogisticsDetails", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.ListDelivered(reader);
                }
            }
            return list ?? new List<LogisticsDetails>();
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

    public LogisticsDetails? GetById(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                using (cmd = DataFactory.CreateCommand("SELECT * FROM LogisticsDetails WHERE Id = @Id", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read()) return new LogisticsDetails();
                }
            }
            return null;
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

    public LogisticsDetails? GetByOrderNumber(string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(orderNumber)) return null;

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                using (cmd = DataFactory.CreateCommand("SELECT * FROM LogisticsDetails WHERE OrderNumber = @OrderNumber AND IsDeleted = 0", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderNumber", orderNumber));
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read()) return new LogisticsDetails();
                }
            }
            return null;
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

    public LogisticsCreateResult Create(LogisticsDetails item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            LogisticsCreateResult result = new LogisticsCreateResult();

            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateLogisticsDetails", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderDate", item.OrderDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderNumber", (object?)item.OrderNumber ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Location", (object?)item.Location ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DriverId", (object?)item.DriverId ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Status", item.Status));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));

                    using IDataReader dr = cmd.ExecuteReader();

                    if (dr.Read())
                    {
                        result.LogisticsId = Convert.ToInt32(dr["LogisticsId"]);
                        result.Mobile = dr["Mobile"].ToString();
                        result.Token = dr["Token"].ToString();
                        result.OTP = dr["OTP"].ToString();
                        result.DriverName = dr["DriverName"].ToString();
                        result.IsNewDriverSession = dr["IsNewDriverSession"] != DBNull.Value && Convert.ToBoolean(dr["IsNewDriverSession"]);
                    }

                    return result;
                }
            }

            

            //using SqlConnection con = new SqlConnection(_connectionString);

            //using SqlCommand cmd = new SqlCommand("SP_CreateLogisticsDetails", con);

            //cmd.CommandType = CommandType.StoredProcedure;

            //cmd.Parameters.AddWithValue("@OrderDate", model.OrderDate);
            //cmd.Parameters.AddWithValue("@OrderNumber", model.OrderNumber);
            //cmd.Parameters.AddWithValue("@Location", model.Location);
            //cmd.Parameters.AddWithValue("@DriverId", model.DriverId);
            //cmd.Parameters.AddWithValue("@Status", model.Status);
            //cmd.Parameters.AddWithValue("@IsActive", model.IsActive);
            //cmd.Parameters.AddWithValue("@IsDeleted", model.IsDeleted);
            //cmd.Parameters.AddWithValue("@CreatedBy", model.CreatedBy);

            //con.Open();

            
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
        //return 0;
    }

    public int Update(LogisticsDetails item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateLogisticsDetails", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@DriverId", (object?)item.DriverId ?? DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int status = Convert.ToInt32(result);
                        return status;
                    }
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
        return 0;
    }

    public bool Delete(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                using (cmd = DataFactory.CreateCommand("UPDATE LogisticsDetails SET IsDeleted = 1 WHERE Id = @Id", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    conn.Open();
                    return cmd.ExecuteNonQuery() > 0;
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

    public bool ActiveInActive(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                using (cmd = DataFactory.CreateCommand("UPDATE LogisticsDetails SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    conn.Open();
                    return cmd.ExecuteNonQuery() > 0;
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

    #region Private Methods
    private List<OrderListItem> ListOrderItems(IDataReader reader)
    {
        var list = new List<OrderListItem>();
        try
        {
            while (reader.Read())
            {
                var item = new OrderListItem();

                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["OrderNumber"] != DBNull.Value)
                    item.OrderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty;
                if (reader["CustomerName"] != DBNull.Value)
                    item.CustomerName = Convert.ToString(reader["CustomerName"]) ?? string.Empty;
                if (reader["DeliveryAddress"] != DBNull.Value)
                    item.DeliveryAddress = Convert.ToString(reader["DeliveryAddress"]) ?? string.Empty;
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
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
    #endregion

    #region Private Methods
    private List<LogisticsDetails> ListDelivered(IDataReader reader)
    {
        var listDeli = new List<LogisticsDetails>();
        try
        {
            while (reader.Read())
            {
                var item = new LogisticsDetails();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"])!;
                if (reader["OrderDate"] != DBNull.Value)
                    item.OrderDate = Convert.ToDateTime(reader["OrderDate"]);
                if (reader["OrderNumber"] != DBNull.Value)
                    item.OrderNumber = Convert.ToString(reader["OrderNumber"])!;
                if (reader["Location"] != DBNull.Value)
                    item.Location = Convert.ToString(reader["Location"])!;
                if (reader["DriverName"] != DBNull.Value)
                    item.DriverName = Convert.ToString(reader["DriverName"])!;
                if (reader["CustomerName"] != DBNull.Value)
                    item.CustomerName = Convert.ToString(reader["CustomerName"]);
                if (reader["DeliveredDate"] != DBNull.Value)
                    item.DeliveredDate = Convert.ToDateTime(reader["DeliveredDate"]);
                if (reader["ParcelPhoto"] != DBNull.Value)
                {
                    item.ParcelPhoto = GetImageDataUrl(reader["ParcelPhoto"]);
                }

                if (reader["CustomerSignature"] != DBNull.Value)
                {
                    item.CustomerSignature = GetImageDataUrl(reader["CustomerSignature"]);
                }

                listDeli.Add(item);
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

        return listDeli;
    }
    #endregion

    private string GetImageDataUrl(object value)
    {
        if (value == null || value == DBNull.Value)
            return string.Empty;

        byte[] bytes = (byte[])value;

        if (bytes.Length == 0)
            return string.Empty;

        string mimeType = "image/jpeg";

        // PNG
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 &&
            bytes[1] == 0x50 &&
            bytes[2] == 0x4E &&
            bytes[3] == 0x47)
        {
            mimeType = "image/png";
        }
        // JPEG
        else if (bytes.Length >= 3 &&
                 bytes[0] == 0xFF &&
                 bytes[1] == 0xD8 &&
                 bytes[2] == 0xFF)
        {
            mimeType = "image/jpeg";
        }
        // GIF
        else if (bytes.Length >= 6 &&
                 bytes[0] == 0x47 &&
                 bytes[1] == 0x49 &&
                 bytes[2] == 0x46)
        {
            mimeType = "image/gif";
        }

        return $"data:{mimeType};base64,{Convert.ToBase64String(bytes)}";
    }
}

