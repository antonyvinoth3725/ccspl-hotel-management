using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;
using System;
using System.Data;
using System.Linq;

namespace GayatriCateringPortal.Repositories;

public class DashboardRepository : IDashboardRepository
{
    public Dashboard GetDashboard(DateTime? fromDate, DateTime? toDate)
    {
        Dashboard dashboard = new Dashboard();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            DateTime effectiveFromDate = fromDate?.Date ?? DateTime.Today;
            DateTime effectiveToDate = toDate?.Date ?? DateTime.Today;

            dashboard.GeneratedAtUtc = DateTime.UtcNow;
            dashboard.SourceNote = "Source: Orders table filtered by CreatedDate range.";

            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                using (cmd = DataFactory.CreateCommand("GetDashboardDetails", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", effectiveFromDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", effectiveToDate));

                    reader = DataFactory.ExecuteReader(cmd);

                    if (reader.Read())
                    {
                        if (reader["TotalOrders"] != DBNull.Value) dashboard.Summary.TotalOrders = Convert.ToInt32(reader["TotalOrders"]);
                        if (reader["Deposit"] != DBNull.Value) dashboard.Summary.ActiveOrders = Convert.ToInt32(reader["Deposit"]);
                        if (reader["TotalSales"] != DBNull.Value) dashboard.Summary.TotalSales = Convert.ToDecimal(reader["TotalSales"]);
                        if (reader["Outstanding"] != DBNull.Value) dashboard.Summary.Outstanding = Convert.ToDecimal(reader["Outstanding"]);
                        if (reader["TotalWithoutGST"] != DBNull.Value) dashboard.Summary.TotalWOGST = Convert.ToDecimal(reader["TotalWithoutGST"]);
                        if (reader["UtensilsAmount"] != DBNull.Value) dashboard.Summary.UtensilsAmount = Convert.ToDecimal(reader["UtensilsAmount"]);
                        if (reader["NotDeliveredOrders"] != DBNull.Value) dashboard.Summary.NotDeliveredOrders = Convert.ToInt32(reader["NotDeliveredOrders"]);
                        if (reader["DeliveredOrders"] != DBNull.Value) dashboard.Summary.DeliveredOrders = Convert.ToInt32(reader["DeliveredOrders"]);
                    }

                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            DashboardDetails item = new DashboardDetails();
                            if (reader["Id"] != DBNull.Value) item.Id = Convert.ToInt32(reader["Id"]);
                            if (reader["OrderNumber"] != DBNull.Value) item.OrderNumber = Convert.ToString(reader["OrderNumber"]);
                            if (reader["CustomerName"] != DBNull.Value) item.CustomerName = Convert.ToString(reader["CustomerName"]);
                            if (reader["MobileNo"] != DBNull.Value) item.MobileNo = Convert.ToString(reader["MobileNo"]);
                            if (reader["EmailId"] != DBNull.Value) item.EmailId = Convert.ToString(reader["EmailId"]);
                            if (reader["PackageName"] != DBNull.Value) item.PackageName = Convert.ToString(reader["PackageName"]);
                            if (reader["LocationName"] != DBNull.Value) item.LocationName = Convert.ToString(reader["LocationName"]);
                            if (reader["EventDate"] != DBNull.Value) item.EventDate = Convert.ToDateTime(reader["EventDate"]);
                            if (reader["MealPeriodName"] != DBNull.Value) item.MealPeriodName = Convert.ToString(reader["MealPeriodName"]);
                            if (reader["Pax"] != DBNull.Value) item.Pax = Convert.ToInt32(reader["Pax"]);
                            if (reader["OrderStatus"] != DBNull.Value) item.OrderStatus = Convert.ToInt32(reader["OrderStatus"]);
                            if (reader["OrderStatusName"] != DBNull.Value) item.OrderStatusName = Convert.ToString(reader["OrderStatusName"]);
                            if (reader["TotalAmount"] != DBNull.Value) item.TotalAmount = Convert.ToDecimal(reader["TotalAmount"]);
                            if (reader["PaidAmount"] != DBNull.Value) item.PaidAmount = Convert.ToDecimal(reader["PaidAmount"]);
                            if (reader["PaymentStatus"] != DBNull.Value) item.PaymentStatus = Convert.ToInt32(reader["PaymentStatus"]);
                            if (reader["PaymentStatusName"] != DBNull.Value) item.PaymentStatusName = Convert.ToString(reader["PaymentStatusName"]);
                            if (reader["DeliveryAddress"] != DBNull.Value) item.DeliveryAddress = Convert.ToString(reader["DeliveryAddress"]);
                            if (reader["CreatedDate"] != DBNull.Value) item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);

