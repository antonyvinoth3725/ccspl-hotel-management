using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class InvoicesRepository : IInvoicesRepository
{
    public List<Orders> GetAll()
    {
        List<Orders> list = new List<Orders>();
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
                using (conn = DataFactory.CreateConnection())
                {
                    conn.Open();
                    using (cmd = DataFactory.CreateCommand("SELECT * FROM Orders WHERE IsDeleted = 0", conn))
                    {
                        using IDataReader reader = DataFactory.ExecuteReader(cmd);
                        list = new List<Orders>();
                        while (reader.Read()) list.Add(new Orders());
                    }
                }
                return list ?? new List<Orders>();
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

    public Orders? GetById(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                using (cmd = DataFactory.CreateCommand("SELECT * FROM Orders WHERE Id = @Id", conn))
                {
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    if (conn.State == ConnectionState.Closed) conn.Open();
                    reader = DataFactory.ExecuteReader(cmd);
                    if (reader.Read()) return new Orders();
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

    public int Create(Orders item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            conn = DataFactory.CreateConnection();
            cmd = DataFactory.CreateCommand("SP_CreateInvoice", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
            conn.Open();
            var rows = DataFactory.ExecuteNonQuery(cmd);
            return rows > 0 ? 1 : 0;
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

    public bool Update(Orders item)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            conn = DataFactory.CreateConnection();
            cmd = DataFactory.CreateCommand("SP_CreateInvoice", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
            conn.Open();
            return DataFactory.ExecuteNonQuery(cmd) > 0;
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

    public bool Delete(int id)
    {
        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        try
        {
            conn = DataFactory.CreateConnection();
            cmd = DataFactory.CreateCommand("UPDATE Orders SET IsDeleted = 1 WHERE Id = @Id", conn);
            cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
            conn.Open();
            return cmd.ExecuteNonQuery() > 0;
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
                using (cmd = DataFactory.CreateCommand("UPDATE Orders SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id", conn))
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
}

