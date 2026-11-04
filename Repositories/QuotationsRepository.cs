using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;

namespace GayatriCateringPortal.Repositories;

public class QuotationsRepository : IQuotationsRepository
{
    public List<OrderListItem> GetAll(DateTime? fromDate = null, DateTime? toDate = null)
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
                using (cmd = DataFactory.CreateCommand("GetQuotationOrder", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", fromDate.HasValue ? (object)fromDate.Value.Date : DBNull.Value));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", toDate.HasValue ? (object)toDate.Value.Date : DBNull.Value));

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

    public object? GetById(int id)
    {
        return null;
    }

    public int ConvertToOrder(int QuotationId)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_ConvertQuotationToOrder", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@QuotationId", QuotationId));


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

    public bool Update(object item)
    {
        throw new NotImplementedException();
    }

    public bool Delete(int id)
    {
        throw new NotImplementedException();
    }

    public bool ActiveInActive(int id)
    {
        throw new NotImplementedException();
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
                if (reader["PackageName"] != DBNull.Value)
                    item.PackageName = Convert.ToString(reader["PackageName"]) ?? string.Empty;
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["EventDate"] != DBNull.Value)
                    item.EventDate = Convert.ToDateTime(reader["EventDate"]);
                if (reader["Pax"] != DBNull.Value)
                    item.Pax = Convert.ToInt32(reader["Pax"]);
                if (reader["OrderStatus"] != DBNull.Value)
                    item.OrderStatus = Convert.ToInt32(reader["OrderStatus"]);

                if (reader["TotalAmount"] != DBNull.Value)
                    item.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);                       


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
}

