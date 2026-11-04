using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class KitchenRepository : IKitchenRepository
{
    public List<KitchenQueueOrder> GetKitchenQueueOrders(int Status, string Fromdate, string ToDate)
    {
        List<KitchenQueueOrder> list = new List<KitchenQueueOrder>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetKitchenQueueOrders", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Status", Status));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", string.IsNullOrWhiteSpace(Fromdate) ? (object)DBNull.Value : Fromdate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", string.IsNullOrWhiteSpace(ToDate) ? (object)DBNull.Value : ToDate));

                    reader = DataFactory.ExecuteReader(cmd);
                    list = List(reader);
                }
            }

            return list ?? new List<KitchenQueueOrder>();
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

    private List<KitchenQueueOrder> List(IDataReader reader)
    {
        var list = new List<KitchenQueueOrder>();
        while (reader.Read())
        {
            var item = new KitchenQueueOrder
            {
                Id = reader["OrderId"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OrderId"]),
                OrderNumber = reader["OrderNumber"] == DBNull.Value ? string.Empty : Convert.ToString(reader["OrderNumber"]) ?? string.Empty,
                CustomerName = reader["CustomerName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["CustomerName"]) ?? string.Empty,
                PackageName = reader["PackageName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["PackageName"]) ?? string.Empty,
                OrderDate = reader["OrderDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["OrderDate"]),
                EventDate = reader["EventDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["EventDate"]),
                MealPeriod = reader["MealPeriodName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["MealPeriodName"]) ?? string.Empty,
                Pax = reader["Pax"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Pax"]),
                OrderStatus = reader["OrderStatus"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OrderStatus"])
            };

            list.Add(item);
        }

        return list;
    }
}

