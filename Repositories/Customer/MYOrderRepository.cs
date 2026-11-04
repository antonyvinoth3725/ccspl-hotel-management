using System.Data;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces.Customer;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories.Customer;

public class MYOrderRepository : IMYOrderRepository
{

    public List<OrderListItem> GetMyOrders(string phoneNo)
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

                using (cmd = DataFactory.CreateCommand("[dbo].[GetMYOrders]", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(DataFactory.CreateParameter("@MobileorOrderNo", phoneNo));

                    reader = DataFactory.ExecuteReader(cmd);

                    list = this.List(reader);
                    reader.Close();
                    reader = null;

                    BindEventIds(conn, list);
                }
            }

            return list ?? new List<OrderListItem>();
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        catch (Exception)
        {
            throw;
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed)
                conn.Close();
        }
    }

    public int ConvertQuotationToOrder(int quotationId)
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
                    cmd.Parameters.Add(DataFactory.CreateParameter("@QuotationId", quotationId));

                    var result = DataFactory.ExecuteScalar(cmd);
                    return result == null || result == DBNull.Value
                        ? 0
                        : Convert.ToInt32(result);
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed)
                conn.Close();
        }
    }

    private List<OrderListItem> List(IDataReader reader)
    {
        List<OrderListItem> list = new List<OrderListItem>();

        while (reader.Read())
        {
            var orderStatus = reader["OrderStatus"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OrderStatus"]);
            var orderStatusName = reader["OrderStatusName"]?.ToString() ?? string.Empty;

            OrderListItem item = new OrderListItem
            {
                Id = reader["Id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Id"]),
                OrderNumber = reader["OrderNumber"]?.ToString() ?? string.Empty,
                CustomerName = reader["CustomerName"]?.ToString() ?? string.Empty,
                MobileNo = reader["MobileNo"]?.ToString() ?? string.Empty,
                EmailId = reader["EmailId"]?.ToString() ?? string.Empty,
                EventId = GetOptionalInt32(reader, "EventId"),
                PackageName = reader["PackageName"]?.ToString() ?? string.Empty,
                // Older versions of GetMYOrders did not return EventName.
                EventName = GetOptionalString(reader, "EventName"),
                LocationName = reader["LocationName"]?.ToString() ?? string.Empty,
                EventDate = reader["EventDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["EventDate"]),
                MealPeriodName = reader["MealPeriodName"]?.ToString() ?? string.Empty,
                Pax = reader["Pax"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Pax"]),
                OrderStatus = orderStatus,
                OrderStatusName = orderStatus == 5 ? "Quotation" : orderStatusName,
                TotalAmount = reader["TotalAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["TotalAmount"]),
                PaidAmount = reader["PaidAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["PaidAmount"]),
                PaymentStatus = reader["PaymentStatus"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PaymentStatus"]),

            };

            list.Add(item);
        }

        return list;
    }

    private static string GetOptionalString(IDataRecord record, string columnName)
    {
        try
        {
            var ordinal = record.GetOrdinal(columnName);
            return record.IsDBNull(ordinal) ? string.Empty : record.GetString(ordinal);
        }
        catch (IndexOutOfRangeException)
        {
            return string.Empty;
        }
    }

    private static int? GetOptionalInt32(IDataRecord record, string columnName)
    {
        try
        {
            var ordinal = record.GetOrdinal(columnName);
            return record.IsDBNull(ordinal) ? null : Convert.ToInt32(record.GetValue(ordinal));
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static void BindEventIds(IDbConnection connection, List<OrderListItem> orders)
    {
        if (orders.Count == 0) return;

        var parameterNames = orders
            .Select((_, index) => "@OrderId" + index)
            .ToArray();

        using var command = DataFactory.CreateCommand(
            "SELECT o.Id, o.EventId, e.Name AS EventName " +
            "FROM dbo.Orders o " +
            "LEFT JOIN dbo.EventMaster e ON e.Id = o.EventId " +
            "WHERE o.Id IN (" + string.Join(",", parameterNames) + ")",
            connection);

        for (var index = 0; index < orders.Count; index++)
            command.Parameters.Add(DataFactory.CreateParameter(parameterNames[index], orders[index].Id));

        using var eventReader = DataFactory.ExecuteReader(command);
        var ordersById = orders.ToDictionary(item => item.Id);

        while (eventReader.Read())
        {
            var orderId = eventReader["Id"] == DBNull.Value ? 0 : Convert.ToInt32(eventReader["Id"]);
            if (ordersById.TryGetValue(orderId, out var order))
            {
                order.EventId = eventReader["EventId"] == DBNull.Value ? null : Convert.ToInt32(eventReader["EventId"]);
                order.EventName = eventReader["EventName"] == DBNull.Value
                    ? string.Empty
                    : Convert.ToString(eventReader["EventName"]) ?? string.Empty;
            }
        }
    }
}
