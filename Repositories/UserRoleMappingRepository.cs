using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class UserRoleMappingRepository : IUserRoleMappingRepository
{
    public List<UserRoleMapping> GetByUserId(int userId)
    {
        List<UserRoleMapping> list = new List<UserRoleMapping>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetUserRoleMappingByUserId", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UserId", userId));
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<UserRoleMapping>();
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

    public bool CreateUserRoleMappings(List<UserRoleMapping> items)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDbTransaction transaction = null;

        try
        {
            if (items == null || items.Count == 0)
                return false;

            int userId = items[0].UserId;
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();

                transaction = conn.BeginTransaction();
                try
                {
                    using (cmd = DataFactory.CreateCommand("DeleteUserRoleMappingByUserId", conn))
                    {
                        var sqlDeleteCmd = (SqlCommand)cmd;
                        sqlDeleteCmd.CommandType = CommandType.StoredProcedure;
                        sqlDeleteCmd.Transaction = (SqlTransaction)transaction;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@UserId", userId));
                        DataFactory.ExecuteNonQuery(cmd);
                    }

                    for (int i = 0; i < items.Count; i++)
                    {
                        var item = items[i];
                        using (cmd = DataFactory.CreateCommand("SP_CreateUserRoleMapping", conn))
                        {
                            var sqlInsertCmd = (SqlCommand)cmd;
                            sqlInsertCmd.CommandType = CommandType.StoredProcedure;
                            sqlInsertCmd.Transaction = (SqlTransaction)transaction;

                            cmd.Parameters.Add(DataFactory.CreateParameter("@UserId", item.UserId));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", item.RoleId));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                            cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));

                            DataFactory.ExecuteNonQuery(cmd);
                        }
                    }

                    transaction.Commit();
                    return true;
                }
                catch
                {
                    try
                    {
                        transaction.Rollback();
                    }
                    catch
                    {
                    }

                    return false;
                }
            }
        }
        catch (SqlException)
        {
            return false;
        }
        catch (Exception ex)
        {
            return false;
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public bool DeleteUserRoleMappingByUserId(int userId)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("DeleteUserRoleMappingByUserId", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UserId", userId));
                    DataFactory.ExecuteNonQuery(cmd);
                    return true;
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

    public bool DeleteUserRoleMappingById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("DeleteUserRoleMappingById", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    var r = DataFactory.ExecuteScalar(cmd);
                    return r != null && Convert.ToInt32(r) > 0;
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
    private List<UserRoleMapping> List(IDataReader reader)
    {
        var list = new List<UserRoleMapping>();
        try
        {
            while (reader.Read())
            {
                var item = new UserRoleMapping();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"]);
                if (reader["UserId"] != DBNull.Value)
                    item.UserId = Convert.ToInt32(reader["UserId"]);
                if (reader["RoleId"] != DBNull.Value)
                    item.RoleId = Convert.ToInt32(reader["RoleId"]);
                if (reader["IsActive"] != DBNull.Value)
                    item.IsActive = Convert.ToBoolean(reader["IsActive"]);
                if (reader["IsDeleted"] != DBNull.Value)
                    item.IsDeleted = Convert.ToBoolean(reader["IsDeleted"]);
                if (reader["CreatedBy"] != DBNull.Value)
                    item.CreatedBy = Convert.ToInt32(reader["CreatedBy"]);
                if (reader["CreatedDate"] != DBNull.Value)
                    item.CreatedDate = Convert.ToDateTime(reader["CreatedDate"]);
                if (reader["UpdatedBy"] != DBNull.Value)
                    item.UpdatedBy = Convert.ToInt32(reader["UpdatedBy"]);
                if (reader["UpdatedDate"] != DBNull.Value)
                    item.UpdatedDate = Convert.ToDateTime(reader["UpdatedDate"]);

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
