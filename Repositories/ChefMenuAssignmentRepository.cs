using System.Data;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class ChefMenuAssignmentRepository : IChefMenuAssignmentRepository
{
    public List<ChefMenuOrderOption> GetOrdersForSelection(DateTime eventDate, int? assignmentHeaderId = null)
    {
        IDbConnection connection = null;
        IDbCommand command = null;
        IDataReader reader = null;
        var orders = new List<ChefMenuOrderOption>();

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_GetOrdersForSelection", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@EventDate", eventDate.Date));
                    command.Parameters.Add(DataFactory.CreateParameter("@AssignmentHeaderId", assignmentHeaderId));
                    reader = DataFactory.ExecuteReader(command);

                    while (reader.Read())
                    {
                        orders.Add(new ChefMenuOrderOption
                        {
                            OrderId = Convert.ToInt32(reader["OrderId"]),
                            OrderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty,
                            EventDate = Convert.ToDateTime(reader["EventDate"]),
                            Pax = reader["Pax"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Pax"]),
                            OrderStatus = reader["OrderStatus"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OrderStatus"])
                        });
                    }
                }
            }

            return orders;
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public List<ChefMenuAssignmentListItem> GetByChef(int chefId)
    {
        IDbConnection connection = null;
        IDbCommand command = null;
        IDataReader reader = null;
        var assignments = new List<ChefMenuAssignmentListItem>();

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_GetByChef", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@ChefId", chefId));
                    reader = DataFactory.ExecuteReader(command);
                    while (reader.Read())
                    {
                        assignments.Add(new ChefMenuAssignmentListItem
                        {
                            HeaderId = Convert.ToInt32(reader["HeaderId"]),
                            ChefId = Convert.ToInt32(reader["ChefId"]),
                            EventDate = Convert.ToDateTime(reader["EventDate"]),
                            CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                            IsActive = Convert.ToBoolean(reader["IsActive"]),
                            OrderNumbers = Convert.ToString(reader["OrderNumbers"]) ?? string.Empty,
                            MenuNames = Convert.ToString(reader["MenuNames"]) ?? string.Empty,
                            MenuCount = Convert.ToInt32(reader["MenuCount"]),
                            TotalQty = Convert.ToInt32(reader["TotalQty"])
                        });
                    }
                }
            }
            return assignments;
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public List<ChefMenuSummary> GetMenuSummaryByOrders(string orderIds, int? assignmentHeaderId = null)
    {
        IDbConnection connection = null;
        IDbCommand command = null;
        IDataReader reader = null;
        var summaries = new List<ChefMenuSummary>();

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_GetMenuSummaryByOrders", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@OrderIds", orderIds));
                    command.Parameters.Add(DataFactory.CreateParameter("@AssignmentHeaderId", assignmentHeaderId));
                    reader = DataFactory.ExecuteReader(command);

                    while (reader.Read())
                    {
                        summaries.Add(new ChefMenuSummary
                        {
                            MenuId = Convert.ToInt32(reader["MenuId"]),
                            MenuName = Convert.ToString(reader["MenuName"]) ?? string.Empty,
                            OrderedQty = Convert.ToInt32(reader["OrderedQty"]),
                            AlreadyAssignedQty = Convert.ToInt32(reader["AlreadyAssignedQty"]),
                            RemainingQty = Convert.ToInt32(reader["RemainingQty"])
                        });
                    }
                }
            }

            return summaries;
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public ChefMenuAssignmentEdit? GetById(int headerId)
    {
        IDbConnection connection = null;
        IDbCommand command = null;
        IDataReader reader = null;
        ChefMenuAssignmentEdit? assignment = null;

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_GetById", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@HeaderId", headerId));
                    reader = DataFactory.ExecuteReader(command);

                    if (reader.Read())
                    {
                        assignment = new ChefMenuAssignmentEdit
                        {
                            HeaderId = Convert.ToInt32(reader["HeaderId"]),
                            ChefId = Convert.ToInt32(reader["ChefId"]),
                            EventDate = Convert.ToDateTime(reader["EventDate"]),
                            CreatedDate = Convert.ToDateTime(reader["CreatedDate"])
                        };
                    }

                    if (assignment != null && reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            var orderId = Convert.ToInt32(reader["OrderId"]);
                            if (!assignment.OrderIds.Contains(orderId)) assignment.OrderIds.Add(orderId);
                            var orderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty;
                            if (!string.IsNullOrWhiteSpace(orderNumber) && !assignment.OrderNumbers.Contains(orderNumber)) assignment.OrderNumbers.Add(orderNumber);

                            var menuId = Convert.ToInt32(reader["MenuId"]);
                            var quantity = Convert.ToInt32(reader["AssignedQty"]);
                            if (!assignment.MenuIds.Contains(menuId)) assignment.MenuIds.Add(menuId);
                            var existingMenu = assignment.Menus.FirstOrDefault(x => x.MenuId == menuId);
                            if (existingMenu == null)
                            {
                                assignment.Menus.Add(new ChefMenuAssignmentDetailItem
                                {
                                    MenuId = menuId,
                                    MenuName = Convert.ToString(reader["MenuName"]) ?? string.Empty,
                                    AssignedQty = quantity
                                });
                            }
                            else
                            {
                                existingMenu.AssignedQty += quantity;
                            }
                        }
                    }
                }
            }

            return assignment;
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public int Save(ChefMenuAssignmentSaveRequest request, int? updatedBy)
    {
        IDbConnection connection = null;
        IDbCommand command = null;

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_Save", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@HeaderId", request.HeaderId));
                    command.Parameters.Add(DataFactory.CreateParameter("@ChefId", request.ChefId));
                    command.Parameters.Add(DataFactory.CreateParameter("@EventDate", request.EventDate.Date));
                    command.Parameters.Add(DataFactory.CreateParameter("@OrderIds", request.OrderIds));
                    command.Parameters.Add(DataFactory.CreateParameter("@MenuIds", request.MenuIds));
                    command.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", updatedBy));

                    return Convert.ToInt32(DataFactory.ExecuteScalar(command) ?? 0);
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public bool Delete(int headerId, int? updatedBy)
    {
        IDbConnection connection = null;
        IDbCommand command = null;

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_Delete", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@HeaderId", headerId));
                    command.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", updatedBy));
                    return Convert.ToBoolean(DataFactory.ExecuteScalar(command) ?? false);
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }

    public bool DeleteMenu(int headerId, int menuId, int? updatedBy)
    {
        IDbConnection connection = null;
        IDbCommand command = null;

        try
        {
            using (connection = DataFactory.CreateConnection())
            {
                connection.Open();
                using (command = DataFactory.CreateCommand("SP_ChefMenuAssignment_DeleteMenu", connection))
                {
                    ((SqlCommand)command).CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(DataFactory.CreateParameter("@HeaderId", headerId));
                    command.Parameters.Add(DataFactory.CreateParameter("@MenuId", menuId));
                    command.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", updatedBy));
                    return Convert.ToBoolean(DataFactory.ExecuteScalar(command) ?? false);
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
            if (connection != null && connection.State != ConnectionState.Closed) connection.Close();
        }
    }
}