                            dashboard.RecentOrders.Add(item);
                        }

                        dashboard.RecentOrders = dashboard.RecentOrders
                            .OrderByDescending(x => x.CreatedDate)
                            .ThenByDescending(x => x.Id)
                            .Take(5)
                            .ToList();
                    }

                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            string monthName = reader["MonthName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["MonthName"]);
                            decimal orderValue = reader["OrderValue"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["OrderValue"]);
                            decimal deposit = reader["Deposit"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["Deposit"]);
                            decimal fullPayment = reader["FullPayment"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["FullPayment"]);
                            decimal outstanding = 0m;

                            try
                            {
                                outstanding = reader["Outstanding"] == DBNull.Value
                                    ? Math.Max(0m, orderValue - deposit)
                                    : Convert.ToDecimal(reader["Outstanding"]);
                            }
                            catch
                            {
                                outstanding = Math.Max(0m, orderValue - deposit);
                            }

                            dashboard.Chart.Labels.Add(monthName);
                            dashboard.Chart.OrderValue.Add(orderValue);
                            dashboard.Chart.Deposit.Add(deposit);
                            dashboard.Chart.FullPayment.Add(fullPayment);
                            dashboard.Chart.Outstanding.Add(outstanding);
                        }
                    }

                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            if (reader["Year"] != DBNull.Value)
                                dashboard.Years.Add(Convert.ToInt32(reader["Year"]));
                        }
                    }
                }

                using (cmd = DataFactory.CreateCommand("GetDashboardPreviousChart", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", effectiveFromDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", effectiveToDate));

                    reader = DataFactory.ExecuteReader(cmd);
                    while (reader.Read())
                    {
                        string monthName = reader["MonthName"] == DBNull.Value ? string.Empty : Convert.ToString(reader["MonthName"]);
                        decimal orderValue = reader["OrderValue"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["OrderValue"]);
                        decimal deposit = reader["Deposit"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["Deposit"]);
                        decimal fullPayment = reader["FullPayment"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["FullPayment"]);
                        decimal outstanding = reader["Outstanding"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["Outstanding"]);

                        dashboard.PreviousChart.Labels.Add(monthName);
                        dashboard.PreviousChart.OrderValue.Add(orderValue);
                        dashboard.PreviousChart.Deposit.Add(deposit);
                        dashboard.PreviousChart.FullPayment.Add(fullPayment);
                        dashboard.PreviousChart.Outstanding.Add(outstanding);
                    }
                }

                using (cmd = DataFactory.CreateCommand("GetDashboardAlerts", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@FromDate", effectiveFromDate));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@ToDate", effectiveToDate));

                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read())
                    {
                        if (reader["OverdueOutstandingCount"] != DBNull.Value)
                            dashboard.Alerts.OverdueOutstandingCount = Convert.ToInt32(reader["OverdueOutstandingCount"]);
                        if (reader["UpcomingPendingPaymentCount"] != DBNull.Value)
                            dashboard.Alerts.UpcomingPendingPaymentCount = Convert.ToInt32(reader["UpcomingPendingPaymentCount"]);
                        if (reader["StuckOrdersCount"] != DBNull.Value)
                            dashboard.Alerts.StuckOrdersCount = Convert.ToInt32(reader["StuckOrdersCount"]);
                    }
                }
            }

            return dashboard;
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
}
