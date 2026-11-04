using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;

namespace GayatriCateringPortal.Repositories;

public class RolesRepository : IRolesRepository
{
    public List<RoleMaster> GetAll()
    {
        List<RoleMaster> list = new List<RoleMaster>();
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("GetRoleMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    reader = DataFactory.ExecuteReader(cmd);
                    list = this.List(reader);
                }
            }

            return list ?? new List<RoleMaster>();
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

    public RoleMaster? GetById(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;
        RoleMaster? item = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_GetRoleMasterByID", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    reader = DataFactory.ExecuteReader(cmd);
                    var list = this.List(reader);
                    if (list != null && list.Count > 0) item = list[0];
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

        return item;
    }

    public int Create(RoleMaster item)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_CreateRoleMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name",item.Name ));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", item.Remarks ));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", item.CreatedBy));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@EntityNo", item.EntityNo));


                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        return Convert.ToInt32(result);  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (SqlException)
        {
            return 0;  // Return 0 on database error
        }
        catch (Exception ex)
        {
            return 0;  // Return 0 on any other error
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }

        return 0;
    }

    public int Update(RoleMaster item)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_UpdateRoleMaster", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", item.Id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Code", item.Code));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Name", item.Name));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Remarks", item.Remarks));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", item.IsActive));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsDeleted", item.IsDeleted));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", item.UpdatedBy));

                    var result = DataFactory.ExecuteScalar(cmd);
                    if (result != null)
                    {
                        int status = Convert.ToInt32(result);
                        return status;  // Returns -1 if duplicate, > 0 if success, 0 if error
                    }
                }
            }
        }
        catch (SqlException)
        {
            return 0;  // Return 0 on database error
        }
        catch (Exception ex)
        {
            return 0;  // Return 0 on any other error
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
        return 0;
    }

    public bool Delete(int id)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        bool taskStatus = false;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("DeleteRoleMasterById", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    var r = DataFactory.ExecuteScalar(cmd);
                    if (r != null && Convert.ToInt32(r) > 0)
                        taskStatus = true;
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

        return taskStatus;
    }

    public bool ActiveInActive(int id, bool status)
    {

        IDbConnection conn = null;
        IDbCommand cmd = null;
        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                if (conn.State == ConnectionState.Closed) conn.Open();
                using (cmd = DataFactory.CreateCommand("ActiveInActiveRoleMasterById", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
                    cmd.Parameters.Add(DataFactory.CreateParameter("@IsActive", status));
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
    private List<RoleMaster> List(IDataReader reader)
    {
        var list = new List<RoleMaster>();
        try
        {
            while (reader.Read())
            {
                var item = new RoleMaster();
                if (reader["Id"] != DBNull.Value)
                    item.Id = Convert.ToInt32(reader["Id"])!;
                if (reader["Code"] != DBNull.Value)
                    item.Code = Convert.ToString(reader["Code"])!;
                if (reader["Name"] != DBNull.Value)
                    item.Name = Convert.ToString(reader["Name"])!;
                if (reader["Remarks"] != DBNull.Value)
                    item.Remarks = Convert.ToString(reader["Remarks"]);
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
